import { createHmac } from "crypto";
import { existsSync, readFileSync } from "fs";
import {
  buildTapWebhookHashString,
  createTapCharge,
  createTapRefund,
  getTapSecretKeyMode,
  mapTapStatus,
  retrieveTapCharge,
  verifyTapWebhookSignature,
} from "../lib/tap";

type TapListError = {
  errors?: { code?: string; description?: string }[];
  http_code?: string;
};

type TestResult = {
  name: string;
  status: "pass" | "fail" | "skip";
  details?: Record<string, unknown>;
};

const TAP_API_BASE = "https://api.tap.company/v2";

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

    process.env[key] ??= value;
  }
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function randomId() {
  return Math.random().toString(36).slice(2, 12);
}

function printResult(result: TestResult) {
  const icon = result.status === "pass" ? "PASS" : result.status === "skip" ? "SKIP" : "FAIL";
  const details = result.details ? ` ${JSON.stringify(result.details)}` : "";
  console.log(`${icon} ${result.name}${details}`);
}

async function record(results: TestResult[], result: TestResult) {
  results.push(result);
  printResult(result);
}

function parsePositiveAmount(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${value}`);
  }
  return amount;
}

async function listCharges(secretKey: string): Promise<{
  status: number;
  ok: boolean;
  noCharges: boolean;
  body: unknown;
}> {
  const now = Date.now();
  const response = await fetch(`${TAP_API_BASE}/charges/list`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      period: {
        date: {
          from: now - 24 * 60 * 60 * 1000,
          to: now,
        },
      },
      limit: 1,
    }),
  });

  const body = await response.json().catch(() => ({}));
  const tapError = body as TapListError;
  const noCharges = tapError.errors?.some((error) => error.code === "1249") ?? false;

  return {
    status: response.status,
    ok: response.ok || noCharges,
    noCharges,
    body,
  };
}

async function main() {
  loadDotEnv();

  const results: TestResult[] = [];
  const secretKey = process.env.TAP_SECRET_KEY;
  const publicKey = process.env.TAP_PUBLIC_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const amount = parsePositiveAmount(getArg("amount"), 1);
  const refundAmount = parsePositiveAmount(getArg("refund-amount"), amount);
  const currency = (getArg("currency") || "SAR").toUpperCase();
  const capturedChargeId = getArg("captured-charge-id");
  const allowLive = hasFlag("allow-live");
  const confirmRefund = hasFlag("confirm-refund");
  const skipCreate = hasFlag("skip-create");

  if (!secretKey) {
    await record(results, {
      name: "TAP_SECRET_KEY configured",
      status: "fail",
      details: { message: "Set TAP_SECRET_KEY in .env or the process environment." },
    });
    process.exitCode = 1;
    return;
  }

  const secretMode = getTapSecretKeyMode(secretKey);
  const publicMode = publicKey?.startsWith("pk_test_")
    ? "test"
    : publicKey?.startsWith("pk_live_")
      ? "live"
      : publicKey
        ? "unknown"
        : "missing";

  await record(results, {
    name: "Tap environment variables",
    status: secretMode !== "unknown" && publicMode !== "unknown" ? "pass" : "fail",
    details: {
      secretKeyMode: secretMode,
      publicKeyMode: publicMode,
      appUrl,
    },
  });

  if (secretMode === "unknown") {
    process.exitCode = 1;
    return;
  }

  if (secretMode === "live" && !allowLive) {
    await record(results, {
      name: "Live mode guard",
      status: "fail",
      details: { message: "Live keys require --allow-live." },
    });
    process.exitCode = 1;
    return;
  }

  const list = await listCharges(secretKey);
  await record(results, {
    name: "Tap charges/list connection",
    status: list.ok ? "pass" : "fail",
    details: {
      httpStatus: list.status,
      noChargesInPeriod: list.noCharges,
    },
  });

  if (!list.ok) {
    process.exitCode = 1;
    return;
  }

  let chargeId = capturedChargeId;
  if (skipCreate) {
    await record(results, {
      name: "Create Tap charge",
      status: "skip",
      details: { message: "Skipped by --skip-create." },
    });
  } else {
    const id = randomId();
    const charge = await createTapCharge(secretKey, {
      amount,
      currency,
      description: `Tap smoke test ${id}`,
      reference: {
        transaction: `txn_test_${id}`,
        order: `TEST-${id}`,
        idempotent: `tap_smoke_${id}`,
      },
      receipt: {
        email: false,
        sms: false,
      },
      customer: {
        first_name: "Tap",
        last_name: "Tester",
        email: "tap-test@example.com",
        phone: {
          country_code: "966",
          number: "500000000",
        },
      },
      source: {
        id: "src_all",
      },
      redirect: {
        url: `${appUrl}/api/payments/callback?order_id=tap-smoke-${id}`,
      },
      post: {
        url: `${appUrl}/api/payments/webhook`,
      },
      metadata: {
        order_id: `tap-smoke-${id}`,
        order_number: `TEST-${id}`,
        source: "tap_smoke_test",
      },
    });

    chargeId = charge.id;
    await record(results, {
      name: "Create Tap charge",
      status: "pass",
      details: {
        chargeId: charge.id,
        tapStatus: charge.status,
        amount: charge.amount,
        currency: charge.currency,
        paymentUrlReturned: Boolean(charge.transaction?.url),
      },
    });
  }

  if (!chargeId) {
    await record(results, {
      name: "Retrieve Tap charge",
      status: "skip",
      details: { message: "No charge ID available. Pass --captured-charge-id or allow charge creation." },
    });
  } else {
    const retrieved = await retrieveTapCharge(secretKey, chargeId);
    await record(results, {
      name: "Retrieve Tap charge",
      status: "pass",
      details: {
        chargeId: retrieved.id,
        tapStatus: retrieved.status,
        appPaymentStatus: mapTapStatus(retrieved.status),
        amount: retrieved.amount,
        currency: retrieved.currency,
        responseCode: retrieved.response?.code,
        responseMessage: retrieved.response?.message,
        paymentUrlReturned: Boolean(retrieved.transaction?.url),
      },
    });

    const webhookPayload = {
      id: retrieved.id,
      amount: retrieved.amount,
      currency: retrieved.currency,
      status: retrieved.status,
      transaction: {
        created: retrieved.transaction?.created,
      },
      reference: {
        gateway: "",
        payment: "",
      },
    };
    const hash = createHmac("sha256", secretKey)
      .update(buildTapWebhookHashString(webhookPayload))
      .digest("hex");

    await record(results, {
      name: "Webhook HMAC verification",
      status:
        verifyTapWebhookSignature(secretKey, webhookPayload, hash) &&
        !verifyTapWebhookSignature(secretKey, { ...webhookPayload, status: "FAILED" }, hash)
          ? "pass"
          : "fail",
      details: { validSignatureAccepted: true, tamperedPayloadRejected: true },
    });
  }

  if (!capturedChargeId) {
    await record(results, {
      name: "Create Tap refund",
      status: "skip",
      details: {
        message:
          "Refund requires a captured charge. Re-run with --captured-charge-id=chg_... --confirm-refund.",
      },
    });
  } else if (!confirmRefund) {
    await record(results, {
      name: "Create Tap refund",
      status: "skip",
      details: { message: "Refund skipped. Add --confirm-refund to execute it." },
    });
  } else {
    const refund = await createTapRefund(
      secretKey,
      capturedChargeId,
      refundAmount,
      currency,
      "Tap smoke test refund",
      {
        idempotent: `tap_refund_smoke_${randomId()}`,
        postUrl: `${appUrl}/api/payments/webhook`,
        metadata: {
          source: "tap_smoke_test",
          refund_key: `tap_refund_smoke_${randomId()}`,
        },
      },
    );

    await record(results, {
      name: "Create Tap refund",
      status: "pass",
      details: {
        refundId: refund.id,
        tapStatus: refund.status,
        amount: refund.amount,
        currency: refund.currency,
      },
    });
  }

  const failed = results.filter((result) => result.status === "fail");
  const skipped = results.filter((result) => result.status === "skip");

  console.log("");
  console.log(
    `Tap smoke test complete: ${results.length - failed.length - skipped.length} passed, ${skipped.length} skipped, ${failed.length} failed.`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("FAIL Tap smoke test crashed", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
