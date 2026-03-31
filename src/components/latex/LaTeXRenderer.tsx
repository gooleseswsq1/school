"use client";

import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface LaTeXRendererProps {
  content: string;
  isBlock?: boolean;
  className?: string;
}

/**
 * LaTeXRenderer — Full-featured KaTeX renderer.
 *
 * ═══════════════════════════════════════════════════════════════
 *  DELIMITERS
 *    Inline : $...$   \(...\)
 *    Block  : $$...$$ \[...\]
 *
 * ═══════════════════════════════════════════════════════════════
 *  SHORTHAND / AUTO-CONVERT (paste Unicode or use shortcuts)
 * ═══════════════════════════════════════════════════════════════
 *
 *  GEOMETRY
 *    arc(AB)  → \stackrel{\frown}{AB}   — cung AB
 *    vec(AB)  → \overrightarrow{AB}     — vectơ AB
 *    ovl(AB)  → \overline{AB}           — đoạn thẳng / gạch đầu số
 *    seg(AB)  → \overline{AB}
 *    △ → \triangle   ⟂ → \perp   ∥ → \parallel   ∠ → \angle
 *    ⌢ → \frown
 *    \measuredangle  \sphericalangle  \angle
 *    \overrightarrow{AB}  \overleftarrow{AB}
 *    \stackrel{\frown}{AB}
 *
 *  CHEMISTRY
 *    --chem{H2SO4}  → \ce{H2SO4}   (requires KaTeX mhchem)
 *    \ce{A -> B}   \ce{A <-> B}   \ce{A ->[\Delta] B}
 *    \rightleftharpoons  (⇌ equilibrium)
 *    \downarrow (↓ precipitate)  \uparrow (↑ gas)
 *
 *  ELEMENTARY MATH
 *    ovl(3)          → \overline{3}   số tuần hoàn  0,\overline{3}
 *    \dot{3}         — tuần hoàn 1 chữ số
 *    \overline{abc}  — gạch đầu số ($\overline{abc} = 100a+10b+c$)
 *    30° → 30^\circ
 *
 *  FORMATTING
 *    \boxed{kết quả}
 *    \cancel{x}  \bcancel{x}  \xcancel{x}   (rút gọn phân số)
 *    \color{red}{...}   \colorbox{yellow}{...}
 *
 *  LOGIC & SETS
 *    \setminus  \complement  \emptyset
 *    \forall \exists \nexists \neg \land \lor
 *    \mathbb{N Z Q R C P E}
 *    \mathbb{P} (xác suất)  \mathbb{E} (kỳ vọng)
 *
 *  COMBINATORICS
 *    \binom{n}{k}   C_n^k → \binom{n}{k}
 *
 *  ACCENTS
 *    \hat \bar \vec \tilde \dot \ddot
 *    \widehat \widetilde \overline \underline
 *    \overbrace{...}^{}  \underbrace{...}_{}
 *    \overset  \underset  \stackrel
 *
 *  GREEK (paste Unicode directly: α β γ … Ω)
 *  OPERATORS: ± × ÷ · ≤ ≥ ≠ ≈ ≡ ∝ ∞ ∂ ∇
 *  ARROWS: → ← ↔ ⇒ ⇐ ⇔ ↑ ↓ ⇌
 *  BRACKETS: ⌊ ⌋ ⌈ ⌉ ⟨ ⟩
 *  SUP/SUB UNICODE: ² ³ ₂ ₃ → ^{2} ^{3} _{2} _{3}
 */

