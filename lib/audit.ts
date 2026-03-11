/**
 * Structured audit logger for security-sensitive operations.
 *
 * Writes structured JSON to stdout — compatible with Vercel Logs, Datadog,
 * AWS CloudWatch, and any log aggregation that parses JSON from stdout.
 *
 * For production, pipe these logs to an external service (Sentry, Datadog,
 * Axiom, BetterStack) via a log drain.
 */

export type AuditAction =
  | "AUTH_LOGIN"
  | "AUTH_REGISTER"
  | "AUTH_LOGOUT"
  | "AUTH_PASSWORD_CHANGE"
  | "AUTH_PASSWORD_RESET"
  | "AUTH_EMAIL_VERIFIED"
  | "ORDER_CREATE"
  | "ORDER_UPDATE"
  | "ORDER_CANCEL"
  | "PAYMENT_INITIATE"
  | "PAYMENT_CALLBACK"
  | "PAYMENT_WEBHOOK"
  | "PRODUCT_CREATE"
  | "PRODUCT_UPDATE"
  | "PRODUCT_DELETE"
  | "SETTINGS_UPDATE"
  | "UPLOAD_FILE"
  | "DELETE_FILE"
  | "ADMIN_ACTION"
  | "RATE_LIMIT_HIT"
  | "CSRF_BLOCKED"
  | "COUPON_VALIDATE"
  | "CUSTOMER_UPDATE"
  | "IMPORT_EXPORT"
  | "POS_SESSION_OPENED"
  | "POS_SESSION_CLOSED";

export interface AuditEntry {
  action: AuditAction;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  success: boolean;
  error?: string;
}

/**
 * Write a structured audit log entry.
 */
export function audit(entry: AuditEntry): void {
  const log = {
    _type: "audit",
    timestamp: new Date().toISOString(),
    ...entry,
  };

  // Use console.info for successful actions, console.warn for failures
  if (entry.success) {
    console.info(JSON.stringify(log));
  } else {
    console.warn(JSON.stringify(log));
  }
}

/**
 * Quick helper for request-level metadata in audit entries.
 */
export function auditMeta(req: Request): {
  ip: string;
  userAgent: string;
  method: string;
  url: string;
} {
  const forwarded = req.headers.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
    method: req.method,
    url: new URL(req.url).pathname,
  };
}
