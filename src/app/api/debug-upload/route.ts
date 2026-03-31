import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const uploadsDir = join(process.cwd(), "public/uploads");
    
    const listDir = (dir: string, prefix = ""): any[] => {
      try {
        const files = readdirSync(dir);
        return files.map(file => {
          const filePath = join(dir, file);
          const stat = statSync(filePath);
          return {
            name: file,
            size: stat.size,
            isDirectory: stat.isDirectory(),
            path: prefix + file,
            children: stat.isDirectory() ? listDir(filePath, prefix + file + "/") : []
          };
        });
      } catch (e) {
        return [];
      }
    };

    const files = listDir(uploadsDir);
    
    return NextResponse.json({
      uploadsDir,
      exists: files.length > 0,
      files
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
