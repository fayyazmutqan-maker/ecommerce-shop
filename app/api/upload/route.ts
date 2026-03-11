import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  uploadToS3,
  deleteFromS3,
  getKeyFromUrl,
  generateImageKey,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  validateImageMagicBytes,
} from "@/lib/s3";

/**
 * POST /api/upload — Upload one or more images to S3.
 * Accepts multipart/form-data with field name "files".
 * Optional query param: ?folder=products (default: "uploads")
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawFolder = searchParams.get("folder") || "uploads";
    // Sanitize folder path to prevent path traversal
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) || "uploads";

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results: { url: string; key: string; name: string }[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Validate type (client-provided header)
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type (${file.type})`);
        continue;
      }

      // Validate size
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(
          `${file.name}: File too large (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`
        );
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();

      // Validate magic bytes — prevents MIME type spoofing
      const detectedType = validateImageMagicBytes(arrayBuffer);
      if (!detectedType) {
        errors.push(`${file.name}: File content does not match any allowed image type`);
        continue;
      }

      const key = generateImageKey(folder, file.name);
      const buffer = Buffer.from(arrayBuffer);
      const url = await uploadToS3(key, buffer, detectedType);

      results.push({ url, key, name: file.name });
    }

    return NextResponse.json({
      uploaded: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload — Delete an image from S3.
 * Body: { url: string } or { key: string }
 */
const ALLOWED_KEY_PREFIXES = ["products/", "uploads/", "categories/", "settings/"];

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const key = body.key || getKeyFromUrl(body.url);

    if (!key) {
      return NextResponse.json(
        { error: "No valid key or URL provided" },
        { status: 400 }
      );
    }

    // Validate key is within allowed prefixes to prevent arbitrary S3 deletion
    const isAllowed = ALLOWED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Deletion not allowed for this path" },
        { status: 403 }
      );
    }

    await deleteFromS3(key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
