// src/utils/omml-to-latex.ts
// Extracts OMML (Office Math Markup Language) from .docx files
// and converts to LaTeX so formulas are preserved during Word import.
//
// Pipeline: .docx (ZIP) → word/document.xml → find <m:oMath> elements
//           → convert OMML → MathML → LaTeX via mathml-to-latex
//           → inject [[LATEX:$...$]] markers into XML → repack .docx

import JSZip from 'jszip';

// Top-level import so Vercel bundler can include it.
// Dynamic require() inside functions may fail in serverless bundling.
let MathMLToLaTeX: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  MathMLToLaTeX = require('mathml-to-latex').MathMLToLaTeX;
} catch {
  console.warn('[omml-to-latex] mathml-to-latex not available at module load');
}

/* ─── OMML element → MathML conversion ─── */

/**
 * Convert a single OMML XML fragment (e.g. <m:oMath>...</m:oMath>)
 * into MathML.  This handles the most common OMML structures produced
 * by the Word Equation Editor and MathType.
 */
function ommlNodeToMathml(omml: string): string {
  // We work with a simplified approach: parse the OMML tags and map them
  // to their MathML equivalents.  The m: namespace prefix is stripped for
  // matching; we always produce un-prefixed MathML output.

  let s = omml;

  // ── Helper: extract text content from <m:t> elements ──
  // <m:r><m:rPr>...</m:rPr><m:t>x</m:t></m:r>  →  the literal "x"
  // We first normalise the run elements.

  // Strip <m:rPr>...</m:rPr> (run properties – font/style info we don't need)
  s = s.replace(/<m:rPr>[\s\S]*?<\/m:rPr>/g, '');
  // Strip <w:rPr>...</w:rPr> (Word run properties that sometimes leak in)
  s = s.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, '');
  // Strip <m:ctrlPr>...</m:ctrlPr>
  s = s.replace(/<m:ctrlPr>[\s\S]*?<\/m:ctrlPr>/g, '');
  // Strip <m:oMathParaPr>...</m:oMathParaPr>
  s = s.replace(/<m:oMathParaPr>[\s\S]*?<\/m:oMathParaPr>/g, '');
  // Strip <m:fPr>...</m:fPr>, <m:dPr>...</m:dPr>, etc. (property blocks)
  // BUT we need some properties — specifically begChr/endChr for delimiters
  // So extract those FIRST before stripping.

  // ── Process <m:d> (delimiters / brackets) ──
  // Replace <m:d> ... </m:d> with <mfenced> ... </mfenced>
  // Extract begChr and endChr from <m:dPr>
  s = s.replace(/<m:d>([\s\S]*?)<\/m:d>/g, (_match, inner: string) => {
    let open = '(';
    let close = ')';
    const begMatch = inner.match(/<m:begChr\s+m:val\s*=\s*"([^"]*)"/);
    const endMatch = inner.match(/<m:endChr\s+m:val\s*=\s*"([^"]*)"/);
    if (begMatch) open = begMatch[1] || '(';
    if (endMatch) close = endMatch[1] || ')';
    // Remove the <m:dPr> block
    const cleaned = inner.replace(/<m:dPr>[\s\S]*?<\/m:dPr>/g, '');
    // <m:e> elements inside are the "elements" of the delimiter group
    const elements = cleaned.replace(/<\/?m:e>/g, '');
    return `<mfenced open="${open}" close="${close}"><mrow>${elements}</mrow></mfenced>`;
  });

  // ── Process <m:f> (fractions) ──
  s = s.replace(/<m:f>([\s\S]*?)<\/m:f>/g, (_match, inner: string) => {
    // Remove <m:fPr>...</m:fPr>
    const cleaned = inner.replace(/<m:fPr>[\s\S]*?<\/m:fPr>/g, '');
    const numMatch = cleaned.match(/<m:num>([\s\S]*?)<\/m:num>/);
    const denMatch = cleaned.match(/<m:den>([\s\S]*?)<\/m:den>/);
    const num = numMatch ? numMatch[1].replace(/<\/?m:e>/g, '') : '';
    const den = denMatch ? denMatch[1].replace(/<\/?m:e>/g, '') : '';
    return `<mfrac><mrow>${num}</mrow><mrow>${den}</mrow></mfrac>`;
  });

  // ── Process <m:rad> (radicals / roots) ──
  s = s.replace(/<m:rad>([\s\S]*?)<\/m:rad>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<m:radPr>[\s\S]*?<\/m:radPr>/g, '');
    const degMatch = cleaned.match(/<m:deg>([\s\S]*?)<\/m:deg>/);
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const deg = degMatch ? degMatch[1].trim() : '';
    const base = eMatch ? eMatch[1] : '';
    // Check if degree is empty (square root) or has content (nth root)
    const degText = deg.replace(/<[^>]*>/g, '').trim();
    if (!degText) {
      return `<msqrt><mrow>${base}</mrow></msqrt>`;
    }
    return `<mroot><mrow>${base}</mrow><mrow>${deg}</mrow></mroot>`;
  });

  // ── Process <m:sSup> (superscript) ──
  s = s.replace(/<m:sSup>([\s\S]*?)<\/m:sSup>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<m:sSupPr>[\s\S]*?<\/m:sSupPr>/g, '');
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const supMatch = cleaned.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
    const base = eMatch ? eMatch[1] : '';
    const sup = supMatch ? supMatch[1] : '';
    return `<msup><mrow>${base}</mrow><mrow>${sup}</mrow></msup>`;
  });

  // ── Process <m:sSub> (subscript) ──
  s = s.replace(/<m:sSub>([\s\S]*?)<\/m:sSub>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<m:sSubPr>[\s\S]*?<\/m:sSubPr>/g, '');
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const subMatch = cleaned.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
    const base = eMatch ? eMatch[1] : '';
    const sub = subMatch ? subMatch[1] : '';
    return `<msub><mrow>${base}</mrow><mrow>${sub}</mrow></msub>`;
  });

  // ── Process <m:sSubSup> (subscript + superscript) ──
  s = s.replace(/<m:sSubSup>([\s\S]*?)<\/m:sSubSup>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<m:sSubSupPr>[\s\S]*?<\/m:sSubSupPr>/g, '');
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const subMatch = cleaned.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
    const supMatch = cleaned.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
    const base = eMatch ? eMatch[1] : '';
    const sub = subMatch ? subMatch[1] : '';
    const sup = supMatch ? supMatch[1] : '';
    return `<msubsup><mrow>${base}</mrow><mrow>${sub}</mrow><mrow>${sup}</mrow></msubsup>`;
  });

  // ── Process <m:nary> (n-ary: summation, integral, product, etc.) ──
  s = s.replace(/<m:nary>([\s\S]*?)<\/m:nary>/g, (_match, inner: string) => {
    // Extract the operator character from <m:naryPr><m:chr m:val="∫"/>
    let chr = '∫'; // default to integral
    const chrMatch = inner.match(/<m:chr\s+m:val\s*=\s*"([^"]*)"/);
    if (chrMatch) chr = chrMatch[1];

    const cleaned = inner.replace(/<m:naryPr>[\s\S]*?<\/m:naryPr>/g, '');
    const subMatch = cleaned.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
    const supMatch = cleaned.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const sub = subMatch ? subMatch[1] : '';
    const sup = supMatch ? supMatch[1] : '';
    const body = eMatch ? eMatch[1] : '';

    return `<munderover><mo>${chr}</mo><mrow>${sub}</mrow><mrow>${sup}</mrow></munderover><mrow>${body}</mrow>`;
  });

  // ── Process <m:acc> (accents: hat, bar, dot, vec, etc.) ──
  s = s.replace(/<m:acc>([\s\S]*?)<\/m:acc>/g, (_match, inner: string) => {
    let accent = '^'; // default hat
    const chrMatch = inner.match(/<m:chr\s+m:val\s*=\s*"([^"]*)"/);
    if (chrMatch) accent = chrMatch[1];
    const cleaned = inner.replace(/<m:accPr>[\s\S]*?<\/m:accPr>/g, '');
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const base = eMatch ? eMatch[1] : '';
    return `<mover><mrow>${base}</mrow><mo>${accent}</mo></mover>`;
  });

  // ── Process <m:bar> (overbar / underbar) ──
  s = s.replace(/<m:bar>([\s\S]*?)<\/m:bar>/g, (_match, inner: string) => {
    const posMatch = inner.match(/<m:pos\s+m:val\s*=\s*"([^"]*)"/);
    const pos = posMatch ? posMatch[1] : 'top';
    const cleaned = inner.replace(/<m:barPr>[\s\S]*?<\/m:barPr>/g, '');
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const base = eMatch ? eMatch[1] : '';
    if (pos === 'bot') {
      return `<munder><mrow>${base}</mrow><mo>&#x0332;</mo></munder>`;
    }
    return `<mover><mrow>${base}</mrow><mo>&#x00AF;</mo></mover>`;
  });

  // ── Process <m:limLow> / <m:limUpp> (limits) ──
  s = s.replace(/<m:limLow>([\s\S]*?)<\/m:limLow>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<m:limLowPr>[\s\S]*?<\/m:limLowPr>/g, '');
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const limMatch = cleaned.match(/<m:lim>([\s\S]*?)<\/m:lim>/);
    const base = eMatch ? eMatch[1] : '';
    const lim = limMatch ? limMatch[1] : '';
    return `<munder><mrow>${base}</mrow><mrow>${lim}</mrow></munder>`;
  });
  s = s.replace(/<m:limUpp>([\s\S]*?)<\/m:limUpp>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<m:limUppPr>[\s\S]*?<\/m:limUppPr>/g, '');
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const limMatch = cleaned.match(/<m:lim>([\s\S]*?)<\/m:lim>/);
    const base = eMatch ? eMatch[1] : '';
    const lim = limMatch ? limMatch[1] : '';
    return `<mover><mrow>${base}</mrow><mrow>${lim}</mrow></mover>`;
  });

  // ── Process <m:m> (matrix) ──
  s = s.replace(/<m:m>([\s\S]*?)<\/m:m>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<m:mPr>[\s\S]*?<\/m:mPr>/g, '');
    // Each <m:mr> is a row, each <m:e> inside is a cell
    const rows: string[] = [];
    const rowRegex = /<m:mr>([\s\S]*?)<\/m:mr>/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(cleaned)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<m:e>([\s\S]*?)<\/m:e>/g;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(`<mtd><mrow>${cellMatch[1]}</mrow></mtd>`);
      }
      rows.push(`<mtr>${cells.join('')}</mtr>`);
    }
    return `<mtable>${rows.join('')}</mtable>`;
  });

  // ── Process <m:eqArr> (equation array — aligned equations) ──
  s = s.replace(/<m:eqArr>([\s\S]*?)<\/m:eqArr>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<m:eqArrPr>[\s\S]*?<\/m:eqArrPr>/g, '');
    const parts: string[] = [];
    const eRegex = /<m:e>([\s\S]*?)<\/m:e>/g;
    let eMatch;
    while ((eMatch = eRegex.exec(cleaned)) !== null) {
      parts.push(`<mtr><mtd><mrow>${eMatch[1]}</mrow></mtd></mtr>`);
    }
    return `<mtable>${parts.join('')}</mtable>`;
  });

  // ── Process <m:func> (function application, e.g. sin, cos) ──
  s = s.replace(/<m:func>([\s\S]*?)<\/m:func>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<m:funcPr>[\s\S]*?<\/m:funcPr>/g, '');
    const fnameMatch = cleaned.match(/<m:fName>([\s\S]*?)<\/m:fName>/);
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const fname = fnameMatch ? fnameMatch[1] : '';
    const body = eMatch ? eMatch[1] : '';
    return `<mrow>${fname}</mrow><mo>&#x2061;</mo><mrow>${body}</mrow>`;
  });

  // ── Process <m:groupChr> (grouping character — brace above/below) ──
  s = s.replace(/<m:groupChr>([\s\S]*?)<\/m:groupChr>/g, (_match, inner: string) => {
    let chr = '⏟';
    const chrMatch = inner.match(/<m:chr\s+m:val\s*=\s*"([^"]*)"/);
    if (chrMatch) chr = chrMatch[1];
    const posMatch = inner.match(/<m:pos\s+m:val\s*=\s*"([^"]*)"/);
    const pos = posMatch ? posMatch[1] : 'bot';
    const cleaned = inner.replace(/<m:groupChrPr>[\s\S]*?<\/m:groupChrPr>/g, '');
    const eMatch = cleaned.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const base = eMatch ? eMatch[1] : '';
    if (pos === 'top') {
      return `<mover><mrow>${base}</mrow><mo>${chr}</mo></mover>`;
    }
    return `<munder><mrow>${base}</mrow><mo>${chr}</mo></munder>`;
  });

  // ── Clean up remaining OMML structural wrappers ──
  // Remove any remaining property blocks
  s = s.replace(/<m:\w+Pr>[\s\S]*?<\/m:\w+Pr>/g, '');

  // <m:r><m:t>text</m:t></m:r> → identify as <mi>, <mn>, or <mo>
  s = s.replace(/<m:r>\s*<m:t\b[^>]*>([\s\S]*?)<\/m:t>\s*<\/m:r>/g, (_match, text: string) => {
    const t = text.trim();
    if (!t) return '';
    // Numbers
    if (/^\d+([.,]\d+)?$/.test(t)) return `<mn>${t}</mn>`;
    // Operators and punctuation
    if (/^[+\-×÷·=<>≤≥≠≈±∓∞∑∏∫∂∇√∘∙∧∨¬⊂⊃⊆⊇∈∉∪∩→←↔⇒⇐⇔,.;:!?()[\]{}|/\\]$/.test(t)) return `<mo>${t}</mo>`;
    // Single letter → identifier
    if (t.length === 1) return `<mi>${t}</mi>`;
    // Multi-letter: could be function name or variable
    if (/^(sin|cos|tan|cot|sec|csc|log|ln|lim|max|min|sup|inf|det|dim|ker|deg|exp|arg|gcd|Pr)$/i.test(t)) return `<mi mathvariant="normal">${t}</mi>`;
    return `<mi>${t}</mi>`;
  });

  // Strip remaining m: tags that we didn't handle
  s = s.replace(/<\/?m:\w+[^>]*>/g, '');

  // Wrap in <math> if not already
  if (!s.includes('<math')) {
    s = `<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow>${s}</mrow></math>`;
  }

  return s;
}

