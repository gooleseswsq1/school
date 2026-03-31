import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { buildStoragePath, hasSupabaseStorageConfig, uploadBufferToStorage } from "@/lib/supabase-storage";

// On Vercel, serverless functions have a 4.5MB body limit.
// Large videos must use presigned upload via /api/storage/sign-upload.
// This route handles small videos or acts as a fallback for local dev.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Check content-length header early to give better error message
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (process.env.VERCEL === "1" && contentLength > 4 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "Video quá lớn cho upload trực tiếp trên Vercel (giới hạn 4.5MB). Sử dụng presigned upload qua /api/storage/sign-upload.",
          usePresignedUpload: true,
        },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "File must be a video" },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 50MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (process.env.VERCEL === "1" && !hasSupabaseStorageConfig()) {
      return NextResponse.json(
        {
          error: "Vercel chua cau hinh SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY nen khong upload duoc video.",
        },
        { status: 500 }
      );
    }

    if (hasSupabaseStorageConfig()) {
      const storagePath = buildStoragePath("videos", file.name);
      const uploaded = await uploadBufferToStorage({
        path: storagePath,
        buffer,
        contentType: file.type,
      });
      return NextResponse.json({ url: uploaded.publicUrl }, { status: 200 });
    }

    // Local development fallback only.
    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        { error: "Vercel mode requires Supabase storage." },
        { status: 500 }
      );
    }

    const uploadsDir = join(process.cwd(), "public", "videos");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    const url = `/videos/${filename}`;
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Error uploading video:", error);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 }
    );
  }
}
