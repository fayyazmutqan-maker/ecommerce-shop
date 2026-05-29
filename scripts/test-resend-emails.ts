import { existsSync, readFileSync } from "fs";

type EmailResult = {
  name: string;
  status: "pass" | "fail" | "skip";
  id?: string;
  error?: string;
};

type SendResult = {
  success: boolean;
  id?: string;
};

function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;

    const separatorIndex = line.indexOf("=");
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getArg(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

function validateEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function validateFromAddress(value: string) {
  const trimmed = value.trim();
  if (validateEmail(trimmed)) return true;
  return /^[^<>]+<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$/.test(trimmed);
}

async function runEmail(name: string, send: () => Promise<SendResult>): Promise<EmailResult> {
  try {
    const result = await send();
    if (!result.success) {
      return { name, status: "fail", error: "Email helper returned success=false" };
    }

    return { name, status: "pass", id: result.id };
  } catch (error) {
    return {
      name,
      status: "fail",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  loadDotEnv();

  const dryRun = hasFlag("dry-run");
  const to = getArg("to") || process.env.RESEND_TEST_TO;
  const from = process.env.EMAIL_FROM || "ShopFlow <onboarding@resend.dev>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const configResults: EmailResult[] = [];
  configResults.push({
    name: "RESEND_API_KEY configured",
    status: process.env.RESEND_API_KEY?.startsWith("re_") ? "pass" : "fail",
    error: process.env.RESEND_API_KEY?.startsWith("re_") ? undefined : "RESEND_API_KEY is missing or invalid",
  });
  configResults.push({
    name: "EMAIL_FROM format",
    status: validateFromAddress(from) ? "pass" : "fail",
    error: validateFromAddress(from) ? undefined : `Invalid EMAIL_FROM: ${from}`,
  });

  if (dryRun) {
    delete process.env.RESEND_API_KEY;
  }

  const recipient = to || extractEmail(from);
  if (!validateEmail(recipient)) {
    configResults.push({
      name: "Test recipient",
      status: "fail",
      error: "Set RESEND_TEST_TO in .env or pass --to=email@example.com",
    });
  } else {
    configResults.push({ name: "Test recipient", status: "pass" });
  }

  const email = await import("../lib/email");

  const sampleOrder = {
    orderNumber: `EMAIL-TEST-${Date.now()}`,
    customerName: "Email Test Customer",
    email: recipient,
    items: [
      { name: "Test Product", variantName: "Black / 128GB", quantity: 1, price: 99 },
      { name: "Accessory", variantName: null, quantity: 2, price: 12.5 },
    ],
    subtotal: 124,
    shippingCost: 10,
    taxAmount: 20.1,
    discountAmount: 5,
    totalAmount: 149.1,
    shippingAddress: {
      firstName: "Email",
      lastName: "Tester",
      address: "123 Test Street",
      city: "Riyadh",
      country: "Saudi Arabia",
    },
    paymentMethod: "Tap Payments",
  };

  const tests: Array<[string, () => Promise<SendResult>]> = [
    ["Order confirmation", () => email.sendOrderConfirmation(sampleOrder)],
    ["Shipping update", () => email.sendShippingUpdate({
      email: recipient,
      customerName: "Email Test Customer",
      orderNumber: sampleOrder.orderNumber,
      status: "SHIPPED",
      trackingNumber: "TEST123456",
    })],
    ["Welcome email", () => email.sendWelcomeEmail({ email: recipient, name: "Email Test Customer" })],
    ["Verification link", () => email.sendEmailVerification({
      email: recipient,
      name: "Email Test Customer",
      verificationUrl: `${appUrl}/verify-email?token=test-token`,
    })],
    ["Verification OTP", () => email.sendEmailVerificationOTP({
      email: recipient,
      name: "Email Test Customer",
      otp: "123456",
    })],
    ["Login OTP", () => email.sendLoginOTP({
      email: recipient,
      name: "Email Test Customer",
      otp: "654321",
    })],
    ["Password reset", () => email.sendPasswordReset({
      email: recipient,
      name: "Email Test Customer",
      resetUrl: `${appUrl}/reset-password?token=test-token`,
    })],
    ["Refund confirmation", () => email.sendRefundConfirmation({
      email: recipient,
      customerName: "Email Test Customer",
      orderNumber: sampleOrder.orderNumber,
      refundAmount: 49.99,
      reason: "Email delivery smoke test",
    })],
    ["Low stock alert", () => email.sendLowStockAlert({
      adminEmail: recipient,
      products: [{ name: "Test Product", sku: "TEST-SKU", quantity: 2, threshold: 5 }],
    })],
    ["Abandoned cart", () => email.sendAbandonedCartEmail({
      email: recipient,
      items: [{ name: "Test Product", price: 99, quantity: 1 }],
      subtotal: 99,
      recoveryUrl: `${appUrl}/cart?recover=test-token`,
    })],
    ["Contact form notification", () => email.sendContactFormNotification({
      name: "Email Test Customer",
      email: recipient,
      subject: "Email smoke test",
      message: "This is a Resend integration test message.",
      recipientEmail: recipient,
    })],
    ["Security alert", () => email.sendSecurityAlert({
      adminEmail: recipient,
      severity: "HIGH",
      title: "Email smoke test",
      message: "This verifies the security alert template.",
      ip: "127.0.0.1",
      eventType: "email_test",
      resourceId: "test-resource",
    })],
    ["Newsletter", () => email.sendNewsletterEmail({
      to: recipient,
      subject: "Email smoke test newsletter",
      previewText: "Verifies newsletter delivery",
      content: "<h2>Email smoke test</h2><p>This verifies the newsletter template.</p>",
      campaignId: "email-test",
    })],
  ];

  const results: EmailResult[] = [...configResults];

  if (!validateEmail(recipient)) {
    results.push(...tests.map(([name]) => ({
      name,
      status: "skip" as const,
      error: "No valid test recipient",
    })));
  } else {
    for (const [name, send] of tests) {
      results.push(await runEmail(name, send));
    }
  }

  const passed = results.filter((result) => result.status === "pass").length;
  const failed = results.filter((result) => result.status === "fail").length;
  const skipped = results.filter((result) => result.status === "skip").length;

  console.table(results);
  console.log(`\nResend email test summary: ${passed} passed, ${failed} failed, ${skipped} skipped.`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
