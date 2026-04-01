"use client";

import { useState, useRef, useCallback } from "react";
import { Code, Upload, Link, Trash2, ExternalLink, Loader2, X, Maximize2, Minimize2, Globe } from "lucide-react";
import toast from "react-hot-toast";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";

// ─── Platform Detection ─────────────────────────────────────
const EMBED_PLATFORMS: { pattern: RegExp; label: string; icon: string; color: string }[] = [
  { pattern: /youtube\.com|youtu\.be/i, label: "YouTube", icon: "▶", color: "bg-red-100 text-red-700" },
  { pattern: /docs\.google\.com/i, label: "Google Docs", icon: "📄", color: "bg-blue-100 text-blue-700" },
  { pattern: /figma\.com/i, label: "Figma", icon: "🎨", color: "bg-purple-100 text-purple-700" },
  { pattern: /canva\.com/i, label: "Canva", icon: "🖌", color: "bg-cyan-100 text-cyan-700" },
  { pattern: /genial\.ly|genially\.com/i, label: "Genially", icon: "✨", color: "bg-orange-100 text-orange-700" },
  { pattern: /padlet\.com/i, label: "Padlet", icon: "📌", color: "bg-pink-100 text-pink-700" },
  { pattern: /notion\.site|notion\.so/i, label: "Notion", icon: "📝", color: "bg-gray-100 text-gray-700" },
  { pattern: /quizlet\.com/i, label: "Quizlet", icon: "🗂", color: "bg-indigo-100 text-indigo-700" },
  { pattern: /miro\.com/i, label: "Miro", icon: "📋", color: "bg-yellow-100 text-yellow-700" },
  { pattern: /codepen\.io/i, label: "CodePen", icon: "⚡", color: "bg-gray-100 text-gray-800" },
  { pattern: /loom\.com/i, label: "Loom", icon: "🎥", color: "bg-purple-100 text-purple-700" },
  { pattern: /vimeo\.com/i, label: "Vimeo", icon: "🎬", color: "bg-sky-100 text-sky-700" },
  { pattern: /wordwall\.net/i, label: "Wordwall", icon: "🧩", color: "bg-green-100 text-green-700" },
  { pattern: /quizizz\.com/i, label: "Quizizz", icon: "❓", color: "bg-violet-100 text-violet-700" },
  { pattern: /kahoot/i, label: "Kahoot", icon: "🎯", color: "bg-green-100 text-green-700" },
  { pattern: /scratch\.mit\.edu/i, label: "Scratch", icon: "🐱", color: "bg-orange-100 text-orange-700" },
  { pattern: /prezi\.com/i, label: "Prezi", icon: "🎪", color: "bg-blue-100 text-blue-700" },
  { pattern: /tinkercad\.com/i, label: "Tinkercad", icon: "🔧", color: "bg-teal-100 text-teal-700" },
  { pattern: /codesandbox\.io/i, label: "CodeSandbox", icon: "📦", color: "bg-gray-100 text-gray-700" },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function sanitizeZipPath(name: string): string | null {
  const normalized = name.replace(/\\/g, "/");
  const parts = normalized.split("/").filter((p) => p && p !== "." && p !== ".." && !p.startsWith("~"));
  if (parts.length === 0) return null;
  return parts.join("/");
}

function contentTypeByName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  if (lower.endsWith(".js")) return "text/javascript";
  if (lower.endsWith(".css")) return "text/css";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  return "application/octet-stream";
}

function detectPlatform(url: string): { label: string; icon: string; color: string } | null {
  for (const p of EMBED_PLATFORMS) {
    if (p.pattern.test(url)) return { label: p.label, icon: p.icon, color: p.color };
  }
  return null;
}

