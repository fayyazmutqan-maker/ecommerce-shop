import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
  console.warn("AWS S3 environment variables are not fully configured.");
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
