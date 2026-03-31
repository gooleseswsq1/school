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

  // If no inline image markers, delegate entirely to LaTeXRenderer
  if (!content.includes("{{INLINE_IMG:")) {
    return <LaTeXRenderer content={content} className={className} />;
  }

  // Split on {{INLINE_IMG:N}} markers
  const parts = content.split(/(\{\{INLINE_IMG:\d+\}\})/g);

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