/**
 * Extract raw text content from OMML XML by pulling text from <m:t> elements.
 * Used as fallback when full LaTeX conversion fails.
 * Also handles case-insensitive namespace and content with XML entities.
 */
function extractRawTextFromOmml(ommlXml: string): string {
  const parts: string[] = [];
  // Match <m:t> with any attributes, and capture content that may contain XML entities
  const mtRegex = /<m:t\b[^>]*>([\s\S]*?)<\/m:t>/gi;
  let m;
  while ((m = mtRegex.exec(ommlXml)) !== null) {
    // Strip any nested XML tags and decode basic entities
    const t = m[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
    if (t) parts.push(t);
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}

/**
 * Try to build basic LaTeX directly from OMML structure without going through MathML.
 * This is a simpler but more reliable fallback for when the MathML path fails.
 */
function ommlToLatexDirect(ommlXml: string): string {
  let s = ommlXml;
  
  // Strip all property blocks first
  s = s.replace(/<m:rPr>[\s\S]*?<\/m:rPr>/g, '');
  s = s.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, '');
  s = s.replace(/<m:ctrlPr>[\s\S]*?<\/m:ctrlPr>/g, '');
  s = s.replace(/<m:\w+Pr>[\s\S]*?<\/m:\w+Pr>/g, '');
  
  // Fractions: <m:f><m:num>...</m:num><m:den>...</m:den></m:f>
  s = s.replace(/<m:f>([\s\S]*?)<\/m:f>/g, (_m, inner: string) => {
    const num = (inner.match(/<m:num>([\s\S]*?)<\/m:num>/) || [])[1] || '';
    const den = (inner.match(/<m:den>([\s\S]*?)<\/m:den>/) || [])[1] || '';
    const numText = extractRawTextFromOmml(num) || num.replace(/<[^>]*>/g, '').trim();
    const denText = extractRawTextFromOmml(den) || den.replace(/<[^>]*>/g, '').trim();
    return `\\frac{${numText}}{${denText}}`;
  });
  
  // Superscript
  s = s.replace(/<m:sSup>([\s\S]*?)<\/m:sSup>/g, (_m, inner: string) => {
    const base = (inner.match(/<m:e>([\s\S]*?)<\/m:e>/) || [])[1] || '';
    const sup = (inner.match(/<m:sup>([\s\S]*?)<\/m:sup>/) || [])[1] || '';
    const baseText = extractRawTextFromOmml(base) || base.replace(/<[^>]*>/g, '').trim();
    const supText = extractRawTextFromOmml(sup) || sup.replace(/<[^>]*>/g, '').trim();
    return `${baseText}^{${supText}}`;
  });
  
  // Subscript
  s = s.replace(/<m:sSub>([\s\S]*?)<\/m:sSub>/g, (_m, inner: string) => {
    const base = (inner.match(/<m:e>([\s\S]*?)<\/m:e>/) || [])[1] || '';
    const sub = (inner.match(/<m:sub>([\s\S]*?)<\/m:sub>/) || [])[1] || '';
    const baseText = extractRawTextFromOmml(base) || base.replace(/<[^>]*>/g, '').trim();
    const subText = extractRawTextFromOmml(sub) || sub.replace(/<[^>]*>/g, '').trim();
    return `${baseText}_{${subText}}`;
  });
  
  // Radicals
  s = s.replace(/<m:rad>([\s\S]*?)<\/m:rad>/g, (_m, inner: string) => {
    const deg = (inner.match(/<m:deg>([\s\S]*?)<\/m:deg>/) || [])[1] || '';
    const base = (inner.match(/<m:e>([\s\S]*?)<\/m:e>/) || [])[1] || '';
    const degText = extractRawTextFromOmml(deg) || deg.replace(/<[^>]*>/g, '').trim();
    const baseText = extractRawTextFromOmml(base) || base.replace(/<[^>]*>/g, '').trim();
    if (!degText) return `\\sqrt{${baseText}}`;
    return `\\sqrt[${degText}]{${baseText}}`;
  });

  // Delimiters (parentheses, brackets)
  s = s.replace(/<m:d>([\s\S]*?)<\/m:d>/g, (_m, inner: string) => {
    let open = '(';
    let close = ')';
    const begMatch = inner.match(/<m:begChr\s+m:val\s*=\s*"([^"]*)"/); 
    const endMatch = inner.match(/<m:endChr\s+m:val\s*=\s*"([^"]*)"/); 
    if (begMatch) open = begMatch[1] || '(';
    if (endMatch) close = endMatch[1] || ')';
    const cleaned = inner.replace(/<m:dPr>[\s\S]*?<\/m:dPr>/g, '');
    const text = extractRawTextFromOmml(cleaned) || cleaned.replace(/<[^>]*>/g, '').trim();
    return `\\left${open}${text}\\right${close}`;
  });
  
  // N-ary (integrals, sums)
  s = s.replace(/<m:nary>([\s\S]*?)<\/m:nary>/g, (_m, inner: string) => {
    let chr = '∫';
    const chrMatch = inner.match(/<m:chr\s+m:val\s*=\s*"([^"]*)"/); 
    if (chrMatch) chr = chrMatch[1];
    const sub = (inner.match(/<m:sub>([\s\S]*?)<\/m:sub>/) || [])[1] || '';
    const sup = (inner.match(/<m:sup>([\s\S]*?)<\/m:sup>/) || [])[1] || '';
    const body = (inner.match(/<m:e>([\s\S]*?)<\/m:e>/) || [])[1] || '';
    const subText = extractRawTextFromOmml(sub) || sub.replace(/<[^>]*>/g, '').trim();
    const supText = extractRawTextFromOmml(sup) || sup.replace(/<[^>]*>/g, '').trim();
    const bodyText = extractRawTextFromOmml(body) || body.replace(/<[^>]*>/g, '').trim();
    const op = chr === '∑' ? '\\sum' : chr === '∏' ? '\\prod' : '\\int';
    let result = op;
    if (subText) result += `_{${subText}}`;
    if (supText) result += `^{${supText}}`;
    if (bodyText) result += ` ${bodyText}`;
    return result;
  });

  // Function names (sin, cos, etc.)
  s = s.replace(/<m:func>([\s\S]*?)<\/m:func>/g, (_m, inner: string) => {
    const fname = (inner.match(/<m:fName>([\s\S]*?)<\/m:fName>/) || [])[1] || '';
    const body = (inner.match(/<m:e>([\s\S]*?)<\/m:e>/) || [])[1] || '';
    const fnText = extractRawTextFromOmml(fname) || fname.replace(/<[^>]*>/g, '').trim();
    const bodyText = extractRawTextFromOmml(body) || body.replace(/<[^>]*>/g, '').trim();
    return `\\${fnText}{${bodyText}}`;
  });

  // Limits
  s = s.replace(/<m:limLow>([\s\S]*?)<\/m:limLow>/g, (_m, inner: string) => {
    const base = (inner.match(/<m:e>([\s\S]*?)<\/m:e>/) || [])[1] || '';
    const lim = (inner.match(/<m:lim>([\s\S]*?)<\/m:lim>/) || [])[1] || '';
    const baseText = extractRawTextFromOmml(base) || base.replace(/<[^>]*>/g, '').trim();
    const limText = extractRawTextFromOmml(lim) || lim.replace(/<[^>]*>/g, '').trim();
    return `${baseText}_{${limText}}`;
  });
  
  // Extract remaining text from all <m:t> elements and strip XML
  const remaining = extractRawTextFromOmml(s);
  if (remaining) return remaining;
  
  // Ultimate fallback: strip ALL XML tags
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Convert OMML XML fragment to LaTeX string.
 * Pipeline: OMML → MathML → LaTeX (via mathml-to-latex library)
 * Falls back to direct OMML→LaTeX conversion, then raw text extraction.
 */
