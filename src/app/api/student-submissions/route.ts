import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { buildStoragePath, hasSupabaseStorageConfig, uploadBufferToStorage } from "@/lib/supabase-storage";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const studentId = formData.get("studentId") as string;
    const studentName = formData.get("studentName") as string;

    if (!file || !title || !studentId) {
      return NextResponse.json(
        { error: "file, title, and studentId are required" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name;
    const timestamp = Date.now();

    let fileUrl: string;

    if (hasSupabaseStorageConfig()) {
      // Upload to Supabase Storage
      const storagePath = buildStoragePath(`submissions/${studentId}`, `${timestamp}-${fileName}`);
      const uploaded = await uploadBufferToStorage({
        path: storagePath,
        buffer,
        contentType: file.type || "application/octet-stream",
      });
      fileUrl = uploaded.publicUrl;
    } else if (process.env.VERCEL === "1") {
      return NextResponse.json(
        { error: "Vercel requires Supabase storage configuration" },
        { status: 500 }
      );
    } else {
      // Local development fallback
      const uploadsDir = join(process.cwd(), "public/uploads", studentId);
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }
      const filePath = join(uploadsDir, `${timestamp}-${fileName}`);
      await writeFile(filePath, buffer);
      fileUrl = `/uploads/${studentId}/${timestamp}-${fileName}`;
    }

    // Create or get student user
    const student = await prisma.user.upsert({
      where: { id: studentId },
      update: {
        name: studentName || `Student ${studentId}`, // Update name if provided
      },
      create: {
        id: studentId,
        email: `student-${studentId}@local`,
        name: studentName || `Student ${studentId}`,
        password: "temp-password",
        role: "STUDENT",
        isActive: true,
      },
    });

    // Get MIME type and map to DocumentType enum
    const fileType = file.type || "application/octet-stream";
    const fileNameLower = file.name.toLowerCase();
    
    const documentType = (() => {
      const mainType = fileType.split('/')[0];
      const subType = (fileType.split('/')[1] || "").toLowerCase();
      
      // Check by MIME type first
      switch (mainType) {
        case "video":
          return "VIDEO";
        case "image":
          return "IMAGE";
        case "text":
          // Text files go to OTHER
          return "OTHER";
        case "application":
          // Handle various application MIME types
          if (subType.includes("pdf") || fileNameLower.endsWith('.pdf')) return "PDF";
          
          // Word documents
          if (subType.includes("msword") || 
              subType.includes("vnd.openxmlformats-officedocument.wordprocessingml") ||
              fileNameLower.endsWith('.doc') || fileNameLower.endsWith('.docx')) return "WORD";
          
          // PowerPoint presentations
          if (subType.includes("vnd.ms-powerpoint") || 
              subType.includes("vnd.openxmlformats-officedocument.presentationml") ||
              fileNameLower.endsWith('.ppt') || fileNameLower.endsWith('.pptx')) return "POWERPOINT";
          
          // Spreadsheets - treat as OTHER for now
          if (subType.includes("sheet") || 
              fileNameLower.endsWith('.xls') || fileNameLower.endsWith('.xlsx')) return "OTHER";
          
          // Archives
          if (subType.includes("zip") || subType.includes("rar") ||
              fileNameLower.endsWith('.zip') || fileNameLower.endsWith('.rar') || fileNameLower.endsWith('.7z')) return "OTHER";
          
          return "OTHER";
        default:
          // Fallback: try to detect by file extension
          if (fileNameLower.endsWith('.pdf')) return "PDF";
          if (fileNameLower.endsWith('.doc') || fileNameLower.endsWith('.docx')) return "WORD";
          if (fileNameLower.endsWith('.ppt') || fileNameLower.endsWith('.pptx')) return "POWERPOINT";
          if (fileNameLower.endsWith('.mp4') || fileNameLower.endsWith('.avi') || 
              fileNameLower.endsWith('.mov') || fileNameLower.endsWith('.mkv') ||
              fileNameLower.endsWith('.wmv')) return "VIDEO";
          if (fileNameLower.endsWith('.png') || fileNameLower.endsWith('.jpg') || 
              fileNameLower.endsWith('.jpeg') || fileNameLower.endsWith('.gif') ||
              fileNameLower.endsWith('.bmp') || fileNameLower.endsWith('.webp')) return "IMAGE";
          
          return "OTHER";
      }
    })();

    const fileSize = file.size;

    const submission = await prisma.document.create({
      data: {
        title,
        description: description || null,
        fileUrl,
        fileType: documentType,
        fileSize,
        authorId: student.id,
        status: "submitted",
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("Error uploading submission:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to upload submission", details: errorMessage },
      { status: 500 }
    );
  }
}
