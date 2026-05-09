/**
 * Invoice Generation Monitor
 *
 * Tracks invoice/refund creation patterns and detects anomalies:
 * - Unusual volume spikes per IP or globally
 * - Rapid sequential generation (potential bot/DDoS)
 *
 * In production (Upstash configured): uses Redis sorted sets for
 * cross-instance sliding windows — works correctly on serverless.
 *
 * In development (no Upstash): falls back to in-memory store.
 *
 * Sends admin notifications + email alerts when thresholds are breached.
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

const WINDOW_MS = 5 * 60 * 1000; // 5-minute sliding window
const WINDOW_S = WINDOW_MS / 1000;

// ── Redis-backed implementation ────────────────────────────────────

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

/**
 * Redis sliding-window counter using a sorted set.
 * Key: `monitor:{prefix}:{identifier}`
 * Members: `{timestamp}-{random}` scored by timestamp (ms).
 * Expired members (outside window) are pruned on each increment.
 * Returns the count within the current window after incrementing.
 */
async function redisWindowCount(
  prefix: string,
  identifier: string,
): Promise<number> {
  // Lazy import to avoid loading Redis client when not needed
  const { Redis } = await import("@upstash/redis");
  const redis = Redis.fromEnv();

  const key = `monitor:${prefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const member = `${now}-${Math.random().toString(36).slice(2)}`;

  // Use a pipeline for atomicity and fewer round-trips
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);   // prune old events
  pipeline.zadd(key, { score: now, member });        // record this event
  pipeline.zcard(key);                               // count in window
  pipeline.expire(key, WINDOW_S * 2);               // auto-expire key

  const results = await pipeline.exec();
  // zcard result is at index 2
  return (results[2] as number) ?? 1;
}

/**
 * Redis last-event tracker for rapid-fire detection.
 * Returns { lastTimestamp, consecutiveCount } and atomically updates them.
 */
async function redisRapidFireCheck(ip: string): Promise<{
  lastTimestamp: number;
  consecutiveCount: number;
}> {
  const { Redis } = await import("@upstash/redis");
  const redis = Redis.fromEnv();

  const key = `monitor:rf:${ip}`;
  const now = Date.now();

  const raw = await redis.get<{ lastTimestamp: number; consecutiveCount: number }>(key);

  let consecutiveCount = 1;
  const lastTimestamp = raw?.lastTimestamp ?? 0;

  if (raw && now - raw.lastTimestamp < RAPID_FIRE_MS) {
    consecutiveCount = raw.consecutiveCount + 1;
  }

  await redis.set(key, { lastTimestamp: now, consecutiveCount }, { ex: WINDOW_S * 2 });
  return { lastTimestamp, consecutiveCount };
}

/**
 * Redis-backed alert cooldown.
 * Returns true if the alert is still within the cooldown period (should NOT fire again).
 */
async function redisCheckCooldown(cooldownKey: string): Promise<boolean> {
  const { Redis } = await import("@upstash/redis");
  const redis = Redis.fromEnv();

  const key = `monitor:cd:${cooldownKey}`;
  // SET NX (only set if not exists) — returns true if key was set (not in cooldown)
  const wasSet = await redis.set(key, 1, { ex: Math.ceil(ALERT_COOLDOWN_MS / 1000), nx: true });
  // wasSet is "OK" when set, null when key already existed (in cooldown)
  return wasSet === null;
}

// ── In-memory fallback (development only) ─────────────────────────

interface EventEntry {
  timestamp: number;
  ip: string;
  type: "order" | "refund";
}

const memEvents: EventEntry[] = [];
const memRapidFire = new Map<string, { lastTimestamp: number; consecutiveCount: number }>();
const memCooldowns = new Map<string, number>();

// Cleanup stale in-memory entries every 60s
if (typeof globalThis !== "undefined" && !hasUpstash) {
  const key = "__invoice_monitor_cleanup";
  const g = globalThis as Record<string, unknown>;
  if (!g[key]) {
    g[key] = setInterval(() => {
      const cutoff = Date.now() - WINDOW_MS * 2;
      while (memEvents.length > 0 && memEvents[0].timestamp < cutoff) {
        memEvents.shift();
      }
      for (const [ip, data] of memRapidFire.entries()) {
        if (Date.now() - data.lastTimestamp > WINDOW_MS) memRapidFire.delete(ip);
      }
      for (const [k, expiry] of memCooldowns.entries()) {
        if (Date.now() > expiry) memCooldowns.delete(k);
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
  const { ip, type, userId, orderId, refundId } = opts;
  const alerts: AlertInfo[] = [];

  if (hasUpstash) {
    // ── Redis path (production) ──────────────────────────────────

    // Check 1: IP-based volume spike
    const ipCount = await redisWindowCount(`ip:${type}`, ip);
    if (ipCount >= SPIKE_THRESHOLD_IP) {
      alerts.push({
        alertType: "IP_VOLUME_SPIKE",
        title: `High ${type} volume from single IP`,
        message: `${ipCount} ${type}s in 5 min from IP ${ip}. Threshold: ${SPIKE_THRESHOLD_IP}.`,
        severity: "HIGH",
      });
    }

    // Check 2: Global volume spike
    const globalCount = await redisWindowCount(`global:${type}`, "all");
    if (globalCount >= SPIKE_THRESHOLD_GLOBAL) {
      alerts.push({
        alertType: "GLOBAL_VOLUME_SPIKE",
        title: `Unusual ${type} volume across all IPs`,
        message: `${globalCount} ${type}s in 5 min globally. Threshold: ${SPIKE_THRESHOLD_GLOBAL}. Possible coordinated attack.`,
        severity: "CRITICAL",
      });
    }

    // Check 3: Rapid-fire detection
    const rf = await redisRapidFireCheck(ip);
    if (rf.consecutiveCount >= RAPID_FIRE_COUNT) {
      alerts.push({
        alertType: "RAPID_FIRE",
        title: `Bot-like ${type} generation detected`,
        message: `IP ${ip} generated ${rf.consecutiveCount} ${type}s within ${RAPID_FIRE_MS}ms intervals. Likely automated.`,
        severity: "CRITICAL",
      });
    }
  } else {
    // ── In-memory path (development) ────────────────────────────

    const now = Date.now();
    memEvents.push({ timestamp: now, ip, type });
    const cutoff = now - WINDOW_MS;
    const recent = memEvents.filter((e) => e.timestamp >= cutoff);

    const ipEvents = recent.filter((e) => e.ip === ip);
    if (ipEvents.length >= SPIKE_THRESHOLD_IP) {
      alerts.push({
        alertType: "IP_VOLUME_SPIKE",
        title: `High ${type} volume from single IP`,
        message: `${ipEvents.length} ${type}s in 5 min from IP ${ip}. Threshold: ${SPIKE_THRESHOLD_IP}.`,
        severity: "HIGH",
      });
    }

    const globalTypeEvents = recent.filter((e) => e.type === type);
    if (globalTypeEvents.length >= SPIKE_THRESHOLD_GLOBAL) {
      alerts.push({
        alertType: "GLOBAL_VOLUME_SPIKE",
        title: `Unusual ${type} volume across all IPs`,
        message: `${globalTypeEvents.length} ${type}s in 5 min globally. Threshold: ${SPIKE_THRESHOLD_GLOBAL}.`,
        severity: "CRITICAL",
      });
    }

    const tracker = memRapidFire.get(ip);
    const interval = tracker ? now - tracker.lastTimestamp : Infinity;
    const count = tracker && interval < RAPID_FIRE_MS ? tracker.consecutiveCount + 1 : 1;
    memRapidFire.set(ip, { lastTimestamp: now, consecutiveCount: count });
    if (count >= RAPID_FIRE_COUNT) {
      alerts.push({
        alertType: "RAPID_FIRE",
        title: `Bot-like ${type} generation detected`,
        message: `IP ${ip} generated ${count} ${type}s within ${RAPID_FIRE_MS}ms intervals. Likely automated.`,
        severity: "CRITICAL",
      });
    }
  }

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

  if (hasUpstash) {
    const inCooldown = await redisCheckCooldown(cooldownKey);
    if (inCooldown) return;
  } else {
    const cooldownExpiry = memCooldowns.get(cooldownKey);
    if (cooldownExpiry && Date.now() < cooldownExpiry) return;
    memCooldowns.set(cooldownKey, Date.now() + ALERT_COOLDOWN_MS);
  }

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
