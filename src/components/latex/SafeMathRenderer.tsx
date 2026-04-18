"use client";

import React, { useState, useEffect, useRef } from "react";

interface SafeMathRendererProps {
  content: string;
  className?: string;
}

/**
 * SafeMathRenderer — Renders math formulas as images for Vercel deployment
 * 
 * This component solves the issue of math formulas not displaying on Vercel
 * by rendering them as images instead of relying on KaTeX CSS.
 * 
 * Features:
 * 1. First tries to render using KaTeX (if available)
 * 2. Falls back to rendering as image using external service
 * 3. Supports both inline ($...$) and block ($$...$$) math
 * 4. Handles Vietnamese math notation (arc, vec, ovl, etc.)
 */

// Unicode to LaTeX conversion (same as LaTeXRenderer)
const UNICODE_TO_LATEX: Array<[RegExp, string]> = [
  // Greek
  [/α/g, "\\alpha"], [/β/g, "\\beta"], [/γ/g, "\\gamma"], [/δ/g, "\\delta"],
  [/ε/g, "\\varepsilon"], [/ζ/g, "\\zeta"], [/η/g, "\\eta"], [/θ/g, "\\theta"],
  [/ι/g, "\\iota"], [/κ/g, "\\kappa"], [/λ/g, "\\lambda"], [/μ/g, "\\mu"],
  [/ν/g, "\\nu"], [/ξ/g, "\\xi"], [/π/g, "\\pi"], [/ρ/g, "\\rho"],
  [/σ/g, "\\sigma"], [/τ/g, "\\tau"], [/υ/g, "\\upsilon"], [/φ/g, "\\varphi"],
  [/χ/g, "\\chi"], [/ψ/g, "\\psi"], [/ω/g, "\\omega"],
  [/Γ/g, "\\Gamma"], [/Δ/g, "\\Delta"], [/Θ/g, "\\Theta"], [/Λ/g, "\\Lambda"],
  [/Ξ/g, "\\Xi"], [/Π/g, "\\Pi"], [/Σ/g, "\\Sigma"], [/Υ/g, "\\Upsilon"],
  [/Φ/g, "\\Phi"], [/Ψ/g, "\\Psi"], [/Ω/g, "\\Omega"],

  // Operators
  [/≤/g, "\\leq"], [/≥/g, "\\geq"], [/≠/g, "\\neq"], [/≈/g, "\\approx"],
  [/∼/g, "\\sim"], [/≅/g, "\\cong"], [/≡/g, "\\equiv"], [/∝/g, "\\propto"],
  [/≪/g, "\\ll"], [/≫/g, "\\gg"],
  [/⊂/g, "\\subset"], [/⊃/g, "\\supset"],
  [/⊆/g, "\\subseteq"], [/⊇/g, "\\supseteq"],
  [/∈/g, "\\in"], [/∉/g, "\\notin"], [/∋/g, "\\ni"],
  [/∪/g, "\\cup"], [/∩/g, "\\cap"],
  [/∖/g, "\\setminus"], [/∅/g, "\\emptyset"],
  [/×/g, "\\times"], [/÷/g, "\\div"], [/·/g, "\\cdot"],
  [/±/g, "\\pm"], [/∓/g, "\\mp"],
  [/∞/g, "\\infty"], [/∂/g, "\\partial"], [/∇/g, "\\nabla"],

  // Arrows
  [/→/g, "\\to"], [/←/g, "\\leftarrow"], [/↔/g, "\\leftrightarrow"],
  [/⇒/g, "\\Rightarrow"], [/⇐/g, "\\Leftarrow"], [/⇔/g, "\\Leftrightarrow"],
  [/↑/g, "\\uparrow"], [/↓/g, "\\downarrow"],
  [/⇌/g, "\\rightleftharpoons"],

  // Geometry
  [/△/g, "\\triangle"], [/⟂/g, "\\perp"], [/∥/g, "\\parallel"],
  [/∠/g, "\\angle"], [/⌢/g, "\\frown"],

  // Logic
  [/∀/g, "\\forall"], [/∃/g, "\\exists"], [/∄/g, "\\nexists"],
  [/¬/g, "\\neg"], [/∧/g, "\\land"], [/∨/g, "\\lor"],

  // Number sets
  [/ℕ/g, "\\mathbb{N}"], [/ℤ/g, "\\mathbb{Z}"], [/ℚ/g, "\\mathbb{Q}"],
  [/ℝ/g, "\\mathbb{R}"], [/ℂ/g, "\\mathbb{C}"],

  // Calculus
  [/∑/g, "\\sum"], [/∏/g, "\\prod"],
  [/∫/g, "\\int"], [/∮/g, "\\oint"],
  [/√/g, "\\sqrt"],

  // Brackets
  [/⌊/g, "\\lfloor"], [/⌋/g, "\\rfloor"],
  [/⌈/g, "\\lceil"], [/⌉/g, "\\rceil"],
  [/⟨/g, "\\langle"], [/⟩/g, "\\rangle"],

  // Superscript/subscript
  [/⁰/g, "^{0}"], [/¹/g, "^{1}"], [/²/g, "^{2}"], [/³/g, "^{3}"],
  [/⁴/g, "^{4}"], [/⁵/g, "^{5}"], [/⁶/g, "^{6}"], [/⁷/g, "^{7}"],
  [/⁸/g, "^{8}"], [/⁹/g, "^{9}"], [/⁻/g, "^{-}"], [/⁺/g, "^{+}"],
  [/₀/g, "_{0}"], [/₁/g, "_{1}"], [/₂/g, "_{2}"], [/₃/g, "_{3}"],
  [/₄/g, "_{4}"], [/₅/g, "_{5}"], [/₆/g, "_{6}"], [/₇/g, "_{7}"],
  [/₈/g, "_{8}"], [/₉/g, "_{9}"],

  // Degree
  [/°/g, "^\\circ"],

  // Checkmark
  [/✓/g, "\\checkmark"], [/✔/g, "\\checkmark"],

  // Dots
  [/…/g, "\\ldots"], [/⋯/g, "\\cdots"],
  [/⋮/g, "\\vdots"], [/⋱/g, "\\ddots"],

  // Logic
  [/∵/g, "\\because"], [/∴/g, "\\therefore"],

  // Prime
  [/′/g, "\\prime"], [/″/g, "\\prime\\prime"],
];