const MATH_PREPROCESSORS: Array<[RegExp, string]> = [
  // ── Shorthands (specific first) ───────────────────────────────

  // Chemistry: --chem{...} → \ce{...}
  [/--chem\{([^}]*)\}/g, "\\ce{$1}"],

  // Geometry shorthands
  [/arc\(([^)]+)\)/g, "\\stackrel{\\frown}{$1}"],
  [/vec\(([^)]+)\)/g, "\\overrightarrow{$1}"],
  [/ovl\(([^)]+)\)/g, "\\overline{$1}"],
  [/seg\(([^)]+)\)/g, "\\overline{$1}"],

  // Combinatorics: C_{n}^{k} → \binom{n}{k}
  [/C_\{([^}]+)\}\^\{([^}]+)\}/g, "\\binom{$1}{$2}"],
  [/C_([A-Za-z0-9])\^([A-Za-z0-9])/g, "\\binom{$1}{$2}"],

  // Degree sign
  [/°/g, "^\\circ"],
  [/\\degree/g, "^\\circ"],

  // Number set shorthand macros (before Greek/unicode pass)
  [/\\R\b/g, "\\mathbb{R}"],  [/\\N\b/g, "\\mathbb{N}"],
  [/\\Z\b/g, "\\mathbb{Z}"],  [/\\C\b/g, "\\mathbb{C}"],
  [/\\Q\b/g, "\\mathbb{Q}"],  [/\\P\b/g, "\\mathbb{P}"],

  // ── Unicode Greek → LaTeX ─────────────────────────────────────
  [/α/g,"\\alpha"],[/β/g,"\\beta"],[/γ/g,"\\gamma"],[/δ/g,"\\delta"],
  [/ε/g,"\\varepsilon"],[/ζ/g,"\\zeta"],[/η/g,"\\eta"],[/θ/g,"\\theta"],
  [/ι/g,"\\iota"],[/κ/g,"\\kappa"],[/λ/g,"\\lambda"],[/μ/g,"\\mu"],
  [/ν/g,"\\nu"],[/ξ/g,"\\xi"],[/π/g,"\\pi"],[/ρ/g,"\\rho"],
  [/σ/g,"\\sigma"],[/τ/g,"\\tau"],[/υ/g,"\\upsilon"],[/φ/g,"\\varphi"],
  [/χ/g,"\\chi"],[/ψ/g,"\\psi"],[/ω/g,"\\omega"],
  [/Γ/g,"\\Gamma"],[/Δ/g,"\\Delta"],[/Θ/g,"\\Theta"],[/Λ/g,"\\Lambda"],
  [/Ξ/g,"\\Xi"],[/Π/g,"\\Pi"],[/Σ/g,"\\Sigma"],[/Υ/g,"\\Upsilon"],
  [/Φ/g,"\\Phi"],[/Ψ/g,"\\Psi"],[/Ω/g,"\\Omega"],

  // ── Unicode operators & relations ─────────────────────────────
  [/≤/g,"\\leq"],[/≥/g,"\\geq"],[/≠/g,"\\neq"],[/≈/g,"\\approx"],
  [/∼/g,"\\sim"],[/≅/g,"\\cong"],[/≡/g,"\\equiv"],[/∝/g,"\\propto"],
  [/≪/g,"\\ll"],[/≫/g,"\\gg"],
  [/≺/g,"\\prec"],[/≻/g,"\\succ"],
  [/⊂/g,"\\subset"],[/⊃/g,"\\supset"],
  [/⊆/g,"\\subseteq"],[/⊇/g,"\\supseteq"],
  [/∈/g,"\\in"],[/∉/g,"\\notin"],[/∋/g,"\\ni"],
  [/∪/g,"\\cup"],[/∩/g,"\\cap"],
  [/∖/g,"\\setminus"],[/∅/g,"\\emptyset"],
  [/×/g,"\\times"],[/÷/g,"\\div"],[/·/g,"\\cdot"],
  [/±/g,"\\pm"],[/∓/g,"\\mp"],
  [/∞/g,"\\infty"],[/∂/g,"\\partial"],[/∇/g,"\\nabla"],

  // ── Unicode arrows ────────────────────────────────────────────
  [/→/g,"\\to"],[/←/g,"\\leftarrow"],[/↔/g,"\\leftrightarrow"],
  [/⇒/g,"\\Rightarrow"],[/⇐/g,"\\Leftarrow"],[/⇔/g,"\\Leftrightarrow"],
  [/↑/g,"\\uparrow"],[/↓/g,"\\downarrow"],
  [/↗/g,"\\nearrow"],[/↘/g,"\\searrow"],
  [/↖/g,"\\nwarrow"],[/↙/g,"\\swarrow"],
  [/↦/g,"\\mapsto"],
  [/⇌/g,"\\rightleftharpoons"],   // Hóa học: cân bằng
  [/⇋/g,"\\leftrightharpoons"],

  // ── Unicode geometry ──────────────────────────────────────────
  [/△/g,"\\triangle"],[/▲/g,"\\triangle"],
  [/□/g,"\\square"],[/■/g,"\\blacksquare"],
  [/⟂/g,"\\perp"],[/∥/g,"\\parallel"],
  [/∠/g,"\\angle"],[/⌢/g,"\\frown"],
  [/⊾/g,"\\measuredangle"],

  // ── Unicode logic & sets ──────────────────────────────────────
  [/∀/g,"\\forall"],[/∃/g,"\\exists"],[/∄/g,"\\nexists"],
  [/¬/g,"\\neg"],[/∧/g,"\\land"],[/∨/g,"\\lor"],
  [/⊕/g,"\\oplus"],[/⊗/g,"\\otimes"],[/⊙/g,"\\odot"],
  [/⊢/g,"\\vdash"],[/⊨/g,"\\models"],
  [/⊤/g,"\\top"],[/⊥/g,"\\bot"],

  // ── Unicode number sets ───────────────────────────────────────
  [/ℕ/g,"\\mathbb{N}"],[/ℤ/g,"\\mathbb{Z}"],[/ℚ/g,"\\mathbb{Q}"],
  [/ℝ/g,"\\mathbb{R}"],[/ℂ/g,"\\mathbb{C}"],
  [/ℙ/g,"\\mathbb{P}"],[/ℍ/g,"\\mathbb{H}"],[/𝔼/g,"\\mathbb{E}"],

  // ── Calculus / misc ───────────────────────────────────────────
  [/∑/g,"\\sum"],[/∏/g,"\\prod"],
  [/∫/g,"\\int"],[/∮/g,"\\oint"],
  [/√/g,"\\sqrt"],
  [/…/g,"\\ldots"],[/⋯/g,"\\cdots"],
  [/⋮/g,"\\vdots"],[/⋱/g,"\\ddots"],
  [/∵/g,"\\because"],[/∴/g,"\\therefore"],
  [/✓/g,"\\checkmark"],[/✔/g,"\\checkmark"],
  [/′/g,"\\prime"],[/″/g,"\\prime\\prime"],

  // ── Brackets ─────────────────────────────────────────────────
  [/⌊/g,"\\lfloor"],[/⌋/g,"\\rfloor"],
  [/⌈/g,"\\lceil"],[/⌉/g,"\\rceil"],
  [/⟨/g,"\\langle"],[/⟩/g,"\\rangle"],
  [/〈/g,"\\langle"],[/〉/g,"\\rangle"],

  // ── Superscript / subscript unicode ──────────────────────────
  [/⁰/g,"^{0}"],[/¹/g,"^{1}"],[/²/g,"^{2}"],[/³/g,"^{3}"],
  [/⁴/g,"^{4}"],[/⁵/g,"^{5}"],[/⁶/g,"^{6}"],[/⁷/g,"^{7}"],
  [/⁸/g,"^{8}"],[/⁹/g,"^{9}"],[/⁻/g,"^{-}"],[/⁺/g,"^{+}"],
  [/₀/g,"_{0}"],[/₁/g,"_{1}"],[/₂/g,"_{2}"],[/₃/g,"_{3}"],
  [/₄/g,"_{4}"],[/₅/g,"_{5}"],[/₆/g,"_{6}"],[/₇/g,"_{7}"],
  [/₈/g,"_{8}"],[/₉/g,"_{9}"],
];

