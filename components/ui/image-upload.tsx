"use client";

import { useCallback, useState } from "react";
import { Upload, X, Loader2, ImagePlus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface UploadedImage {
  url: string;
  key: string;
  name: string;
}

interface ImageUploadProps {
  /** Current list of image URLs */
  value: string[];
  /** Called whenever the image list changes */
  onChange: (urls: string[]) => void;
  /** S3 folder prefix (e.g. "products", "categories", "store") */
  folder?: string;
  /** Maximum number of images allowed */
  maxImages?: number;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Custom className for the wrapper */
  className?: string;
}

export function ImageUpload({
  value = [],
  onChange,
  folder = "uploads",
  maxImages = 10,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      if (value.length + fileArray.length > maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        fileArray.forEach((file) => formData.append("files", file));

        const res = await fetch(`/api/upload?folder=${folder}`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const data = await res.json();

        if (data.errors?.length) {
          data.errors.forEach((e: string) => toast.error(e));
        }

        if (data.uploaded?.length) {
          const newUrls = data.uploaded.map((u: UploadedImage) => u.url);
          onChange([...value, ...newUrls]);
          toast.success(
            `${data.uploaded.length} image${data.uploaded.length > 1 ? "s" : ""} uploaded`
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload images"
        );
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, folder, maxImages]
  );

  const removeImage = useCallback(
    async (url: string) => {
      try {
        await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } catch {
        // Silently continue — image may already be deleted from S3
      }
      onChange(value.filter((u) => u !== url));
    },
    [value, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || uploading) return;
      const files = e.dataTransfer.files;
      if (files.length) uploadFiles(files);
    },
    [disabled, uploading, uploadFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files?.length) uploadFiles(files);
      e.target.value = ""; // reset so same file can be re-selected
    },
    [uploadFiles]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Image Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url, idx) => (
            <div
              key={url}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={url}
                alt={`Upload ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {value.length < maxImages && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            (disabled || uploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            disabled={disabled || uploading}
            onChange={handleFileInput}
            className="sr-only"
          />
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop images here or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, WebP, GIF, AVIF up to 10MB
                </p>
              </div>
            </>
          )}
        </label>
      )}

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} of {maxImages} images · First image is the primary
          image
        </p>
      )}
    </div>
  );
}