// Preprocessors for Vietnamese math notation
const MATH_PREPROCESSORS: Array<[RegExp, string]> = [
  // Geometry shorthands
  [/arc\(([^)]+)\)/g, "\\stackrel{\\frown}{$1}"],
  [/vec\(([^)]+)\)/g, "\\overrightarrow{$1}"],
  [/ovl\(([^)]+)\)/g, "\\overline{$1}"],
  [/seg\(([^)]+)\)/g, "\\overline{$1}"],

  // Combinatorics
  [/C_\{([^}]+)\}\^\{([^}]+)\}/g, "\\binom{$1}{$2}"],
  [/C_([A-Za-z0-9])\^([A-Za-z0-9])/g, "\\binom{$1}{$2}"],

  // Number set shorthands
  [/\\R\b/g, "\\mathbb{R}"], [/\\N\b/g, "\\mathbb{N}"],
  [/\\Z\b/g, "\\mathbb{Z}"], [/\\C\b/g, "\\mathbb{C}"],
  [/\\Q\b/g, "\\mathbb{Q}"], [/\\P\b/g, "\\mathbb{P}"],
];

function preprocessMath(math: string): string {
  let out = math;
  
  // Apply Vietnamese math notation
  for (const [re, repl] of MATH_PREPROCESSORS) {
    out = out.replace(re, repl);
  }
  
  // Apply Unicode to LaTeX conversion
  for (const [re, repl] of UNICODE_TO_LATEX) {
    out = out.replace(re, repl);
  }
  
  return out;
}

// Encode LaTeX for URL
function encodeLatexForUrl(latex: string): string {
  return encodeURIComponent(latex);
}

// Generate image URL for math formula
function getMathImageUrl(latex: string, isBlock: boolean = false): string {
  const processed = preprocessMath(latex);
  
  // Use CodeCogs for rendering (free, reliable)
  // For block mode, add display style
  const displayStyle = isBlock ? "\\displaystyle " : "";
  const fullLatex = displayStyle + processed;
  
  // CodeCogs PNG API format:
  // https://latex.codecogs.com/png.latex?\dpi{300}{[LaTeX code]}
  // Include \dpi{300} to ensure high quality rendering
  const encodedFormula = encodeLatexForUrl(`\\dpi{300}{${fullLatex}}`);
  const url = `https://latex.codecogs.com/png.latex?${encodedFormula}`;
  
  return url;
}

// Try to load KaTeX dynamically
async function tryLoadKaTeX() {
  try {
    const katex = await import('katex');
    return katex.default;
  } catch {
    return null;
  }
}

// Safe inline math renderer
function SafeInlineMath({ math, className }: { math: string; className?: string }) {
  const [useImage, setUseImage] = useState(true);
  const [katexLoaded, setKatexLoaded] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Try to load KaTeX
    tryLoadKaTeX().then((katex) => {
      if (katex && containerRef.current) {
        try {
          katex.render(preprocessMath(math), containerRef.current, {
            throwOnError: false,
            displayMode: false,
          });
          setKatexLoaded(true);
          setUseImage(false);
        } catch {
          // KaTeX failed, use image
          setUseImage(true);
        }
      }
    });
  }, [math]);

  if (useImage || !katexLoaded) {
    return (
      <img
        src={getMathImageUrl(math, false)}
        alt={math}
        className={`inline-block align-middle ${className || ""}`}
        style={{
          height: "1.2em",
          width: "auto",
          verticalAlign: "middle",
          display: "inline-block",
        }}
        onError={(e) => {
          // Fallback: show raw text
          const img = e.currentTarget;
          img.style.display = "none";
          const span = document.createElement("span");
          span.textContent = math;
          span.className = "text-red-500 font-mono text-sm";
          img.parentNode?.insertBefore(span, img);
        }}
      />
    );
  }

  return <span ref={containerRef} className={className} />;
}

