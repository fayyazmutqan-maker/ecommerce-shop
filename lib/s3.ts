import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("AWS S3 environment variables (AWS_REGION, AWS_S3_BUCKET) are required in production.");
  }
  console.warn("AWS S3 environment variables are not fully configured. Uploads will fail.");
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const S3_BUCKET = process.env.AWS_S3_BUCKET!;

/**
 * Generate a presigned URL for direct client-side upload.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300
) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Upload a file buffer directly from the server.
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3Client.send(command);
  return getPublicUrl(key);
}

/**
 * Delete an object from S3 by its key.
 */
export async function deleteFromS3(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  await s3Client.send(command);
}

/**
 * Get the public URL for an S3 object.
 */
export function getPublicUrl(key: string) {
  return `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Extract the S3 key from a full S3 URL.
 */
export function getKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Handle path-style: https://bucket.s3.region.amazonaws.com/key
    if (u.hostname.includes("amazonaws.com")) {
      return decodeURIComponent(u.pathname.slice(1)); // remove leading /
    }
    return null;
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
 * Generate a unique S3 key for an upload.
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