function ommlFragmentToLatex(ommlXml: string): string {
  // Strategy 1: Full pipeline — OMML → MathML → LaTeX
  if (MathMLToLaTeX) {
    try {
      const mathml = ommlNodeToMathml(ommlXml);
      const latex = MathMLToLaTeX.convert(mathml);
      const cleaned = latex.replace(/\s+/g, ' ').trim();
      if (cleaned && cleaned.length > 0) {
        return cleaned;
      }
    } catch (err) {
      console.warn('[omml-to-latex] MathML pipeline failed:', (err as Error).message);
    }
  } else {
    console.warn('[omml-to-latex] MathMLToLaTeX not available, using direct conversion');
  }

  // Strategy 2: Direct OMML → LaTeX (simpler but handles common cases)
  try {
    const directLatex = ommlToLatexDirect(ommlXml);
    if (directLatex && directLatex.length > 0) {
      return directLatex;
    }
  } catch (err) {
    console.warn('[omml-to-latex] Direct conversion failed:', (err as Error).message);
  }

  // Strategy 3: Raw text extraction from <m:t> elements
  const rawText = extractRawTextFromOmml(ommlXml);
  if (rawText) return rawText;

  return '\\text{[formula]}';
}

/* ─── Main: process a .docx buffer ─── */

/**
 * Open a .docx file, find all OMML math elements in word/document.xml,
 * convert each to LaTeX, and replace them with text markers in the XML.
 * Returns a new .docx buffer with math replaced by [[LATEX:$...$]] markers.
 *
 * Mammoth will then treat these markers as plain text, and our tokenizer
 * will convert them back to proper $...$ delimiters.
 */