// Safe block math renderer
function SafeBlockMath({ math, className }: { math: string; className?: string }) {
  const [useImage, setUseImage] = useState(true);
  const [katexLoaded, setKatexLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Try to load KaTeX
    tryLoadKaTeX().then((katex) => {
      if (katex && containerRef.current) {
        try {
          katex.render(preprocessMath(math), containerRef.current, {
            throwOnError: false,
            displayMode: true,
          });
          setKatexLoaded(true);
          setUseImage(false);
        } catch {
          // KaTeX failed, use image
          setUseImage(true);
        }
      }
    });
  }, [math]);

  if (useImage || !katexLoaded) {
    return (
      <div className={`my-3 text-center ${className || ""}`}>
        <img
          src={getMathImageUrl(math, true)}
          alt={math}
          className="inline-block max-w-full h-auto"
          style={{
            maxHeight: "200px",
            objectFit: "contain",
          }}
          onError={(e) => {
            // Fallback: show raw text
            const img = e.currentTarget;
            img.style.display = "none";
            const pre = document.createElement("pre");
            pre.textContent = math;
            pre.className = "text-red-500 font-mono text-sm bg-red-50 p-2 rounded";
            img.parentNode?.insertBefore(pre, img);
          }}
        />
      </div>
    );
  }

  return <div ref={containerRef} className={`my-3 text-center ${className || ""}`} />;
}

// Parse math segments
type Segment =
  | { kind: "text"; value: string }
  | { kind: "inline"; math: string }
  | { kind: "block"; math: string };

function parseSegments(raw: string): Segment[] {
  const segs: Segment[] = [];
  const RE = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\$([^\$\n]+?)\$|\\\(([^)]*?)\\\)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = RE.exec(raw)) !== null) {
    if (m.index > last) segs.push({ kind: "text", value: raw.slice(last, m.index) });
    if (m[1] !== undefined || m[2] !== undefined) {
      segs.push({ kind: "block", math: (m[1] ?? m[2]).trim() });
    } else {
      segs.push({ kind: "inline", math: (m[3] ?? m[4]).trim() });
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) segs.push({ kind: "text", value: raw.slice(last) });
  return segs;
}

// Check if content has math
const HAS_MATH_RE = /\$|\\\(|\\\[|\\begin|arc\(|vec\(|ovl\(|seg\(|°|²|³|₂|₃/;

/**
 * Main component: SafeMathRenderer
 * Renders math formulas as images for Vercel deployment
 */
export default function SafeMathRenderer({ content, className = "" }: SafeMathRendererProps) {
  if (!content) return null;
  
  // Quick check: if no math markers, return plain text
  if (!HAS_MATH_RE.test(content)) {
    return <span className={className}>{content}</span>;
  }

  const segs = parseSegments(content);

  return (
    <span className={`safe-math-content ${className}`}>
      {segs.map((s, i) => {
        if (s.kind === "text") {
          return <React.Fragment key={i}>{s.value}</React.Fragment>;
        }
        if (s.kind === "inline") {
          return <SafeInlineMath key={i} math={s.math} className={className} />;
        }
        return <SafeBlockMath key={i} math={s.math} className={className} />;
      })}
    </span>
  );
}

/* ── Named exports ──────────────────────────────────────────── */

export function SafeInline({ math, className }: { math: string; className?: string }) {
  return <SafeInlineMath math={math} className={className} />;
}

export function SafeBlock({ math, className }: { math: string; className?: string }) {
  return <SafeBlockMath math={math} className={className} />;
}

/*
 * ─── USAGE ───────────────────────────────────────────────────
 *
 * Basic usage:
 *   <SafeMathRenderer content="The area is $A = \pi r^2$" />
 *
 * Block math:
 *   <SafeMathRenderer content="$$\sum_{i=1}^{n} x_i$$" />
 *
 * Vietnamese math notation:
 *   <SafeMathRenderer content="$\overrightarrow{AB}$" />
 *   <SafeMathRenderer content="arc(AB)" />
 *
 * Inline components:
 *   <SafeInline math="\frac{a}{b}" />
 *   <SafeBlock math="\int_0^1 x dx" />
 *
 * ─────────────────────────────────────────────────────────────
 */