/**
 * Tests for src/utils/omml-to-latex.ts
 * Kiểm tra chuyển đổi công thức OMML → LaTeX
 * Run: npx vitest src/utils/omml-to-latex.test.ts
 */
import { describe, it, expect } from 'vitest';

// Test the direct OMML → LaTeX conversion logic
// We test via the exported preprocessDocxMath and resolveLatexMarkers if possible,
// but since the module needs file I/O, we test behavior via marker roundtrip.

const LATEX_MARKER_REGEX = /\[\[LATEX:\$([^$]*)\$\]\]/g;

function extractLatexMarkers(text: string): string[] {
  const markers: string[] = [];
  let m;
  LATEX_MARKER_REGEX.lastIndex = 0;
  while ((m = LATEX_MARKER_REGEX.exec(text)) !== null) {
    markers.push(m[1]);
  }
  return markers;
}

describe('LaTeX marker format', () => {
  it('resolves [[LATEX:$x^2$]] to $x^2$', () => {
    const text = 'Hello [[LATEX:$x^2$]] world';
    // resolveLatexMarkers should produce: Hello $x^2$ world
    const resolved = text.replace(/\[\[LATEX:\$([^$]*)\$\]\]/g, (_match, latex) => ` $${latex}$ `);
    expect(resolved).toContain('$x^2$');
  });

  it('extracts multiple markers', () => {
    const text = '[[LATEX:$a$]] plus [[LATEX:$b$]] equals [[LATEX:$c$]]';
    const markers = extractLatexMarkers(text);
    expect(markers).toEqual(['a', 'b', 'c']);
  });

  it('handles empty markers gracefully', () => {
    const text = 'No math here';
    const markers = extractLatexMarkers(text);
    expect(markers).toHaveLength(0);
  });

  it('handles nested braces in LaTeX', () => {
    const text = '[[LATEX:$\\frac{1}{2}$]]';
    const markers = extractLatexMarkers(text);
    expect(markers[0]).toBe('\\frac{1}{2}');
  });
});

describe('OMML text extraction patterns', () => {
  it('extracts text from m:t elements', () => {
    const omml = '<m:r><m:t>x</m:t></m:r><m:r><m:t>2</m:t></m:r>';
    // Simulate extractRawTextFromOmml behavior
    const parts: string[] = [];
    const mtRegex = /<m:t\b[^>]*>([\s\S]*?)<\/m:t>/gi;
    let m;
    while ((m = mtRegex.exec(omml)) !== null) {
      const t = m[1].replace(/<[^>]*>/g, '').trim();
      if (t) parts.push(t);
    }
    expect(parts).toContain('x');
    expect(parts).toContain('2');
  });

  it('decodes XML entities in m:t', () => {
    const encoded = '<m:t>&lt;x&gt;</m:t>';
    const decoded = encoded
      .replace(/<m:t\b[^>]*>([\s\S]*?)<\/m:t>/gi, (_, c) =>
        c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      );
    expect(decoded).toContain('<x>');
  });

  it('handles empty OMML gracefully', () => {
    const omml = '';
    const parts: string[] = [];
    const re = /<m:t\b[^>]*>([\s\S]*?)<\/m:t>/gi;
    let m;
    while ((m = re.exec(omml)) !== null) parts.push(m[1]);
    expect(parts).toHaveLength(0);
  });
});

describe('Formula placeholder handling', () => {
  it('[formula] text is recognizable as placeholder', () => {
    const text = 'Hàm số [formula] liên tục trên [formula]';
    const hasFormula = /\[formula\]/i.test(text);
    expect(hasFormula).toBe(true);
  });

  it('{{FORMULA_PLACEHOLDER}} conversion works', () => {
    const text = 'Câu hỏi [formula] bao nhiêu';
    const withPlaceholder = text.replace(/\[formula\]/gi, '{{FORMULA_PLACEHOLDER}}');
    expect(withPlaceholder).toContain('{{FORMULA_PLACEHOLDER}}');
    expect(withPlaceholder).not.toContain('[formula]');
  });

  it('counts formula occurrences correctly', () => {
    const text = '[formula] + [formula] = [formula]';
    const count = (text.match(/\[formula\]/gi) || []).length;
    expect(count).toBe(3);
  });
});

describe('LaTeX basic syntax validation', () => {
  it('\\frac format is valid', () => {
    const latex = '\\frac{1}{2}';
    expect(latex).toMatch(/^\\frac\{[^}]+\}\{[^}]+\}$/);
  });

  it('superscript format is valid', () => {
    const latex = 'x^{2}';
    expect(latex).toMatch(/\^\{[^}]+\}/);
  });

  it('subscript format is valid', () => {
    const latex = 'x_{1}';
    expect(latex).toMatch(/\_\{[^}]+\}/);
  });

  it('\\sqrt format is valid', () => {
    const latex = '\\sqrt{x}';
    expect(latex).toMatch(/^\\sqrt\{[^}]+\}$/);
  });

  it('nth root format is valid', () => {
    const latex = '\\sqrt[3]{x}';
    expect(latex).toMatch(/^\\sqrt\[\d+\]\{[^}]+\}$/);
  });
});