export async function preprocessDocxMath(buffer: Buffer): Promise<Buffer> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      console.warn('[omml-to-latex] No word/document.xml found in docx');
      return buffer; // return original, nothing to process
    }

    let xml = await docXmlFile.async('string');

    // Count math elements for logging
    let mathCount = 0;
    let convertedCount = 0;
    let oleReplacedCount = 0;

    // ── Pre-pass: handle <w:object> blocks with OLE equation objects ──
    // Leaving <w:object> unmodified allows Mammoth to extract the fallback WMF image.
    // Downstream, wmf-converter will convert these WMFs to PNGs on Windows,
    // and ole-extractor will map them to LaTeX if binary MTEF strings exist.
    xml = xml.replace(/<w:object\b[^>]*>([\s\S]*?)<\/w:object>/gi, (_match: string, inner: string) => {
      // Find the <o:OLEObject> tag
      const oleTagMatch = inner.match(/<o:OLEObject\b([^>]*)>/i);
      if (!oleTagMatch) return _match;
      
      const oleAttrs = oleTagMatch[1];
      const progIdMatch = oleAttrs.match(/ProgID="([^"]*)"/i);
      if (progIdMatch && (progIdMatch[1].includes('Equation') || progIdMatch[1].includes('MathType'))) {
          // Just track that we have them; no replacement inside the XML.
          oleReplacedCount++;
      }
      return _match; // DO NOT STRIP THE WMF IMAGE!
    });

    if (oleReplacedCount > 0) {
      console.log(`[omml-to-latex] Found ${oleReplacedCount} OLE equation objects (MathType/Equation.3). Preserving for WMF+OLE extraction.`);
    }


    // ── First: extract OMML from <mc:AlternateContent> blocks ──
    // MathType and Word sometimes wrap math in AlternateContent with
    // <mc:Choice Requires="wps"> containing OMML and <mc:Fallback> containing WMF.
    // We prefer the OMML (Choice) and remove the Fallback.
    xml = xml.replace(/<mc:AlternateContent\b[^>]*>([\s\S]*?)<\/mc:AlternateContent>/g, (_match, inner: string) => {
      // Check if there's OMML inside the Choice block
      const choiceMatch = inner.match(/<mc:Choice\b[^>]*>([\s\S]*?)<\/mc:Choice>/);
      if (choiceMatch) {
        const choiceContent = choiceMatch[1];
        // If Choice contains OMML, use it
        if (/<m:oMath\b/.test(choiceContent) || /<m:oMathPara\b/.test(choiceContent)) {
          return choiceContent;
        }
      }
      return _match; // keep original if no OMML found
    });

    // ── Replace <m:oMathPara>...</m:oMathPara> (display math) ──
    // These are paragraph-level math blocks (like $$...$$)
    xml = xml.replace(/<m:oMathPara\b[^>]*>([\s\S]*?)<\/m:oMathPara>/g, (_match, inner: string) => {
      mathCount++;
      // There may be multiple <m:oMath> inside one <m:oMathPara>
      const oMathBlocks: string[] = [];
      const omathRegex = /<m:oMath\b[^>]*>([\s\S]*?)<\/m:oMath>/g;
      let omMatch;
      while ((omMatch = omathRegex.exec(inner)) !== null) {
        const latex = ommlFragmentToLatex(omMatch[1]);
        if (latex && latex !== '\\text{[formula]}') {
          oMathBlocks.push(latex);
          convertedCount++;
        }
      }
      if (oMathBlocks.length > 0) {
        const combined = oMathBlocks.join(' ');
        return `<w:r><w:t xml:space="preserve"> [[LATEX:$$${combined}$$]] </w:t></w:r>`;
      }
      // NEVER return original OMML — mammoth will strip it and lose all formula content.
      // Extract raw text as last resort.
      const rawText = extractRawTextFromOmml(inner);
      if (rawText) {
        convertedCount++;
        return `<w:r><w:t xml:space="preserve"> [[LATEX:$$${rawText}$$]] </w:t></w:r>`;
      }
      return `<w:r><w:t xml:space="preserve"> [formula] </w:t></w:r>`;
    });

    // ── Replace remaining <m:oMath>...</m:oMath> (inline math) ──
    // These are inline math within a paragraph (like $...$)
    xml = xml.replace(/<m:oMath\b[^>]*>([\s\S]*?)<\/m:oMath>/g, (_match, inner: string) => {
      mathCount++;
      const latex = ommlFragmentToLatex(inner);
      if (latex && latex !== '\\text{[formula]}') {
        convertedCount++;
        return `<w:r><w:t xml:space="preserve"> [[LATEX:$${latex}$]] </w:t></w:r>`;
      }
      // NEVER return original OMML — mammoth will strip it and lose all formula content.
      const rawText = extractRawTextFromOmml(inner);
      if (rawText) {
        convertedCount++;
        return `<w:r><w:t xml:space="preserve"> [[LATEX:$${rawText}$]] </w:t></w:r>`;
      }
      return `<w:r><w:t xml:space="preserve"> [formula] </w:t></w:r>`;
    });

    if (mathCount > 0) {
      console.log(`[omml-to-latex] Found ${mathCount} OMML math elements, converted ${convertedCount} to LaTeX`);
    } else {
      // Log a hint: the document may use MathType OLE objects instead of OMML
      const hasOle = xml.includes('oleObject') || xml.includes('OLEObject');
      const hasWmf = xml.includes('x-wmf') || xml.includes('image/wmf');
      console.log(`[omml-to-latex] No OMML math found in document.xml.${hasOle ? ' Document contains OLE objects (MathType).' : ''}${hasWmf ? ' WMF images detected — will convert via GDI+/LibreOffice.' : ''}`);
    }

    if (mathCount === 0 && oleReplacedCount === 0) {
      return buffer; // no math found at all, return original
    }

    // Write modified XML back into the zip
    zip.file('word/document.xml', xml);

    // Repackage as buffer
    const newBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return Buffer.from(newBuffer) as Buffer;
  } catch (err) {
    console.warn('[omml-to-latex] Failed to preprocess docx math, returning original buffer:', err);
    return buffer; // graceful fallback
  }
}

/**
 * Extract LaTeX strings from [[LATEX:...]] markers in text.
 * Returns the text with markers replaced by their LaTeX content.
 */
export function resolveLatexMarkers(text: string): string {
  return text.replace(/\[\[LATEX:(.*?)\]\]/g, (_match, latex: string) => {
    return latex.trim();
  });
}
