import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import JSZip from 'jszip';

// Sanitize filename: remove path traversal, special chars, only allow safe names
function sanitizeFilename(name: string): string | null {
  // Remove any path components that could escape the target directory
  const normalized = name.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(
    (p) => p && p !== '.' && p !== '..' && !p.startsWith('~')
  );
  if (parts.length === 0) return null;

  // Reconstruct safe path
  const safePath = parts.join('/');

  // Block absolute paths and any remaining traversal
  if (safePath.includes('..') || path.isAbsolute(safePath)) return null;

  // Block hidden files and overly long names
  for (const part of parts) {
    if (part.length > 255) return null;
  }

  return safePath;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Only .zip files are accepted' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Generate unique folder ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const folderId = `${timestamp}-${random}`;

    // Target extraction directory
    const interactiveDir = path.join(process.cwd(), 'public', 'interactive', folderId);
    await mkdir(interactiveDir, { recursive: true });

    // Read and parse ZIP
    const bytes = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(bytes);

    // Track total extracted size to prevent zip bombs
    let totalExtractedSize = 0;
    const maxExtractedSize = 500 * 1024 * 1024; // 500MB limit for extracted content

    // Extract files
    const entries = Object.entries(zip.files);
    let indexHtmlPath: string | null = null;

    for (const [relativePath, zipEntry] of entries) {
      if (zipEntry.dir) continue;

      const safePath = sanitizeFilename(relativePath);
      if (!safePath) {
        console.warn(`Skipping unsafe path: ${relativePath}`);
        continue;
      }

      // Extract content
      const content = await zipEntry.async('nodebuffer');

      // Check zip bomb protection
      totalExtractedSize += content.length;
      if (totalExtractedSize > maxExtractedSize) {
        return NextResponse.json(
          { error: 'Extracted content exceeds 500MB limit (possible zip bomb)' },
          { status: 400 }
        );
      }

      // Create parent directories
      const targetPath = path.join(interactiveDir, safePath);
      const targetDir = path.dirname(targetPath);

      // Verify the target is still within the extraction directory
      const resolvedTarget = path.resolve(targetPath);
      const resolvedBase = path.resolve(interactiveDir);
      if (!resolvedTarget.startsWith(resolvedBase)) {
        console.warn(`Path traversal attempt blocked: ${safePath}`);
        continue;
      }

      if (!existsSync(targetDir)) {
        await mkdir(targetDir, { recursive: true });
      }

      await writeFile(targetPath, content);

      // Track index.html location
      const lowerPath = safePath.toLowerCase();
      if (lowerPath === 'index.html' || lowerPath.endsWith('/index.html')) {
        // Prefer root-level index.html
        if (!indexHtmlPath || safePath.split('/').length < indexHtmlPath.split('/').length) {
          indexHtmlPath = safePath;
        }
      }
    }

    if (!indexHtmlPath) {
      // Clean up extracted files since there's no index.html
      const { rm } = await import('fs/promises');
      await rm(interactiveDir, { recursive: true, force: true });

      return NextResponse.json(
        { error: 'ZIP file must contain an index.html file' },
        { status: 400 }
      );
    }

    const url = `/interactive/${folderId}/${indexHtmlPath}`;

    return NextResponse.json({
      url,
      id: folderId,
      indexPath: indexHtmlPath,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('Error processing interactive upload:', error);
    return NextResponse.json(
      { error: 'Failed to process ZIP file' },
      { status: 500 }
    );
  }
}
