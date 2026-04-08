import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are required in production.");
  }
  console.warn("Cloudinary environment variables are not fully configured. Uploads will fail.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export { cloudinary };

/**
 * Upload a file buffer directly from the server.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadToCloudinary(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const base64 = buffer.toString("base64");
  const dataUri = `data:${contentType};base64,${base64}`;

  // Use the key (without extension) as the public_id, folder is derived from key
  const parts = key.split("/");
  const folder = parts.slice(0, -1).join("/") || "uploads";
  const filename = parts[parts.length - 1].replace(/\.[^/.]+$/, "");

  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: filename,
    folder,
    resource_type: "image",
    overwrite: true,
  });

  return result.secure_url;
}

/**
 * Delete an image from Cloudinary by its key (public_id with folder).
 */
export async function deleteFromCloudinary(key: string): Promise<void> {
  // key format: "folder/timestamp-random.ext" → public_id: "folder/timestamp-random"
  const publicId = key.replace(/\.[^/.]+$/, "");
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

/**
 * Get the public URL for a Cloudinary image by key.
 */
export function getPublicUrl(key: string): string {
  const publicId = key.replace(/\.[^/.]+$/, "");
  return cloudinary.url(publicId, { secure: true });
}

/**
 * Extract the Cloudinary public_id from a Cloudinary URL.
 */
export function getKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("cloudinary.com") && !u.hostname.includes("res.cloudinary.com")) {
      return null;
    }
    // Cloudinary URL format: https://res.cloudinary.com/<cloud>/image/upload/v<version>/<public_id>.<ext>
    const match = u.pathname.match(/\/image\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Allowed image MIME types and max file size.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Magic bytes for allowed image types.
 * Verifies the actual file content matches the claimed MIME type.
 */
const IMAGE_MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
  { mime: "image/avif", bytes: [] }, // AVIF uses ftyp box — checked separately
];

/**
 * Validate file content matches an allowed image type by inspecting magic bytes.
 * Returns the detected MIME type, or null if the file doesn't match any allowed type.
 */
export function validateImageMagicBytes(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer).slice(0, 16);
  if (bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // AVIF: ftyp box with 'avif' or 'avis' brand (offset 4-8 = 'ftyp', offset 8-12 = brand)
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
    ((bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && (bytes[11] === 0x66 || bytes[11] === 0x73)))
  ) {
    return "image/avif";
  }

  return null;
}

/**
 * Generate a unique key for an upload.
 */
export function generateImageKey(
  folder: string,
  filename: string
): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${folder}/${timestamp}-${random}.${ext}`;
}
