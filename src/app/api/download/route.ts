import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Download file API
 * Handles file downloads with proper headers and error handling
 * Supports both old path format (/uploads/filename) and new format (/uploads/studentId/filename)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let fileUrl = searchParams.get("fileUrl");
    const fileName = searchParams.get("fileName");

    if (!fileUrl) {
      return NextResponse.json(
        { error: "fileUrl is required" },
        { status: 400 }
      );
    }

    // Normalize the path - remove leading slashes and decode
    if (fileUrl.startsWith("/")) {
      fileUrl = fileUrl.substring(1);
    }
    
    // Remove "uploads/" prefix if present (since uploadsDir already includes it)
    if (fileUrl.startsWith("uploads/")) {
      fileUrl = fileUrl.substring(8); // length of "uploads/"
    }

    // Try multiple path variations
    const uploadsDir = join(process.cwd(), "public", "uploads");
    let filePath = join(uploadsDir, fileUrl);

    // If file doesn't exist with the current path, try alternative paths
    if (!existsSync(filePath)) {
      // Try decoding URL if encoded
      const decodedUrl = decodeURIComponent(fileUrl);
      if (decodedUrl !== fileUrl) {
        filePath = join(uploadsDir, decodedUrl);
        if (!existsSync(filePath)) {
          // If still not found, try removing leading parts
          const fileName = decodedUrl.split("/").pop();
          if (fileName) {
            // Search in old format (direct in uploads folder)
            filePath = join(uploadsDir, fileName);
          }
        }
      }
    }

    console.log("Download request:", {
      requestedUrl: fileUrl,
      resolvedPath: filePath,
      exists: existsSync(filePath),
    });

    // Security: Ensure file is within public/uploads directory
    const normalizedPath = filePath.toLowerCase().replace(/\\/g, "/");
    const normalizedUploadsDir = uploadsDir.toLowerCase().replace(/\\/g, "/");

    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      console.error("Access denied:", { filePath, uploadsDir });
      return NextResponse.json(
        { error: "Access denied", detail: "Path outside uploads directory" },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return NextResponse.json(
        {
          error: "File not found",
          path: filePath,
          requested: fileUrl,
        },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine MIME type
    const extension = filePath.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      bmp: "image/bmp",
      webp: "image/webp",
      zip: "application/zip",
      rar: "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
      mp4: "video/mp4",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      mkv: "video/x-matroska",
      wmv: "video/x-ms-wmv",
    };

    const mimeType = mimeTypes[extension] || "application/octet-stream";

    // Create filename for download
    let downloadName = fileName || filePath.split("/").pop() || "download";
    
    // Decode filename if it's URL encoded
    try {
      downloadName = decodeURIComponent(downloadName);
    } catch (e) {
      // If decode fails, use as is
    }

    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      {
        error: "Failed to download file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
