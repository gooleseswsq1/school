"use client";

import { useState, useEffect, useRef } from "react";
import {
  Link2,
  ExternalLink,
  Code2,
  Globe,
  Trash2,
  Edit3,
  Check,
  X,
  Maximize2,
  Minimize2,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Domains that support embedding via iframe */
const EMBEDDABLE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /youtube\.com\/watch|youtu\.be\//i, label: "YouTube" },
  { pattern: /docs\.google\.com/i, label: "Google Docs/Slides/Sheets" },
  { pattern: /drive\.google\.com/i, label: "Google Drive" },
  { pattern: /figma\.com/i, label: "Figma" },
  { pattern: /canva\.com\/design/i, label: "Canva Design" },
  { pattern: /canva\.com/i, label: "Canva" },
  { pattern: /slides\.com/i, label: "Slides" },
  { pattern: /miro\.com/i, label: "Miro" },
  { pattern: /codepen\.io/i, label: "CodePen" },
  { pattern: /codesandbox\.io/i, label: "CodeSandbox" },
  { pattern: /loom\.com/i, label: "Loom" },
  { pattern: /vimeo\.com/i, label: "Vimeo" },
  { pattern: /genial\.ly|genially\.com/i, label: "Genially" },
  { pattern: /padlet\.com/i, label: "Padlet" },
  { pattern: /notion\.site|notion\.so\/.*[a-f0-9]{32}/i, label: "Notion" },
  { pattern: /quizlet\.com/i, label: "Quizlet" },
  { pattern: /wordwall\.net/i, label: "Wordwall" },
  { pattern: /quizizz\.com/i, label: "Quizizz" },
  { pattern: /kahoot\.it|kahoot\.com/i, label: "Kahoot" },
  { pattern: /prezi\.com/i, label: "Prezi" },
  { pattern: /scratch\.mit\.edu/i, label: "Scratch" },
  { pattern: /tinkercad\.com/i, label: "Tinkercad" },
];

