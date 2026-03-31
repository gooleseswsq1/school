// src/utils/wmf-converter.ts
// WMF (Windows Metafile) → PNG conversion pipeline
// Used during Word file import to convert math equations to displayable format

import { writeFile, unlink, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'exam-images');

/** Ensure the upload directory exists */
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Check if LibreOffice is available on the system
 */
async function findLibreOffice(): Promise<string | null> {
  const candidates = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ];

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }

  // Try PATH
  try {
    await execFileAsync('soffice', ['--version']);
    return 'soffice';
  } catch {
    return null;
  }
}

/**
 * Convert a WMF base64 data URI to PNG base64 data URI using LibreOffice
 */
async function convertWmfWithLibreOffice(
  wmfBase64: string,
  libreOfficePath: string
): Promise<string | null> {
  await ensureUploadDir();
  const id = randomBytes(8).toString('hex');
  const tmpWmf = join(UPLOAD_DIR, `tmp_${id}.wmf`);
  const tmpPng = join(UPLOAD_DIR, `tmp_${id}.png`);

  try {
    // Extract base64 data (strip data URI prefix)
    const base64Data = wmfBase64.replace(/^data:image\/[^;]+;base64,/, '');
    await writeFile(tmpWmf, Buffer.from(base64Data, 'base64'));

    // Convert using LibreOffice headless
    await execFileAsync(libreOfficePath, [
      '--headless',
      '--convert-to', 'png',
      '--outdir', UPLOAD_DIR,
      tmpWmf,
    ], { timeout: 15000 });

    // Read converted PNG
    if (existsSync(tmpPng)) {
      const pngBuffer = await readFile(tmpPng);
      const pngBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
      return pngBase64;
    }
    return null;
  } catch (err) {
    console.warn('[wmf-converter] LibreOffice conversion failed:', err);
    return null;
  } finally {
    // Cleanup temp files
    try { await unlink(tmpWmf); } catch {}
    try { await unlink(tmpPng); } catch {}
  }
}

/**
 * Save a WMF image as a file for later manual conversion
 * Returns a URL path relative to /public
 */
async function saveWmfForLater(wmfBase64: string): Promise<string> {
  await ensureUploadDir();
  const id = randomBytes(8).toString('hex');
  const filename = `wmf_${id}.wmf`;
  const filepath = join(UPLOAD_DIR, filename);

  const base64Data = wmfBase64.replace(/^data:image\/[^;]+;base64,/, '');
  await writeFile(filepath, Buffer.from(base64Data, 'base64'));

  return `/uploads/exam-images/${filename}`;
}

/**
 * Convert a WMF file to PNG using Windows GDI+ (System.Drawing) via PowerShell.
 * This works on Windows without needing LibreOffice.
 */
