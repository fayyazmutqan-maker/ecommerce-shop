/**
 * Invoice Generation Monitor
 *
 * Tracks invoice/refund creation patterns and detects anomalies:
 * - Unusual volume spikes per IP or globally
 * - Unexpected IP addresses generating invoices
 * - Rapid sequential generation (potential bot/DDoS)
 *
 * Sends admin notifications + email alerts when thresholds are breached.
 * Uses in-memory sliding windows — works in both serverless and persistent envs.
 */

import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { audit } from "@/lib/audit";
import { sendSecurityAlert } from "@/lib/email";

// ── Configuration (env-overridable) ────────────────────────────────

/** Orders per IP in 5 min before alert */
const SPIKE_THRESHOLD_IP = parseInt(process.env.MONITOR_SPIKE_THRESHOLD_IP || "8", 10);
/** Orders globally in 5 min before alert */
const SPIKE_THRESHOLD_GLOBAL = parseInt(process.env.MONITOR_SPIKE_THRESHOLD_GLOBAL || "30", 10);
/** Min interval (ms) between orders from same IP to flag as bot-like */
const RAPID_FIRE_MS = parseInt(process.env.MONITOR_RAPID_FIRE_MS || "2000", 10);
/** Consecutive rapid-fire hits before alert */
const RAPID_FIRE_COUNT = parseInt(process.env.MONITOR_RAPID_FIRE_COUNT || "3", 10);
/** Cooldown (ms) between alerts of the same type to prevent alert flooding */
const ALERT_COOLDOWN_MS = parseInt(process.env.MONITOR_ALERT_COOLDOWN_MS || "300000", 10); // 5 min
/** Admin email for security alerts (falls back to empty = no email) */
const ADMIN_ALERT_EMAIL = process.env.MONITOR_ADMIN_EMAIL || "";

// ── Sliding window stores ──────────────────────────────────────────

interface EventEntry {
  timestamp: number;
  ip: string;
  type: "order" | "refund";
}

const events: EventEntry[] = [];
const rapidFireTracker = new Map<string, { lastTimestamp: number; consecutiveCount: number }>();
const alertCooldowns = new Map<string, number>();

const WINDOW_MS = 5 * 60 * 1000; // 5-minute window

// Cleanup old events periodically (every 60s)
if (typeof globalThis !== "undefined") {
  const key = "__invoice_monitor_cleanup";
  const g = globalThis as Record<string, unknown>;
  if (!g[key]) {
    g[key] = setInterval(() => {
      const cutoff = Date.now() - WINDOW_MS * 2;
      while (events.length > 0 && events[0].timestamp < cutoff) {
        events.shift();
      }
      // Clean stale rapid-fire entries
      for (const [ip, data] of rapidFireTracker.entries()) {
        if (Date.now() - data.lastTimestamp > WINDOW_MS) {
          rapidFireTracker.delete(ip);
        }
      }
      // Clean expired cooldowns
      for (const [key, expiry] of alertCooldowns.entries()) {
        if (Date.now() > expiry) {
          alertCooldowns.delete(key);
        }
      }
    }, 60_000);
  }
}

// ── Core tracking ──────────────────────────────────────────────────

export type MonitorEventType = "order" | "refund";

/**
 * Track an invoice-generating event and check for anomalies.
 * Call this after a successful order or refund creation.
 * Non-blocking — catches all errors internally.
 */
export function trackInvoiceEvent(opts: {
  ip: string;
  type: MonitorEventType;
  userId?: string | null;
  orderId?: string;
  refundId?: string;
}): void {
  // Fire-and-forget — never block the request
  detectAnomalies(opts).catch((err) =>
    console.error("Invoice monitor error:", err)
  );
}

