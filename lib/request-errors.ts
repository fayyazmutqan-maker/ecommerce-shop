export function isRequestAbortedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const code = "code" in error ? String((error as Error & { code?: unknown }).code) : "";
  return code === "ECONNRESET" || error.name === "AbortError" || error.message.toLowerCase() === "aborted";
}
