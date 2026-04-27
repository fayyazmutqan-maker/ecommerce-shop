export function shouldUseUnoptimizedImage(src?: string | null) {
  if (!src) return false;

  if (src.startsWith("data:image/svg+xml")) return true;
  if (src.toLowerCase().endsWith(".svg")) return true;

  try {
    return new URL(src).hostname === "placehold.co";
  } catch {
    return false;
  }
}