function preprocess(math: string): string {
  let out = math;
  for (const [re, repl] of MATH_PREPROCESSORS) {
    out = out.replace(re, repl);
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────
   Safe render helpers — never throw
   ───────────────────────────────────────────────────────────────── */

function SafeInline({ math, className }: { math: string; className?: string }) {
  try {
    return <InlineMath math={preprocess(math)} />;
  } catch (err) {
    console.error("[LaTeXRenderer] inline:", err);
    return (
      <span className={`text-red-500 text-xs font-mono bg-red-50 px-1 rounded ${className ?? ""}`}>
        [Math: {math}]
      </span>
    );
  }
}

function SafeBlock({ math }: { math: string }) {
  try {
    return (
      <div className="my-3 overflow-x-auto text-center">
        <BlockMath math={preprocess(math)} />
      </div>
    );
  } catch (err) {
    console.error("[LaTeXRenderer] block:", err);
    return (
      <pre className="text-red-500 text-xs font-mono my-2 p-2 bg-red-50 rounded overflow-x-auto">
        [Math Error: {math}]
      </pre>
    );
  }
}

/* ─────────────────────────────────────────────────────────────────
   Mixed-content parser
   Recognises: $$...$$ \[...\] (block)  $...$ \(...\) (inline)
   ───────────────────────────────────────────────────────────────── */

type Segment =
  | { kind: "text";   value: string }
  | { kind: "inline"; math: string }
  | { kind: "block";  math: string };

function parseSegments(raw: string): Segment[] {
  const segs: Segment[] = [];
  const RE = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\$([^\$\n]+?)\$|\\\(([^)]*?)\\\)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = RE.exec(raw)) !== null) {
    if (m.index > last) segs.push({ kind: "text", value: raw.slice(last, m.index) });
    if (m[1] !== undefined || m[2] !== undefined) {
      segs.push({ kind: "block",  math: (m[1] ?? m[2]).trim() });
    } else {
      segs.push({ kind: "inline", math: (m[3] ?? m[4]).trim() });
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) segs.push({ kind: "text", value: raw.slice(last) });
  return segs;
}