/** Convert URL to embeddable format */
function toEmbedUrl(url: string): string {
  // YouTube
  const ytWatch = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}?rel=0`;
  const ytShort = url.match(/youtu\.be\/([\w-]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}?rel=0`;

  // Google Docs/Slides/Sheets
  if (/docs\.google\.com\/(document|presentation|spreadsheets)/.test(url)) {
    return url.replace(/\/(edit|view)(.*)?$/, "/preview");
  }

  // Loom
  const loom = url.match(/loom\.com\/share\/([\w]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;

  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // Canva Design
  if (/canva\.com\/design\//.test(url)) {
    const cleanUrl = url.replace(/\?.*$/, '');
    return cleanUrl.endsWith('/view') ? `${cleanUrl}?embed` : `${cleanUrl}/view?embed`;
  }

  // Padlet
  if (/padlet\.com/.test(url)) {
    return url.includes('/embed') ? url : url.replace(/(padlet\.com\/[^\/]+\/[^\/]+)/, '$1/embed');
  }

  // Quizlet
  if (/quizlet\.com/.test(url)) {
    return url.includes('/embed') ? url : url.replace(/\/?$/, '/embed');
  }

  // Scratch
  const scratch = url.match(/scratch\.mit\.edu\/projects\/(\d+)/);
  if (scratch) return `https://scratch.mit.edu/projects/${scratch[1]}/embed`;

  // Prezi
  if (/prezi\.com\/p\//.test(url)) {
    return url.includes('/embed') ? url : url.replace(/\/?$/, '/embed/');
  }

  return url;
}

/** Platforms that need allow-same-origin in sandbox */
function getSandboxPolicy(url: string): string {
  // Supabase-hosted interactive HTML5 packages need full permissions to run JS, load assets, use storage
  const isSupabaseInteractive = /supabase\.co\/storage\/v1\/object.*\/interactive\//i;
  if (isSupabaseInteractive.test(url)) {
    return "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-modals allow-downloads allow-pointer-lock";
  }
  // Some platforms need same-origin to function
  const needsSameOrigin = /notion\.site|notion\.so|padlet\.com|genial\.ly|genially\.com|quizlet\.com|supabase\.co\/storage\/v1\/object/i;
  if (needsSameOrigin.test(url)) {
    return "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-modals allow-downloads";
  }
  return "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals";
}

interface EmbedBlockComponentProps {
  id: string;
  content?: string;
  onUpdate: (data: { content: string }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  readOnly?: boolean;
}

export default function EmbedBlockComponent({
  id,
  content,
  onUpdate,
  onDelete,
  readOnly = false,
}: EmbedBlockComponentProps) {
  const [embedUrl, setEmbedUrl] = useState(content || "");
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadZip = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Chỉ chấp nhận file .zip");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File quá lớn (tối đa 100MB)");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Preferred path for Vercel: unzip in browser and upload files directly to Supabase.
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        const loadingId = toast.loading("Đang xử lý file ZIP...");
        const zipBytes = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(zipBytes);
        const entries = Object.entries(zip.files).filter(([, z]) => !z.dir);

        if (entries.length === 0) {
          toast.dismiss(loadingId);
          throw new Error("ZIP rỗng hoặc không có file hợp lệ");
        }

        const folderId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const safeEntries = entries
          .map(([relativePath]) => sanitizeZipPath(relativePath))
          .filter((p): p is string => Boolean(p));
        const indexCandidates = safeEntries.filter((p) => {
          const lower = p.toLowerCase();
          return lower === "index.html" || lower.endsWith("/index.html");
        });
        const indexPath = indexCandidates.sort((a, b) => a.split("/").length - b.split("/").length)[0] || null;
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        let indexPublicUrl: string | null = null;

        for (let i = 0; i < entries.length; i++) {
          const [relativePath, zipEntry] = entries[i];
          const safePath = sanitizeZipPath(relativePath);
          if (!safePath) continue;

          const signRes = await fetch("/api/storage/sign-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: `interactive/${folderId}/${safePath}`, upsert: true }),
          });
          if (!signRes.ok) {
            const e = await signRes.json().catch(() => ({}));
            throw new Error(e?.error || "Không tạo được signed upload URL");
          }

          const signed = await signRes.json();
          // Ensure the Blob has the correct MIME type so the browser's fetch sends the correct Content-Type header
          const arrayBuffer = await zipEntry.async("arraybuffer");
          const mimeType = contentTypeByName(safePath);
          const typedBlob = new Blob([arrayBuffer], { type: mimeType });

          const { error } = await supabase.storage
            .from(signed.bucket)
            .uploadToSignedUrl(signed.path, signed.token, typedBlob, {
              contentType: mimeType,
            });

          if (error) {
            // Skip "already exists" errors — file is already uploaded (retry safe)
            if (!error.message?.toLowerCase().includes('already exists')) {
              throw new Error(error.message || `Upload thất bại: ${safePath}`);
            }
          }

          if (indexPath && safePath === indexPath && signed.publicUrl) {
            indexPublicUrl = signed.publicUrl;
          }

          const pct = 20 + Math.round(((i + 1) / entries.length) * 75);
          setUploadProgress(Math.min(98, pct));
        }

        if (!indexPath) {
          toast.dismiss(loadingId);
          throw new Error("ZIP phải chứa file index.html");
        }

        const finalPublicUrl = indexPublicUrl || `${SUPABASE_URL}/storage/v1/object/public/school-files/interactive/${folderId}/${indexPath}`;
        setUploadProgress(100);
        setEmbedUrl(finalPublicUrl);
        await onUpdate({ content: finalPublicUrl });
        toast.dismiss(loadingId);
        toast.success("Tải ZIP lên Supabase thành công!");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(30);

      const response = await fetch("/api/interactive/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setUploadProgress(100);
      setEmbedUrl(data.url);
      await onUpdate({ content: data.url });
      toast.success("Tải lên và giải nén thành công!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Lỗi khi tải file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUpdate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUploadZip(file);
  }, [handleUploadZip]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadZip(file);
    if (e.target) e.target.value = "";
  }, [handleUploadZip]);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) {
      toast.error("Vui lòng nhập URL");
      return;
    }
    const rawUrl = urlInput.trim();
    const finalUrl = toEmbedUrl(rawUrl);
    const platform = detectPlatform(rawUrl);
    setEmbedUrl(finalUrl);
    await onUpdate({ content: finalUrl });
    toast.success(platform ? `Đã nhúng ${platform.label} thành công!` : "Đã nhúng URL thành công!");
  }, [urlInput, onUpdate]);

  const handleRemoveEmbed = useCallback(async () => {
    setEmbedUrl("");
    await onUpdate({ content: "" });
  }, [onUpdate]);

  // ─── Read-only mode ────────────────────────────────────────
  if (readOnly && embedUrl) {
    const platform = detectPlatform(embedUrl);
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200">
        {platform && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${platform.color}`}>
              {platform.icon} {platform.label}
            </span>
          </div>
        )}
        <iframe
          src={embedUrl}
          className="w-full border-0"
          style={{ height: isExpanded ? "80vh" : "500px" }}
          sandbox={getSandboxPolicy(embedUrl)}
          title="Embedded content"
        />
      </div>
    );
  }

  // ─── Has embed URL – show preview ──────────────────────────
  if (embedUrl) {
    const platform = detectPlatform(embedUrl);
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code size={18} className="text-green-600" />
            <span className="text-sm font-medium text-gray-700">Nội dung nhúng</span>
            {platform && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${platform.color}`}>
                {platform.icon} {platform.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              title={isExpanded ? "Thu nhỏ" : "Phóng to"}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition"
              title="Mở trong tab mới"
            >
              <ExternalLink size={16} />
            </a>
            {!readOnly && (
              <>
                <button
                  onClick={handleRemoveEmbed}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title="Xóa nhúng"
                >
                  <X size={16} />
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete()}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                    title="Xóa block"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* URL display */}
        <div className="text-xs text-gray-400 truncate px-1">{embedUrl}</div>

        {/* Iframe preview */}
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
          <iframe
            src={embedUrl}
            className="w-full border-0"
            style={{ height: isExpanded ? "80vh" : "450px" }}
            sandbox={getSandboxPolicy(embedUrl)}
            title="Embedded content preview"
          />
        </div>
      </div>
    );
  }

  // ─── Empty state – upload or paste URL ─────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code size={18} className="text-green-600" />
          <span className="text-sm font-medium text-gray-700">Nhúng nội dung</span>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete()}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
            title="Xóa block"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setMode("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
            mode === "upload"
              ? "bg-white text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Upload size={14} />
          Tải file ZIP
        </button>
        <button
          onClick={() => setMode("url")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
            mode === "url"
              ? "bg-white text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Link size={14} />
          Nhúng URL
        </button>
      </div>

      {/* Upload mode */}
      {mode === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragOver
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-green-400 hover:bg-green-50/50"
            }
            ${isUploading ? "pointer-events-none opacity-70" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-3">
              <Loader2 size={32} className="mx-auto text-green-500 animate-spin" />
              <p className="text-sm text-gray-600">Đang tải lên và giải nén...</p>
              <div className="w-48 mx-auto bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={32} className="mx-auto text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                Kéo thả file ZIP vào đây hoặc nhấn để chọn
              </p>
              <p className="text-xs text-gray-400">
                File ZIP chứa index.html sẽ được tự động giải nén và nhúng • Tối đa 100MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* URL mode */}
      {mode === "url" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              placeholder="https://example.com/interactive/lesson"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={handleUrlSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
            >
              Nhúng
            </button>
          </div>

          {/* Auto-detect platform badge */}
          {urlInput.trim() && detectPlatform(urlInput.trim()) && (
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-gray-400" />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${detectPlatform(urlInput.trim())!.color}`}>
                {detectPlatform(urlInput.trim())!.icon} {detectPlatform(urlInput.trim())!.label} được hỗ trợ
              </span>
            </div>
          )}

          {/* Supported platforms grid */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Nền tảng được hỗ trợ nhúng:</p>
            <div className="flex flex-wrap gap-1.5">
              {EMBED_PLATFORMS.slice(0, 15).map(p => (
                <span key={p.label} className={`text-xs px-2 py-0.5 rounded-full ${p.color}`}>
                  {p.icon} {p.label}
                </span>
              ))}
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                + URL bất kỳ
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
