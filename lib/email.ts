import { Resend } from "resend";
import { formatCurrency } from "@/lib/helpers";

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
      <td>${item.name}${item.variantName ? ` (${item.variantName})` : ""}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.price * item.quantity)}</td>
    </tr>`
    )
    .join("");

  const addressBlock = data.shippingAddress
    ? `<p><strong>Shipping to:</strong><br>${data.shippingAddress.firstName} ${data.shippingAddress.lastName}<br>${data.shippingAddress.address}<br>${data.shippingAddress.city}, ${data.shippingAddress.country}</p>`
    : "";

  const html = baseLayout(`
    <h2 style="margin-top:0">Order Confirmed! 🎉</h2>
    <p>Hi ${data.customerName || "there"},</p>
    <p>Thank you for your order! We've received your order <strong>#${data.orderNumber}</strong> and it's being processed.</p>
    
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
    <p><strong>Payment:</strong> ${data.paymentMethod === "COD" ? "Cash on Delivery" : data.paymentMethod}</p>
    
    <p style="text-align:center;margin-top:24px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/orders" class="btn">View Order</a>
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
    SHIPPED: `Your order has been shipped!${data.trackingNumber ? ` Tracking number: <strong>${data.trackingNumber}</strong>` : ""}`,
    DELIVERY: "Your order is out for delivery.",
    DELIVERED: "Your order has been delivered. We hope you love it!",
    CANCELLED: "Your order has been cancelled. If you have questions, please contact us.",
  };

  const message = statusMessages[data.status] || `Your order status has been updated to: ${data.status}`;

  const html = baseLayout(`
    <h2 style="margin-top:0">Order Update</h2>
    <p>Hi ${data.customerName || "there"},</p>
    <p>We have an update for your order <strong>#${data.orderNumber}</strong>:</p>
    <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin:16px 0">
      <p style="margin:0;font-size:16px">${message}</p>
    </div>
    <p style="text-align:center;margin-top:24px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/orders" class="btn">View Order</a>
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
  const html = baseLayout(`
    <h2 style="margin-top:0">Welcome to ShopFlow! 🛍️</h2>
    <p>Hi ${data.name},</p>
    <p>Thank you for creating an account with us. We're excited to have you!</p>
    <p>You can now:</p>
    <ul>
      <li>Save items to your wishlist</li>
      <li>Track your orders</li>
      <li>Manage your addresses</li>
      <li>Get personalized recommendations</li>
    </ul>
    <p style="text-align:center;margin-top:24px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/products" class="btn">Start Shopping</a>
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
// PASSWORD RESET
// ============================================================

export async function sendPasswordReset(data: {
  email: string;
  name: string;
  resetUrl: string;
}) {
  const html = baseLayout(`
    <h2 style="margin-top:0">Reset Your Password</h2>
    <p>Hi ${data.name},</p>
    <p>We received a request to reset your password. Click the button below to set a new password:</p>
    <p style="text-align:center;margin-top:24px">
      <a href="${data.resetUrl}" class="btn">Reset Password</a>
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
  const html = baseLayout(`
    <h2 style="margin-top:0">Refund Processed</h2>
    <p>Hi ${data.customerName || "there"},</p>
    <p>We've processed a refund for your order <strong>#${data.orderNumber}</strong>.</p>
    <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin:16px 0">
      <p style="margin:0;font-size:20px;font-weight:700">${formatCurrency(data.refundAmount)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#666">Refunded to your original payment method</p>
    </div>
    ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
    <p style="font-size:13px;color:#666">Refunds typically take 5–10 business days to appear on your statement.</p>
    <p style="text-align:center;margin-top:24px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/orders" class="btn">View Orders</a>
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
        <td>${p.name}</td>
        <td>${p.sku || "—"}</td>
        <td style="color:#e11d48;font-weight:600">${p.quantity}</td>
        <td>${p.threshold}</td>
      </tr>`
    )
    .join("");

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
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/products" class="btn">Manage Inventory</a>
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
          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:48px;height:48px;object-fit:cover;border-radius:6px" />` : ""}
          <span>${item.name}</span>
        </div>
      </td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.price * item.quantity)}</td>
    </tr>`
    )
    .join("");

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
      <a href="${data.recoveryUrl}" class="btn">Complete Your Order</a>
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
