import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EmailPreview = {
  id: string;
  name: string;
  trigger: string;
  subject: string;
  html: string;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
  }).format(amount);
}

function baseLayout(content: string) {
  return `
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
      <p>ShopFlow - Kingdom of Saudi Arabia</p>
      <p>VAT included (15%) as mandated by ZATCA</p>
    </div>
  </div>
</body>
</html>`;
}

function otpBlock(code: string) {
  return `
    <div style="text-align:center;margin:32px 0">
      <div style="display:inline-block;background:#f8f8f8;border:2px dashed #ddd;border-radius:12px;padding:20px 40px">
        <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#000;font-family:'Courier New',monospace">${code}</span>
      </div>
    </div>`;
}

function buildPreviews(): EmailPreview[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shopflow.example";
  const orderNumber = "SF-10042";
  const customerName = "Ahmed Al Saud";
  const orderRows = [
    { name: "iPhone 15 Pro", variant: "Black / 256GB", quantity: 1, price: 4299 },
    { name: "USB-C Fast Charger", variant: null, quantity: 2, price: 89 },
  ]
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatCurrency(item.price * item.quantity)}</td>
      </tr>`)
    .join("");

  return [
    {
      id: "order-confirmation",
      name: "Order Confirmation",
      trigger: "Sent automatically after an order is created.",
      subject: `Order Confirmed - #${orderNumber}`,
      html: baseLayout(`
        <h2 style="margin-top:0">Order Confirmed!</h2>
        <p>Hi ${customerName},</p>
        <p>Thank you for your order. We've received order <strong>#${orderNumber}</strong> and it's being processed.</p>
        <table class="order-table">
          <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>
            ${orderRows}
            <tr><td colspan="2">Subtotal</td><td style="text-align:right">${formatCurrency(4477)}</td></tr>
            <tr><td colspan="2">Shipping</td><td style="text-align:right">${formatCurrency(25)}</td></tr>
            <tr><td colspan="2">VAT (15%)</td><td style="text-align:right">${formatCurrency(675.3)}</td></tr>
            <tr><td colspan="2">Discount</td><td style="text-align:right">-${formatCurrency(100)}</td></tr>
            <tr class="total-row"><td colspan="2">Total</td><td style="text-align:right">${formatCurrency(5077.3)}</td></tr>
          </tbody>
        </table>
        <p><strong>Shipping to:</strong><br>Ahmed Al Saud<br>King Fahd Road<br>Riyadh, Saudi Arabia</p>
        <p><strong>Payment:</strong> Tap Payments</p>
        <p style="text-align:center;margin-top:24px"><a href="${appUrl}/account/orders" class="btn">View Order</a></p>
      `),
    },
    {
      id: "shipping-update",
      name: "Shipping Update",
      trigger: "Sent automatically when fulfillment/order status changes.",
      subject: `Order #${orderNumber} - Shipped`,
      html: baseLayout(`
        <h2 style="margin-top:0">Order Update</h2>
        <p>Hi ${customerName},</p>
        <p>We have an update for your order <strong>#${orderNumber}</strong>:</p>
        <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0;font-size:16px">Your order has been shipped. Tracking number: <strong>TRK123456789</strong></p>
        </div>
        <p style="text-align:center;margin-top:24px"><a href="${appUrl}/account/orders" class="btn">View Order</a></p>
      `),
    },
    {
      id: "welcome",
      name: "Welcome Email",
      trigger: "Sent automatically after email verification succeeds.",
      subject: "Welcome to ShopFlow!",
      html: baseLayout(`
        <h2 style="margin-top:0">Welcome to ShopFlow!</h2>
        <p>Hi ${customerName},</p>
        <p>Thank you for creating an account with us. We're excited to have you.</p>
        <ul><li>Save items to your wishlist</li><li>Track your orders</li><li>Manage addresses</li><li>Get personalized recommendations</li></ul>
        <p style="text-align:center;margin-top:24px"><a href="${appUrl}/products" class="btn">Start Shopping</a></p>
      `),
    },
    {
      id: "email-verification",
      name: "Email Verification Link",
      trigger: "Legacy verification-link template. Current registration uses OTP.",
      subject: "Verify Your Email - ShopFlow",
      html: baseLayout(`
        <h2 style="margin-top:0">Verify Your Email</h2>
        <p>Hi ${customerName},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p style="text-align:center;margin-top:24px"><a href="${appUrl}/verify-email?token=sample" class="btn">Verify Email</a></p>
        <p style="font-size:13px;color:#666;margin-top:24px">If you didn't create an account, you can safely ignore this email. This link will expire in 24 hours.</p>
      `),
    },
    {
      id: "email-verification-otp",
      name: "Registration OTP",
      trigger: "Sent automatically during registration and resend-code flow.",
      subject: "Your Verification Code - ShopFlow",
      html: baseLayout(`
        <h2 style="margin-top:0">Verify Your Email</h2>
        <p>Hi ${customerName},</p>
        <p>Use the verification code below to confirm your email address:</p>
        ${otpBlock("123456")}
        <p style="text-align:center;font-size:14px;color:#555">Enter this code on the verification page to activate your account.</p>
      `),
    },
    {
      id: "login-otp",
      name: "Two-Factor Login OTP",
      trigger: "Sent automatically after a valid password during email/password login.",
      subject: "Your ShopFlow Sign-In Code",
      html: baseLayout(`
        <h2 style="margin-top:0">Your Sign-In Code</h2>
        <p>Hi ${customerName},</p>
        <p>Use the code below to finish signing in to your account:</p>
        ${otpBlock("654321")}
        <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:24px 0;border:1px solid #bae6fd">
          <p style="margin:0;font-size:13px;color:#0369a1"><strong>This code expires in 10 minutes.</strong><br>If you did not try to sign in, change your password immediately and contact support.</p>
        </div>
      `),
    },
    {
      id: "password-reset",
      name: "Password Reset",
      trigger: "Sent automatically when a customer requests a password reset.",
      subject: "Reset Your Password - ShopFlow",
      html: baseLayout(`
        <h2 style="margin-top:0">Reset Your Password</h2>
        <p>Hi ${customerName},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <p style="text-align:center;margin-top:24px"><a href="${appUrl}/reset-password?token=sample" class="btn">Reset Password</a></p>
        <p style="font-size:13px;color:#666;margin-top:24px">If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.</p>
      `),
    },
    {
      id: "refund",
      name: "Refund Confirmation",
      trigger: "Sent automatically after a completed refund is recorded.",
      subject: `Refund Processed - Order #${orderNumber}`,
      html: baseLayout(`
        <h2 style="margin-top:0">Refund Processed</h2>
        <p>Hi ${customerName},</p>
        <p>We've processed a refund for your order <strong>#${orderNumber}</strong>.</p>
        <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0;font-size:20px;font-weight:700">${formatCurrency(249.99)}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#666">Refunded to your original payment method</p>
        </div>
        <p><strong>Reason:</strong> Returned item approved after inspection</p>
        <p style="font-size:13px;color:#666">Refunds typically take 5-10 business days to appear on your statement.</p>
      `),
    },
    {
      id: "low-stock",
      name: "Low Stock Alert",
      trigger: "Available as an admin alert template for inventory monitoring.",
      subject: "Low Stock Alert - 2 products",
      html: baseLayout(`
        <h2 style="margin-top:0">Low Stock Alert</h2>
        <p>The following products are running low on inventory:</p>
        <table class="order-table"><thead><tr><th>Product</th><th>SKU</th><th>Current Stock</th><th>Threshold</th></tr></thead>
        <tbody><tr><td>iPhone 15 Pro</td><td>IPH15-BLK</td><td style="color:#e11d48;font-weight:600">2</td><td>5</td></tr></tbody></table>
        <p style="text-align:center;margin-top:24px"><a href="${appUrl}/admin/products" class="btn">Manage Inventory</a></p>
      `),
    },
    {
      id: "abandoned-cart",
      name: "Abandoned Cart Recovery",
      trigger: "Sent manually from Admin > Abandoned Carts.",
      subject: "You left items in your cart - complete your order!",
      html: baseLayout(`
        <h2 style="margin-top:0">You left something behind!</h2>
        <p>Hi there,</p>
        <p>We noticed you left some great items in your cart. They're still waiting for you.</p>
        <table class="order-table"><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr></thead>
        <tbody>${orderRows}<tr class="total-row"><td colspan="2">Subtotal</td><td style="text-align:right">${formatCurrency(4477)}</td></tr></tbody></table>
        <p style="text-align:center;margin-top:24px"><a href="${appUrl}/cart?recover=sample" class="btn">Complete Your Order</a></p>
      `),
    },
    {
      id: "contact-form",
      name: "Contact Form Notification",
      trigger: "Sent automatically to the store email when the contact form is submitted.",
      subject: "Contact: Warranty question",
      html: baseLayout(`
        <h2 style="margin-top:0">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 12px;font-weight:600;color:#666;width:100px">Name</td><td style="padding:8px 12px">${customerName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#666">Email</td><td style="padding:8px 12px"><a href="mailto:customer@example.com">customer@example.com</a></td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#666">Subject</td><td style="padding:8px 12px">Warranty question</td></tr>
        </table>
        <div style="padding:16px;background:#f9f9f9;border-radius:6px;margin:16px 0;white-space:pre-wrap">I need help with warranty coverage for my recent order.</div>
      `),
    },
    {
      id: "security-alert",
      name: "Security Alert",
      trigger: "Sent automatically when invoice/refund anomaly monitoring detects suspicious activity.",
      subject: "[HIGH] Suspicious invoice activity",
      html: baseLayout(`
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;border-radius:6px;margin-bottom:20px">
          <h2 style="margin:0;color:#f59e0b">Security Alert - HIGH</h2>
        </div>
        <h3 style="margin-top:0">Suspicious invoice activity</h3>
        <p>Multiple invoice or refund events were created in a short time window.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 12px;font-weight:600;color:#666;width:120px">Severity</td><td style="padding:8px 12px;color:#f59e0b;font-weight:600">HIGH</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#666">Source IP</td><td style="padding:8px 12px"><code>127.0.0.1</code></td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#666">Event Type</td><td style="padding:8px 12px">refund</td></tr>
        </table>
      `),
    },
    {
      id: "newsletter",
      name: "Newsletter Campaign",
      trigger: "Sent manually from Admin > Newsletter campaigns.",
      subject: "New arrivals are here",
      html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;color:#333}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:#000;color:#fff;padding:24px;text-align:center}.header h1{margin:0;font-size:20px;letter-spacing:1px}.content{padding:32px 24px;line-height:1.6}.content a{color:#000;font-weight:600}.btn{display:inline-block;padding:12px 24px;background:#000;color:#fff!important;text-decoration:none;border-radius:6px;font-weight:600}.footer{padding:24px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee}.footer a{color:#999;text-decoration:underline}</style></head>
<body><div class="container"><div class="header"><h1>ShopFlow</h1></div><div class="content"><h2>New arrivals are here</h2><p>Discover the latest products now available in store.</p><p style="text-align:center;margin-top:24px"><a href="${appUrl}/products" class="btn">Shop New Arrivals</a></p></div><div class="footer"><p>ShopFlow - Kingdom of Saudi Arabia</p><p>You received this because you subscribed to our newsletter.</p><p><a href="${appUrl}/api/newsletter?email=customer%40example.com">Unsubscribe</a></p></div></div></body></html>`,
    },
  ];
}

export default function EmailPreviewsPage() {
  const previews = buildPreviews();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Email Previews</h1>
        <p className="max-w-3xl text-muted-foreground">
          These previews show the design, subject, trigger, and sample content for emails the system sends. Viewing this page does not send email.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sending behavior</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Transactional emails are sent automatically by their related app events.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Admin logging</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Local email history is not stored yet. Delivery history is available in Resend.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Templates</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {previews.length} email templates are available for review.
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={previews[0]?.id} className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          {previews.map((preview) => (
            <TabsTrigger key={preview.id} value={preview.id}>
              {preview.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {previews.map((preview) => (
          <TabsContent key={preview.id} value={preview.id}>
            <Card>
              <CardHeader className="gap-2">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>{preview.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{preview.trigger}</p>
                  </div>
                  <Badge variant="outline" className="w-fit">No send</Badge>
                </div>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">Subject:</span> {preview.subject}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-md border bg-muted">
                  <iframe
                    title={`${preview.name} preview`}
                    srcDoc={preview.html}
                    className="h-[720px] w-full bg-white"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
