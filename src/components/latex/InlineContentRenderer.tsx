"use client";

import React from "react";
import LaTeXRenderer from "./LaTeXRenderer";

interface InlineContentRendererProps {
  content: string;
  inlineImages?: string[];
  className?: string;
}

/**
 * Renders mixed content containing text, LaTeX math, and inline images.
 * Splits text on {{INLINE_IMG:N}} markers, renders text parts with LaTeXRenderer
 * and image parts as inline <img> elements.
 */
export default function InlineContentRenderer({
  content,
  inlineImages = [],
  className = "",
}: InlineContentRendererProps) {
  if (!content) return null;

  let normalizedContent = content;

  // Support legacy placeholders like q1-img1 / img1 by mapping to INLINE_IMG markers.
  normalizedContent = normalizedContent.replace(/\b(?:q\d+-)?img(\d+)\b/gi, (_m, idxStr) => {
    const oneBased = parseInt(idxStr, 10);
    if (!Number.isFinite(oneBased) || oneBased <= 0) return _m;
    const zeroBased = oneBased - 1;
    return `{{INLINE_IMG:${zeroBased}}}`;
  });

  // Convert [img:N] placeholders used by parser to INLINE_IMG markers.
  normalizedContent = normalizedContent.replace(/\[img:(\d+)\]/gi, (_m, idxStr) => {
    const idx = parseInt(idxStr, 10);
    if (!Number.isFinite(idx) || idx < 0) return _m;
    return `{{INLINE_IMG:${idx}}}`;
  });

  // Handle square placeholders (□) that appear when formula conversion fails
  // These squares come from failed OMML-to-LaTeX conversion or missing formula data
  
  // If inline images exist, map each square to the next inline image marker
  if (inlineImages.length > 0 && normalizedContent.includes("□") && !normalizedContent.includes("{{INLINE_IMG:")) {
    let imgIdx = 0;
    normalizedContent = normalizedContent.replace(/□/g, () => {
      if (imgIdx >= inlineImages.length) return "";
      const marker = `{{INLINE_IMG:${imgIdx}}}`;
      imgIdx += 1;
      return marker;
    });
  }
  
  // Keep remaining square placeholders unchanged when no inline image is available.
  // This avoids hiding content with synthetic [CNx] tokens.

  // If no inline image markers, delegate entirely to LaTeXRenderer
  if (!normalizedContent.includes("{{INLINE_IMG:")) {
    return <LaTeXRenderer content={normalizedContent} className={className} />;
  }

  // Split on {{INLINE_IMG:N}} markers
  const parts = normalizedContent.split(/(\{\{INLINE_IMG:\d+\}\})/g);

  return (
    <span
      className={`inline-content-renderer leading-relaxed ${className}`}
      style={{ fontSize: "1.1em" }}
    >
      {parts.map((part, i) => {
        const imgMatch = part.match(/^\{\{INLINE_IMG:(\d+)\}\}$/);
        if (imgMatch) {
          const imgIdx = parseInt(imgMatch[1], 10);
          const src = inlineImages[imgIdx];
          if (src) {
            return (
              <img
                key={i}
                src={src}
                alt=""
                className="inline-block align-middle mx-1 rounded"
                style={{
                  height: "2em",
                  width: "auto",
                  verticalAlign: "middle",
                  objectFit: "contain",
                  background: "#ffffff",
                  padding: "1px 3px",
                  border: "1px solid #e5e7eb",
                }}
                onLoad={(e) => {
                  // Auto-adjust: tall images (fractions) get more height
                  const img = e.currentTarget;
                  const ratio = img.naturalHeight / img.naturalWidth;
                  if (ratio > 1.2) {
                    img.style.height = "3em";
                  } else if (ratio > 0.8) {
                    img.style.height = "2.2em";
                  }
                }}
              />
            );
          }
          return null; // Image not found
        }
        // Text segment — render with LaTeXRenderer for math support
        if (part.trim()) {
          return <LaTeXRenderer key={i} content={part} className={className} />;
        }
        return part ? <React.Fragment key={i}>{part}</React.Fragment> : null;
      })}
    </span>
  );
}