/** Convert a watch URL to embeddable format */
function toEmbedUrl(url: string): string {
  // YouTube
  const ytWatch = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}?rel=0`;

  const ytShort = url.match(/youtu\.be\/([\w-]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}?rel=0`;

  // Google Docs/Slides/Sheets – append /preview
  if (/docs\.google\.com\/(document|presentation|spreadsheets)/.test(url)) {
    return url.replace(/\/(edit|view)(.*)?$/, "/preview");
  }

  // Loom
  const loom = url.match(/loom\.com\/share\/([\w]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;

  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // Canva Design → append ?embed
  if (/canva\.com\/design\//.test(url)) {
    const cleanUrl = url.replace(/\?.*$/, '');
    return cleanUrl.endsWith('/view') ? `${cleanUrl}?embed` : `${cleanUrl}/view?embed`;
  }

  // Genially → giữ nguyên URL (hỗ trợ iframe trực tiếp)
  if (/genial\.ly|genially\.com/.test(url)) return url;

  // Padlet → thêm /embed nếu chưa có
  if (/padlet\.com/.test(url)) {
    return url.includes('/embed') ? url : url.replace(/(padlet\.com\/[^\/]+\/[^\/]+)/, '$1/embed');
  }

  // Notion → giữ nguyên (notion.site pages đã hỗ trợ embed)
  if (/notion\.site|notion\.so/.test(url)) return url;

  // Quizlet → thêm /embed
  if (/quizlet\.com/.test(url)) {
    return url.includes('/embed') ? url : url.replace(/\/?$/, '/embed');
  }

  // Prezi → thêm /embed
  if (/prezi\.com\/p\//.test(url)) {
    return url.includes('/embed') ? url : url.replace(/\/?$/, '/embed/');
  }

  // Scratch → embed format
  const scratch = url.match(/scratch\.mit\.edu\/projects\/(\d+)/);
  if (scratch) return `https://scratch.mit.edu/projects/${scratch[1]}/embed`;

  return url;
}

function isEmbeddable(url: string): boolean {
  return EMBEDDABLE_PATTERNS.some(({ pattern }) => pattern.test(url));
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=32&domain_url=${origin}`;
  } catch {
    return "";
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LinkBlockData {
  id: string;
  url: string;
  label?: string;
  description?: string;
  thumbnailUrl?: string;
}

interface LinkBlockComponentProps {
  block: LinkBlockData;
  onDelete?: () => void;
  onUpdate?: (id: string, data: Partial<LinkBlockData>) => void;
  readOnly?: boolean;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LinkBlockComponent({
  block,
  onDelete,
  onUpdate,
  readOnly = false,
}: LinkBlockComponentProps) {
  const [isEditing, setIsEditing] = useState(!block.url);
  const [draftUrl, setDraftUrl] = useState(block.url || "");
  const [draftLabel, setDraftLabel] = useState(block.label || "");
  const [draftDesc, setDraftDesc] = useState(block.description || "");
  const [showEmbed, setShowEmbed] = useState(false);
  const [iframeFullscreen, setIframeFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const url = block.url;
  const label = block.label || getDomain(url);
  const embeddable = url ? isEmbeddable(url) : false;
  const embedUrl = url ? toEmbedUrl(url) : "";
  const faviconUrl = url ? getFaviconUrl(url) : "";

  // Focus URL input when editing starts
  useEffect(() => {
    if (isEditing) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isEditing]);

  const handleSave = () => {
    if (!draftUrl.trim()) return;
    let finalUrl = draftUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = "https://" + finalUrl;
    onUpdate?.(block.id, {
      url: finalUrl,
      label: draftLabel.trim() || undefined,
      description: draftDesc.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (!block.url) return; // can't cancel with no URL saved
    setDraftUrl(block.url);
    setDraftLabel(block.label || "");
    setDraftDesc(block.description || "");
    setIsEditing(false);
  };

  const handleEmbedToggle = () => {
    setShowEmbed((v) => !v);
    setIframeLoading(true);
    setIframeError(false);
  };

  // ── Edit Form ────────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="bg-white border-2 border-dashed border-blue-300 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-blue-600">
          <Link2 size={20} />
          <h3 className="font-semibold text-base">
            {block.url ? "Chỉnh sửa liên kết" : "Thêm liên kết"}
          </h3>
        </div>

        {/* URL */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            URL *
          </label>
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 bg-white transition">
            <Globe size={16} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="url"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="https://example.com"
              className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
            />
          </div>
        </div>

        {/* Label */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Tiêu đề (tùy chọn)
          </label>
          <input
            type="text"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            placeholder="Tên hiển thị cho liên kết"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Mô tả (tùy chọn)
          </label>
          <textarea
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            rows={2}
            placeholder="Mô tả ngắn về trang web này..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition resize-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!draftUrl.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm font-medium"
          >
            <Check size={16} />
            Lưu
          </button>
          {block.url && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            >
              <X size={16} />
              Hủy
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Preview Card ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Favicon */}
          <div className="shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Globe size={18} className="text-gray-400" />
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate text-base leading-tight">
              {label}
            </p>
            <p className="text-xs text-blue-500 truncate mt-0.5">
              {getDomain(url)}
            </p>
            {block.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {block.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {embeddable && (
              <button
                onClick={handleEmbedToggle}
                title={showEmbed ? "Ẩn nhúng" : "Nhúng trang"}
                className={`p-2 rounded-lg transition text-sm ${
                  showEmbed
                    ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Code2 size={16} />
              </button>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở trong tab mới"
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition"
            >
              <ExternalLink size={16} />
            </a>

            {!readOnly && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  title="Chỉnh sửa"
                  className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700 transition"
                >
                  <Edit3 size={16} />
                </button>
                {onDelete && (
                  <button
                    onClick={onDelete}
                    title="Xóa liên kết"
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Full URL bar */}
        <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
          <Link2 size={12} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 truncate flex-1">{url}</span>
          {embeddable && !showEmbed && (
            <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
              Có thể nhúng
            </span>
          )}
        </div>
      </div>

      {/* Embed iframe */}
      {showEmbed && (
        <div
          className={`border-t border-gray-100 transition-all ${
            iframeFullscreen
              ? "fixed inset-4 z-50 bg-white rounded-2xl shadow-2xl flex flex-col"
              : ""
          }`}
        >
          {/* Embed Toolbar */}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Code2 size={14} />
              <span className="font-medium">Nhúng: {getDomain(url)}</span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
              >
                <ExternalLink size={12} />
                Mở rộng
              </a>
              <button
                onClick={() => setIframeFullscreen((v) => !v)}
                className="p-1.5 rounded hover:bg-gray-200 transition text-gray-600"
                title={iframeFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              >
                {iframeFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={() => {
                  setShowEmbed(false);
                  setIframeFullscreen(false);
                }}
                className="p-1.5 rounded hover:bg-gray-200 transition text-gray-600"
                title="Đóng"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* iframe */}
          <div
            className={`relative bg-gray-100 ${
              iframeFullscreen ? "flex-1" : "aspect-video"
            }`}
          >
            {iframeLoading && !iframeError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <Loader2 size={28} className="animate-spin text-indigo-400" />
                  <span className="text-sm">Đang tải nội dung...</span>
                </div>
              </div>
            )}
            {iframeError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <AlertCircle size={28} className="text-red-400" />
                  <p className="text-sm text-gray-600 font-medium">
                    Trang này không cho phép nhúng
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline hover:text-blue-700"
                  >
                    Mở trong tab mới →
                  </a>
                </div>
              </div>
            )}
            <iframe
              src={embedUrl}
              title={label}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className="w-full h-full border-0"
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false);
                setIframeError(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