async function convertWmfWithGdiPlus(wmfBase64: string): Promise<string | null> {
  // Only works on Windows
  if (process.platform !== 'win32') return null;

  await ensureUploadDir();
  const id = randomBytes(8).toString('hex');
  const tmpWmf = join(UPLOAD_DIR, `tmp_${id}.wmf`);
  const tmpPng = join(UPLOAD_DIR, `tmp_${id}.png`);

  try {
    const base64Data = wmfBase64.replace(/^data:image\/[^;]+;base64,/, '');
    await writeFile(tmpWmf, Buffer.from(base64Data, 'base64'));

    // PowerShell script using System.Drawing to convert WMF → PNG
    const psScript = `
Add-Type -AssemblyName System.Drawing
try {
  $img = [System.Drawing.Image]::FromFile('${tmpWmf.replace(/\\/g, '\\\\')}')
  $w = [Math]::Max($img.Width, 1)
  $h = [Math]::Max($img.Height, 1)
  $scale = 2.0
  $bmp = New-Object System.Drawing.Bitmap([int]($w * $scale), [int]($h * $scale))
  $bmp.SetResolution(192, 192)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawImage($img, 0, 0, [int]($w * $scale), [int]($h * $scale))
  $bmp.Save('${tmpPng.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  $img.Dispose()
  Write-Output 'OK'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}`;

    await execAsync(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"')}"`, {
      timeout: 10000,
    });

    if (existsSync(tmpPng)) {
      const pngBuffer = await readFile(tmpPng);
      return `data:image/png;base64,${pngBuffer.toString('base64')}`;
    }
    return null;
  } catch (err) {
    // Silently fail — will use placeholder
    return null;
  } finally {
    try { await unlink(tmpWmf); } catch {}
    try { await unlink(tmpPng); } catch {}
  }
}

/**
 * Batch convert multiple WMF images to PNG using a single PowerShell invocation.
 * Much faster than converting one at a time (avoids spawning 100+ processes).
 * Returns a Map from index → PNG base64 data URI (only for successful conversions).
 */
export async function batchConvertWmfImages(
  wmfImages: { index: number; base64: string }[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  if (wmfImages.length === 0) return result;
  if (process.platform !== 'win32') return result;

  await ensureUploadDir();
  const batchId = randomBytes(6).toString('hex');

  // Write all WMF files to disk
  const entries: { index: number; wmfPath: string; pngPath: string }[] = [];
  for (const item of wmfImages) {
    const wmfPath = join(UPLOAD_DIR, `batch_${batchId}_${item.index}.wmf`);
    const pngPath = join(UPLOAD_DIR, `batch_${batchId}_${item.index}.png`);
    const base64Data = item.base64.replace(/^data:image\/[^;]+;base64,/, '');
    await writeFile(wmfPath, Buffer.from(base64Data, 'base64'));
    entries.push({ index: item.index, wmfPath, pngPath });
  }

  try {
    // Build a PowerShell script that converts ALL WMF files in one process
    const conversions = entries.map(e => {
      const wmf = e.wmfPath.replace(/\\/g, '\\\\');
      const png = e.pngPath.replace(/\\/g, '\\\\');
      return `
try {
  $img = [System.Drawing.Image]::FromFile('${wmf}')
  $w = [Math]::Max($img.Width, 1); $h = [Math]::Max($img.Height, 1)
  $s = 2.0
  $bmp = New-Object System.Drawing.Bitmap([int]($w*$s),[int]($h*$s))
  $bmp.SetResolution(192,192)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawImage($img,0,0,[int]($w*$s),[int]($h*$s))
  $bmp.Save('${png}',[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
} catch {}`;
    }).join('\n');

    const psScript = `Add-Type -AssemblyName System.Drawing\n${conversions}`;
    const scriptPath = join(UPLOAD_DIR, `batch_${batchId}.ps1`);
    await writeFile(scriptPath, psScript);

    await execAsync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { timeout: Math.max(30000, wmfImages.length * 500) }
    );

    // Read converted PNGs
    for (const e of entries) {
      if (existsSync(e.pngPath)) {
        const pngBuffer = await readFile(e.pngPath);
        if (pngBuffer.length > 0) {
          result.set(e.index, `data:image/png;base64,${pngBuffer.toString('base64')}`);
        }
      }
    }

    console.log(`[wmf-converter] Batch GDI+ conversion: ${result.size}/${wmfImages.length} successful`);

    // Cleanup script
    try { await unlink(scriptPath); } catch {}
  } catch (err) {
    console.warn('[wmf-converter] Batch GDI+ conversion failed:', err);
  } finally {
    // Cleanup all temp files
    for (const e of entries) {
      try { await unlink(e.wmfPath); } catch {}
      try { await unlink(e.pngPath); } catch {}
    }
  }

  return result;
}

/**
 * Create a placeholder PNG with text indicating a formula that needs conversion
 * Returns a base64 data URI of a simple SVG rendered as data URI
 */
function createPlaceholderSvg(index: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="32" viewBox="0 0 200 32">
    <rect width="200" height="32" rx="4" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1"/>
    <text x="100" y="20" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#92400E">
      [Công thức ${index + 1}]
    </text>
  </svg>`;
  const encoded = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Result of WMF conversion attempt
 */
export interface WmfConversionResult {
  /** The displayable image (PNG base64 or placeholder SVG) */
  displaySrc: string;
  /** Original WMF saved to disk (URL path) for later conversion */
  wmfPath?: string;
  /** Whether actual conversion succeeded */
  converted: boolean;
}

/** Cache LibreOffice path check result */
let libreOfficeCache: string | null | undefined;

/**
 * Convert a WMF data URI to a displayable format.
 * Tries: LibreOffice → Windows GDI+ → placeholder SVG.
 */
export async function convertWmfImage(
  wmfBase64: string,
  imageIndex: number
): Promise<WmfConversionResult> {
  // Check LibreOffice availability (cached)
  if (libreOfficeCache === undefined) {
    libreOfficeCache = await findLibreOffice();
    if (libreOfficeCache) {
      console.log(`[wmf-converter] Found LibreOffice at: ${libreOfficeCache}`);
    } else {
      console.warn('[wmf-converter] LibreOffice not found. Will try Windows GDI+ fallback.');
    }
  }

  // Save original WMF for later manual conversion
  const wmfPath = await saveWmfForLater(wmfBase64);

  // Try LibreOffice conversion
  if (libreOfficeCache) {
    const pngBase64 = await convertWmfWithLibreOffice(wmfBase64, libreOfficeCache);
    if (pngBase64) {
      return { displaySrc: pngBase64, wmfPath, converted: true };
    }
  }

  // Try Windows GDI+ conversion (System.Drawing via PowerShell)
  if (process.platform === 'win32') {
    const pngBase64 = await convertWmfWithGdiPlus(wmfBase64);
    if (pngBase64) {
      return { displaySrc: pngBase64, wmfPath, converted: true };
    }
  }

  // Fallback: SVG placeholder
  return {
    displaySrc: createPlaceholderSvg(imageIndex),
    wmfPath,
    converted: false,
  };
}

/**
 * Check if a data URI is a WMF/EMF image
 */
export function isWmfImage(src: string): boolean {
  return /^data:image\/(x-wmf|wmf|x-emf|emf);base64,/i.test(src);
}

/**
 * Check if a data URI is a browser-displayable image
 */
export function isDisplayableImage(src: string): boolean {
  return /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,/i.test(src);
}
