import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ALLOWED_MIME_TYPES,
  isAllowedMimeType,
  MAX_FILE_SIZES,
  validateFileContent,
  validateFileName,
} from "@/lib/security/file-validation";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File size should be less than 10MB",
    })
    .refine((file) => isAllowedMimeType(file.type), {
      message: `File type should be one of: ${ALLOWED_MIME_TYPES.join(", ")}`,
    }),
});

// Route segment config - increase body size limit
export const maxDuration = 30;

export const POST = withCsrf(async (request: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Schema validation (size and MIME type)
    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const rawFilename = (formData.get("file") as File).name;

    // Validate and sanitize filename
    const filenameValidation = validateFileName(rawFilename);
    if (!filenameValidation.valid) {
      return NextResponse.json(
        { error: filenameValidation.error ?? "Invalid filename" },
        { status: 400 },
      );
    }
    const filename = filenameValidation.sanitized;

    // Validate file content (magic bytes) - prevents MIME type spoofing
    const contentValidation = await validateFileContent(file, file.type);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: contentValidation.error ?? "Invalid file content" },
        { status: 400 },
      );
    }

    // Check file size against type-specific limits
    const maxSize = MAX_FILE_SIZES[file.type] ?? MAX_FILE_SIZES.default;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size for ${file.type} is ${maxSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(filename, fileBuffer, {
        access: "public",
      });

      return NextResponse.json(data);
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
});