async function detectAnomalies(opts: {
  ip: string;
  type: MonitorEventType;
  userId?: string | null;
  orderId?: string;
  refundId?: string;
}): Promise<void> {
  const now = Date.now();
  const { ip, type, userId, orderId, refundId } = opts;

  // Record event
  events.push({ timestamp: now, ip, type });

  const cutoff = now - WINDOW_MS;
  const recentEvents = events.filter((e) => e.timestamp >= cutoff);
  const alerts: AlertInfo[] = [];

  // ── Check 1: IP-based volume spike ────────────────────────────
  const ipEvents = recentEvents.filter((e) => e.ip === ip);
  if (ipEvents.length >= SPIKE_THRESHOLD_IP) {
    alerts.push({
      alertType: "IP_VOLUME_SPIKE",
      title: `High ${type} volume from single IP`,
      message: `${ipEvents.length} ${type}s in 5 min from IP ${ip}. Threshold: ${SPIKE_THRESHOLD_IP}.`,
      severity: "HIGH",
    });
  }

  // ── Check 2: Global volume spike ──────────────────────────────
  const globalTypeEvents = recentEvents.filter((e) => e.type === type);
  if (globalTypeEvents.length >= SPIKE_THRESHOLD_GLOBAL) {
    alerts.push({
      alertType: "GLOBAL_VOLUME_SPIKE",
      title: `Unusual ${type} volume across all IPs`,
      message: `${globalTypeEvents.length} ${type}s in 5 min globally. Threshold: ${SPIKE_THRESHOLD_GLOBAL}. Possible coordinated attack.`,
      severity: "CRITICAL",
    });
  }

  // ── Check 3: Rapid-fire detection (bot behavior) ──────────────
  const tracker = rapidFireTracker.get(ip);
  if (tracker) {
    const interval = now - tracker.lastTimestamp;
    if (interval < RAPID_FIRE_MS) {
      tracker.consecutiveCount++;
      if (tracker.consecutiveCount >= RAPID_FIRE_COUNT) {
        alerts.push({
          alertType: "RAPID_FIRE",
          title: `Bot-like ${type} generation detected`,
          message: `IP ${ip} generated ${tracker.consecutiveCount} ${type}s within ${RAPID_FIRE_MS}ms intervals. Likely automated.`,
          severity: "CRITICAL",
        });
      }
    } else {
      tracker.consecutiveCount = 1;
    }
    tracker.lastTimestamp = now;
  } else {
    rapidFireTracker.set(ip, { lastTimestamp: now, consecutiveCount: 1 });
  }

  // ── Fire alerts ───────────────────────────────────────────────
  for (const alert of alerts) {
    await fireAlert(alert, { ip, type, userId, orderId, refundId });
  }
}

// ── Alert dispatch ─────────────────────────────────────────────────

interface AlertInfo {
  alertType: string;
  title: string;
  message: string;
  severity: "HIGH" | "CRITICAL";
}

async function fireAlert(
  alert: AlertInfo,
  context: { ip: string; type: string; userId?: string | null; orderId?: string; refundId?: string },
): Promise<void> {
  // Cooldown check — don't spam the same alert type
  const cooldownKey = `${alert.alertType}:${context.ip}`;
  const cooldownExpiry = alertCooldowns.get(cooldownKey);
  if (cooldownExpiry && Date.now() < cooldownExpiry) return;
  alertCooldowns.set(cooldownKey, Date.now() + ALERT_COOLDOWN_MS);

  // 1. Audit log (always)
  audit({
    action: "RATE_LIMIT_HIT",
    ip: context.ip,
    userId: context.userId,
    resource: `invoice-monitor:${alert.alertType}`,
    resourceId: context.orderId || context.refundId,
    details: {
      severity: alert.severity,
      message: alert.message,
      eventType: context.type,
    },
    success: false,
  });

  // 2. In-app notification for all admins
  try {
    await db.insert(notifications).values({
      userId: null, // null = broadcast to all admins
      type: "SECURITY_ALERT",
      title: `🚨 ${alert.title}`,
      message: alert.message,
      entityType: context.type,
      entityId: context.orderId || context.refundId || null,
    });
  } catch (err) {
    console.error("Failed to insert security notification:", err);
  }

  // 3. Email alert (if configured)
  if (ADMIN_ALERT_EMAIL) {
    sendSecurityAlert({
      adminEmail: ADMIN_ALERT_EMAIL,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      ip: context.ip,
      eventType: context.type,
      resourceId: context.orderId || context.refundId,
    }).catch((err) => console.error("Failed to send security alert email:", err));
  }
}
