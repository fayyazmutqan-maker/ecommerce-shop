import { Resend } from "resend";
import { formatCurrency } from "@/lib/helpers";

// ============================================================
// HTML ESCAPING — Prevent XSS in email templates
// ============================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize a URL for use in an href attribute.
 * Allows only http: and https: schemes to block javascript: and data: URLs.
 * Falls back to "#" for anything that doesn't parse or has a disallowed scheme.
 */
function safeHref(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "#";
    }
    // escapeHtml on the full URL so quotes can't break out of the attribute
    return escapeHtml(url);
  } catch {
    return "#";
  }
}

// ============================================================
// EMAIL SERVICE — Powered by Resend
// Falls back to console logging when RESEND_API_KEY is not set
// ============================================================

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = process.env.EMAIL_FROM || "ShopFlow <onboarding@resend.dev>";

type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
};

async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string }> {
  if (!resend) {
    console.log("📧 [DEV] Email (no RESEND_API_KEY set):");
    console.log(`  To: ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`);
    console.log(`  Subject: ${payload.subject}`);
    console.log(`  Body preview: ${payload.html.replace(/<[^>]*>/g, "").substring(0, 200)}…`);
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo,
      tags: payload.tags,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false };
  }
}

// ============================================================
// EMAIL TEMPLATES
// ============================================================

