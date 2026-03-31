'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathInlineProps { expr: string }
interface MathBlockProps  { expr: string }

/**
 * Renders an inline LaTeX expression — wrap in $ ... $
 * Usage: <MathInline expr="\frac{a}{b}" />
 */
export function MathInline({ expr }: MathInlineProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      katex.render(expr, ref.current, { throwOnError: false, displayMode: false });
    }
  }, [expr]);
  return <span ref={ref} className="math-inline" />;
}

/**
 * Renders a block/display LaTeX expression — wrap in $$ ... $$
 * Usage: <MathBlock expr="\sum_{i=1}^{n} x_i" />
 */
export function MathBlock({ expr }: MathBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      katex.render(expr, ref.current, { throwOnError: false, displayMode: true });
    }
  }, [expr]);
  return <div ref={ref} className="math-block my-2 overflow-x-auto" />;
}

/**
 * Auto-renders a mixed text string containing $...$ (inline) and $$...$$ (block) math.
 *
 * Example:
 *   <MathText text="The area is $A = \pi r^2$ where $r$ is radius." />
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  // Split on $$...$$ first (block), then $...$ (inline)
  const parts = splitMath(text);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'block')  return <MathBlock  key={i} expr={part.content} />;
        if (part.type === 'inline') return <MathInline key={i} expr={part.content} />;
        return <span key={i}>{part.content}</span>;
      })}
    </span>
  );
}

/* ── helpers ───────────────────────────────────────────── */
type Part = { type: 'text' | 'inline' | 'block'; content: string };

function splitMath(text: string): Part[] {
  const parts: Part[] = [];
  // Match $$...$$ then $...$
  const re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) });
    if (m[1] !== undefined) parts.push({ type: 'block',  content: m[1] });
    else                    parts.push({ type: 'inline', content: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts;
}