const HAS_MATH_RE = /\$|\\\(|\\\[|\\begin|arc\(|vec\(|ovl\(|seg\(|--chem\{|°|²|³|₂|₃/;

/* ─────────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────────── */

export default function LaTeXRenderer({ content, isBlock = false, className = "" }: LaTeXRendererProps) {
  if (!content) return null;
  if (!HAS_MATH_RE.test(content)) return <span className={className}>{content}</span>;

  if (isBlock && !content.includes("$") && !content.includes("\\[") && !content.includes("\\(")) {
    return <SafeBlock math={content} />;
  }

  const segs = parseSegments(content);
  const allBlock = segs.every((s) => s.kind === "text" ? (s.value.trim() === "") : s.kind === "block");

  if (allBlock) {
    return (
      <div className={`math-block-content space-y-1 ${className}`}>
        {segs
          .filter((s) => s.kind !== "text" || (s as any).value.trim() !== "")
          .map((s, i) =>
            s.kind === "block"
              ? <SafeBlock key={i} math={s.math} />
              : <span key={i} className={className}>{(s as any).value}</span>
          )}
      </div>
    );
  }

  return (
    <span className={`inline-math-content ${className}`}>
      {segs.map((s, i) => {
        if (s.kind === "text")   return <React.Fragment key={i}>{s.value}</React.Fragment>;
        if (s.kind === "inline") return <SafeInline key={i} math={s.math} className={className} />;
        return <SafeBlock key={i} math={s.math} />;
      })}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Named exports
   ───────────────────────────────────────────────────────────────── */

export function LatexBlock({ math, className = "" }: { math: string; className?: string }) {
  return <div className={`overflow-x-auto ${className}`}><SafeBlock math={math} /></div>;
}

export function LatexInline({ math, className = "" }: { math: string; className?: string }) {
  return <SafeInline math={math} className={className} />;
}

/*
 * ─── CHEAT SHEET ─────────────────────────────────────────────────
 *
 * GEOMETRY:
 *   $\angle ABC = 60^\circ$         — góc
 *   $\measuredangle ABC$            — góc có số đo
 *   $\overrightarrow{AB}$           — vectơ AB
 *   vec(AB)  →  \overrightarrow{AB} — shorthand
 *   $\stackrel{\frown}{AB}$         — cung AB
 *   arc(AB)  →  \stackrel{\frown}{AB}
 *   $\overline{AB} = 5\text{ cm}$   — đoạn thẳng
 *   ovl(AB)  →  \overline{AB}
 *   $AB \perp CD$,  $AB \parallel CD$
 *   $\triangle ABC \sim \triangle DEF$
 *
 * CHEMISTRY (cần KaTeX mhchem):
 *   $\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}$
 *   $\ce{CaCO3 ->[\Delta] CaO + CO2 ^}$
 *   --chem{Fe + CuSO4 -> FeSO4 + Cu}  →  \ce{...}
 *   $A \rightleftharpoons B$  — cân bằng ⇌
 *   $\text{BaSO}_4 \downarrow$  — kết tủa
 *
 * ELEMENTARY:
 *   $0,\overline{3} = \dfrac{1}{3}$      — số tuần hoàn
 *   ovl(3)  →  \overline{3}
 *   $\overline{abc} = 100a + 10b + c$    — gạch đầu số
 *   $30^\circ$  hoặc  30°  (shorthand)
 *
 * FORMATTING:
 *   $\boxed{x = \dfrac{-b \pm \sqrt{b^2-4ac}}{2a}}$
 *   $\dfrac{\cancel{2}x}{\cancel{2}} = x$      — rút gọn
 *   $\color{red}{x} + \color{blue}{y}$          — màu sắc
 *
 * LOGIC & SETS:
 *   $A \setminus B$               — hiệu tập hợp
 *   $A^\complement$               — tập bù
 *   $\forall x \in \mathbb{R}$
 *   $\mathbb{P}(A) + \mathbb{P}(\bar{A}) = 1$
 *   $\mathbb{E}[X] = \sum_i x_i p_i$
 *
 * COMBINATORICS:
 *   $\binom{n}{k} = \dfrac{n!}{k!(n-k)!}$
 *   C_{n}^{k}  →  \binom{n}{k}   (shorthand)
 *   $A_n^k = \dfrac{n!}{(n-k)!}$
 * ─────────────────────────────────────────────────────────────────
 */