const baseLayout = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #000; color: #fff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
    .content { padding: 32px 24px; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .btn { display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .order-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .order-table th, .order-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
    .order-table th { font-size: 12px; text-transform: uppercase; color: #666; }
    .total-row td { font-weight: 700; border-top: 2px solid #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>ShopFlow</h1></div>
    <div class="content">${content}</div>
    <div class="footer">
      <p>ShopFlow — Kingdom of Saudi Arabia</p>
      <p>VAT included (15%) as mandated by ZATCA</p>
    </div>
  </div>
</body>
</html>
`;

// ============================================================
// ORDER CONFIRMATION
// ============================================================

type OrderEmailData = {
  orderNumber: string;
  customerName: string;
  email: string;
  items: Array<{
    name: string;
    variantName?: string | null;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    country: string;
  } | null;
  paymentMethod: string;
};

export async function sendOrderConfirmation(data: OrderEmailData) {
  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.name)}${item.variantName ? ` (${escapeHtml(item.variantName)})` : ""}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.price * item.quantity)}</td>
    </tr>`
    )
    .join("");

  const addressBlock = data.shippingAddress
    ? `<p><strong>Shipping to:</strong><br>${escapeHtml(data.shippingAddress.firstName)} ${escapeHtml(data.shippingAddress.lastName)}<br>${escapeHtml(data.shippingAddress.address)}<br>${escapeHtml(data.shippingAddress.city)}, ${escapeHtml(data.shippingAddress.country)}</p>`
    : "";

  const appUrl = safeHref(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/orders`);

  const html = baseLayout(`
    <h2 style="margin-top:0">Order Confirmed! 🎉</h2>
    <p>Hi ${escapeHtml(data.customerName || "there")},</p>
    <p>Thank you for your order! We've received your order <strong>#${escapeHtml(data.orderNumber)}</strong> and it's being processed.</p>
    
    <table class="order-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr>
          <td colspan="2">Subtotal</td>
          <td style="text-align:right">${formatCurrency(data.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="2">Shipping</td>
          <td style="text-align:right">${formatCurrency(data.shippingCost)}</td>
        </tr>
        <tr>
          <td colspan="2">VAT (15%)</td>
          <td style="text-align:right">${formatCurrency(data.taxAmount)}</td>
        </tr>
        ${data.discountAmount > 0 ? `<tr><td colspan="2">Discount</td><td style="text-align:right">-${formatCurrency(data.discountAmount)}</td></tr>` : ""}
        <tr class="total-row">
          <td colspan="2">Total</td>
          <td style="text-align:right">${formatCurrency(data.totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    ${addressBlock}
    <p><strong>Payment:</strong> ${data.paymentMethod === "COD" ? "Cash on Delivery" : escapeHtml(data.paymentMethod)}</p>
    
    <p style="text-align:center;margin-top:24px">
      <a href="${appUrl}" class="btn">View Order</a>
    </p>
  `);

  return sendEmail({
    to: data.email,
    subject: `Order Confirmed - #${data.orderNumber}`,
    html,
    tags: [
      { name: "type", value: "order-confirmation" },
      { name: "order", value: data.orderNumber },
    ],
  });
}

// ============================================================
// SHIPPING UPDATE
// ============================================================

export async function sendShippingUpdate(data: {
  email: string;
  customerName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string | null;
}) {
  const statusMessages: Record<string, string> = {
    PROCESSING: "Your order is being prepared for shipping.",
    SHIPPED: `Your order has been shipped!${data.trackingNumber ? ` Tracking number: <strong>${escapeHtml(data.trackingNumber)}</strong>` : ""}`,
    DELIVERY: "Your order is out for delivery.",
    DELIVERED: "Your order has been delivered. We hope you love it!",
    CANCELLED: "Your order has been cancelled. If you have questions, please contact us.",
  };

  const message = statusMessages[data.status] || `Your order status has been updated to: ${escapeHtml(data.status)}`;
  const appUrl = safeHref(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/orders`);

  const html = baseLayout(`
    <h2 style="margin-top:0">Order Update</h2>
    <p>Hi ${escapeHtml(data.customerName || "there")},</p>
    <p>We have an update for your order <strong>#${escapeHtml(data.orderNumber)}</strong>:</p>
    <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin:16px 0">
      <p style="margin:0;font-size:16px">${message}</p>
    </div>
    <p style="text-align:center;margin-top:24px">
      <a href="${appUrl}" class="btn">View Order</a>
    </p>
  `);

  return sendEmail({
    to: data.email,
    subject: `Order #${data.orderNumber} - ${data.status.charAt(0) + data.status.slice(1).toLowerCase()}`,
    html,
    tags: [
      { name: "type", value: "shipping-update" },
      { name: "order", value: data.orderNumber },
      { name: "status", value: data.status.toLowerCase() },
    ],
  });
}

// ============================================================
// WELCOME EMAIL
// ============================================================

export async function sendWelcomeEmail(data: {
  email: string;
  name: string;
}) {
  const appUrl = safeHref(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/products`);

  const html = baseLayout(`
    <h2 style="margin-top:0">Welcome to ShopFlow! 🛍️</h2>
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>Thank you for creating an account with us. We're excited to have you!</p>
    <p>You can now:</p>
    <ul>
      <li>Save items to your wishlist</li>
      <li>Track your orders</li>
      <li>Manage your addresses</li>
      <li>Get personalized recommendations</li>
    </ul>
    <p style="text-align:center;margin-top:24px">
      <a href="${appUrl}" class="btn">Start Shopping</a>
    </p>
  `);

  return sendEmail({
    to: data.email,
    subject: "Welcome to ShopFlow!",
    html,
    tags: [{ name: "type", value: "welcome" }],
  });
}

// ============================================================
// EMAIL VERIFICATION (OTP)
// ============================================================

export async function sendEmailVerification(data: {
  email: string;
  name: string;
  verificationUrl: string;
}) {
  // safeHref validates scheme and escapes — prevents javascript: / data: injection
  const href = safeHref(data.verificationUrl);

  const html = baseLayout(`
    <h2 style="margin-top:0">Verify Your Email</h2>
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>Thank you for creating an account! Please verify your email address by clicking the button below:</p>
    <p style="text-align:center;margin-top:24px">
      <a href="${href}" class="btn">Verify Email</a>
    </p>
    <p style="font-size:13px;color:#666;margin-top:24px">If you didn't create an account, you can safely ignore this email. This link will expire in 24 hours.</p>
  `);

  return sendEmail({
    to: data.email,
    subject: "Verify Your Email - ShopFlow",
    html,
    tags: [{ name: "type", value: "email-verification" }],
  });
}

export async function sendEmailVerificationOTP(data: {
  email: string;
  name: string;
  otp: string;
}) {
  const html = baseLayout(`
    <h2 style="margin-top:0">Verify Your Email</h2>
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>Thank you for creating an account! Use the verification code below to confirm your email address:</p>
    <div style="text-align:center;margin:32px 0">
      <div style="display:inline-block;background:#f8f8f8;border:2px dashed #ddd;border-radius:12px;padding:20px 40px">
        <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#000;font-family:'Courier New',monospace">${escapeHtml(data.otp)}</span>
      </div>
    </div>
    <p style="text-align:center;font-size:14px;color:#555">Enter this code on the verification page to activate your account.</p>
    <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:24px 0;border:1px solid #bae6fd">
      <p style="margin:0;font-size:13px;color:#0369a1">
        <strong>⏱ This code expires in 10 minutes.</strong><br>
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
    <p style="text-align:center;font-size:12px;color:#999;margin-top:24px">For security reasons, never share this code with anyone. ShopFlow staff will never ask for your verification code.</p>
  `);

  return sendEmail({
    to: data.email,
    subject: "Your Verification Code - ShopFlow",
    html,
    tags: [{ name: "type", value: "email-verification-otp" }],
  });
}

// ============================================================
// PASSWORD RESET
// ============================================================

export async function sendPasswordReset(data: {
  email: string;
  name: string;
  resetUrl: string;
}) {
  const href = safeHref(data.resetUrl);

  const html = baseLayout(`
    <h2 style="margin-top:0">Reset Your Password</h2>
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>We received a request to reset your password. Click the button below to set a new password:</p>
    <p style="text-align:center;margin-top:24px">
      <a href="${href}" class="btn">Reset Password</a>
    </p>
    <p style="font-size:13px;color:#666;margin-top:24px">If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.</p>
  `);

  return sendEmail({
    to: data.email,
    subject: "Reset Your Password - ShopFlow",
    html,
    tags: [{ name: "type", value: "password-reset" }],
  });
}

// ============================================================
// ORDER REFUND CONFIRMATION
// ============================================================

export async function sendRefundConfirmation(data: {
  email: string;
  customerName: string;
  orderNumber: string;
  refundAmount: number;
  reason?: string;
}) {
  const appUrl = safeHref(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/orders`);

  const html = baseLayout(`
    <h2 style="margin-top:0">Refund Processed</h2>
    <p>Hi ${escapeHtml(data.customerName || "there")},</p>
    <p>We've processed a refund for your order <strong>#${escapeHtml(data.orderNumber)}</strong>.</p>
    <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin:16px 0">
      <p style="margin:0;font-size:20px;font-weight:700">${formatCurrency(data.refundAmount)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#666">Refunded to your original payment method</p>
    </div>
    ${data.reason ? `<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>` : ""}
    <p style="font-size:13px;color:#666">Refunds typically take 5–10 business days to appear on your statement.</p>
    <p style="text-align:center;margin-top:24px">
      <a href="${appUrl}" class="btn">View Orders</a>
    </p>
  `);

  return sendEmail({
    to: data.email,
    subject: `Refund Processed - Order #${data.orderNumber}`,
    html,
    tags: [
      { name: "type", value: "refund" },
      { name: "order", value: data.orderNumber },
    ],
  });
}

// ============================================================
// ADMIN: LOW STOCK ALERT
// ============================================================

export async function sendLowStockAlert(data: {
  adminEmail: string;
  products: Array<{ name: string; sku: string | null; quantity: number; threshold: number }>;
}) {
  const rows = data.products
    .map(
      (p) => `<tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.sku || "—")}</td>
        <td style="color:#e11d48;font-weight:600">${p.quantity}</td>
        <td>${p.threshold}</td>
      </tr>`
    )
    .join("");

  const appUrl = safeHref(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/products`);

  const html = baseLayout(`
    <h2 style="margin-top:0">⚠️ Low Stock Alert</h2>
    <p>The following products are running low on inventory:</p>
    <table class="order-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>SKU</th>
          <th>Current Stock</th>
          <th>Threshold</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="text-align:center;margin-top:24px">
      <a href="${appUrl}" class="btn">Manage Inventory</a>
    </p>
  `);

  return sendEmail({
    to: data.adminEmail,
    subject: `Low Stock Alert — ${data.products.length} product${data.products.length > 1 ? "s" : ""}`,
    html,
    tags: [{ name: "type", value: "low-stock-alert" }],
  });
}

// ============================================================
// ABANDONED CART RECOVERY
// ============================================================

export async function sendAbandonedCartEmail(data: {
  email: string;
  items: Array<{ name: string; price: number; quantity: number; image?: string }>;
  subtotal: number;
  recoveryUrl: string;
}) {
  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px">
          ${item.image ? `<img src="${safeHref(item.image)}" alt="${escapeHtml(item.name)}" style="width:48px;height:48px;object-fit:cover;border-radius:6px" />` : ""}
          <span>${escapeHtml(item.name)}</span>
        </div>
      </td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.price * item.quantity)}</td>
    </tr>`
    )
    .join("");

  const recoveryHref = safeHref(data.recoveryUrl);

  const html = baseLayout(`
    <h2 style="margin-top:0">You left something behind! 🛒</h2>
    <p>Hi there,</p>
    <p>We noticed you left some great items in your cart. They're still waiting for you!</p>
    
    <table class="order-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr class="total-row">
          <td colspan="2">Subtotal</td>
          <td style="text-align:right">${formatCurrency(data.subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <p style="text-align:center;margin-top:24px">
      <a href="${recoveryHref}" class="btn">Complete Your Order</a>
    </p>
    
    <p style="font-size:13px;color:#666;margin-top:24px;text-align:center">
      This link will expire in 30 days. If you have any questions, reply to this email.
    </p>
  `);

  return sendEmail({
    to: data.email,
    subject: "You left items in your cart — complete your order!",
    html,
    tags: [{ name: "type", value: "abandoned-cart" }],
  });
}

// ============================================================
// CONTACT FORM NOTIFICATION
// ============================================================

export async function sendContactFormNotification(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  recipientEmail: string;
}) {
  const appUrl = safeHref(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/activity-log`);

  const html = baseLayout(`
    <h2 style="margin-top:0">New Contact Form Submission</h2>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px 12px;font-weight:600;color:#666;width:100px">Name</td><td style="padding:8px 12px">${escapeHtml(data.name)}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600;color:#666">Email</td><td style="padding:8px 12px"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td></tr>
      ${data.phone ? `<tr><td style="padding:8px 12px;font-weight:600;color:#666">Phone</td><td style="padding:8px 12px">${escapeHtml(data.phone)}</td></tr>` : ""}
      <tr><td style="padding:8px 12px;font-weight:600;color:#666">Subject</td><td style="padding:8px 12px">${escapeHtml(data.subject)}</td></tr>
    </table>
    <div style="padding:16px;background:#f9f9f9;border-radius:6px;margin:16px 0;white-space:pre-wrap">${escapeHtml(data.message)}</div>
    <p style="font-size:13px;color:#666">Reply directly to this email to respond to the customer.</p>
  `);

  return sendEmail({
    to: data.recipientEmail,
    subject: `Contact: ${data.subject}`,
    html,
    replyTo: data.email,
    tags: [{ name: "type", value: "contact-form" }],
  });
}

// ============================================================
// SECURITY ALERT — Suspicious invoice generation
// ============================================================

export async function sendSecurityAlert(data: {
  adminEmail: string;
  severity: "HIGH" | "CRITICAL";
  title: string;
  message: string;
  ip: string;
  eventType: string;
  resourceId?: string;
}) {
  const severityColor = data.severity === "CRITICAL" ? "#dc2626" : "#f59e0b";
  const severityBg = data.severity === "CRITICAL" ? "#fef2f2" : "#fffbeb";
  const appUrl = safeHref(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/activity-log`);

  const html = baseLayout(`
    <div style="background:${severityBg};border-left:4px solid ${severityColor};padding:16px;border-radius:6px;margin-bottom:20px">
      <h2 style="margin:0;color:${severityColor}">🚨 Security Alert — ${escapeHtml(data.severity)}</h2>
    </div>
    <h3 style="margin-top:0">${escapeHtml(data.title)}</h3>
    <p>${escapeHtml(data.message)}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px 12px;font-weight:600;color:#666;width:120px">Severity</td><td style="padding:8px 12px;color:${severityColor};font-weight:600">${escapeHtml(data.severity)}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600;color:#666">Source IP</td><td style="padding:8px 12px"><code>${escapeHtml(data.ip)}</code></td></tr>
      <tr><td style="padding:8px 12px;font-weight:600;color:#666">Event Type</td><td style="padding:8px 12px">${escapeHtml(data.eventType)}</td></tr>
      ${data.resourceId ? `<tr><td style="padding:8px 12px;font-weight:600;color:#666">Resource ID</td><td style="padding:8px 12px"><code>${escapeHtml(data.resourceId)}</code></td></tr>` : ""}
      <tr><td style="padding:8px 12px;font-weight:600;color:#666">Time</td><td style="padding:8px 12px">${new Date().toISOString()}</td></tr>
    </table>
    <p style="text-align:center;margin-top:24px">
      <a href="${appUrl}" class="btn">View Activity Log</a>
    </p>
    <p style="font-size:13px;color:#666;margin-top:16px">This alert was triggered by the invoice generation monitoring system. If this is expected activity, no action is needed. Alerts are rate-limited to prevent flooding.</p>
  `);

  return sendEmail({
    to: data.adminEmail,
    subject: `🚨 [${data.severity}] ${data.title}`,
    html,
    tags: [{ name: "type", value: "security-alert" }],
  });
}

// ============================================================
// NEWSLETTER CAMPAIGN
// ============================================================

export async function sendNewsletterEmail(data: {
  to: string;
  subject: string;
  previewText?: string;
  content: string;
  campaignId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const unsubscribeUrl = safeHref(`${appUrl}/api/newsletter?email=${encodeURIComponent(data.to)}`);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${data.previewText ? `<span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden">${escapeHtml(data.previewText)}</span>` : ""}
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #000; color: #fff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .content h2 { color: #111; margin-top: 0; }
    .content a { color: #000; font-weight: 600; }
    .btn { display: inline-block; padding: 12px 24px; background: #000; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .footer a { color: #999; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>ShopFlow</h1></div>
    <div class="content">${data.content}</div>
    <div class="footer">
      <p>ShopFlow — Kingdom of Saudi Arabia</p>
      <p>You received this because you subscribed to our newsletter.</p>
      <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: data.to,
    subject: data.subject,
    html,
    tags: [
      { name: "type", value: "newsletter" },
      { name: "campaign", value: data.campaignId },
    ],
  });
}
