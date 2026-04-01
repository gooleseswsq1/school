/**
 * OLE Object Extractor for Word Documents
 * Extracts MathType formulas stored as OLE objects in .docx files
 * 
 * MathType formulas in Word can be stored as:
 * 1. OoleObject elements in document.xml
 * 2. Binary data in embeddings folder
 * 3. Relationships pointing to formula data
 */

import JSZip from 'jszip';

export interface OleFormula {
  id: string;
  content: string;           // Raw formula content
  latex?: string;           // Extracted LaTeX if available
  mathml?: string;          // Extracted MathML if available
  fallbackImage?: string;   // Base64 of fallback image
}

/**
 * Extract text from OLE object binary data
 * OLE objects contain embedded formula data that can sometimes be read as text
 */
function extractTextFromOleBinary(buffer: Buffer): string {
  try {
    // OLE binary may contain formula data in UTF-8 and/or UTF-16LE streams.
    const utf8 = buffer.toString('utf8', 0, Math.min(buffer.length, 120000));
    const utf16 = buffer.toString('utf16le', 0, Math.min(buffer.length, 120000));
    const candidates = [utf8, utf16];

    for (const text of candidates) {
      if (!text) continue;

      // 1. MathML
      const mathmlMatch = text.match(/<math[\s\S]*?<\/math>/i);
      if (mathmlMatch) return mathmlMatch[0];

      // 2. Clear LaTeX blocks (often injected by plugins)
      // Must have actual LaTeX contents, not just single letters
      const latexMatch = text.match(/(?:\$[^$\r\n]{3,}\$|\\\([^\)]+\\\)|\\\[[\s\S]+?\\\]|\\begin\{[^}]*\}(?:.|\n)*?\\end\{[^}]*\})/);
      if (latexMatch) {
         const t = latexMatch[0].trim();
         if (t.length >= 4) return t;
      }
    }

    return '';
  } catch {
    return '';
  }
}


/**
 * Convert simple extracted formula text to basic LaTeX
 */
function simplifyFormulaToLatex(text: string): string {
  if (!text) return '';
  
  // Basic replacements for common formula patterns
  let latex = text
    // Fractions: a/b -> \frac{a}{b}
    .replace(/([A-Za-z0-9]+)\/([A-Za-z0-9]+)/g, '\\frac{$1}{$2}')
    // Powers: a^2 -> a^{2}
    .replace(/([A-Za-z0-9])\^([A-Za-z0-9]+)/g, '$1^{$2}')
    // Subscripts: a_1 -> a_{1}
    .replace(/([A-Za-z])\s*_\s*([A-Za-z0-9]+)/g, '$1_{$2}')
    // Square root: sqrt(x) -> \sqrt{x}
    .replace(/sqrt\s*\(\s*([^)]+)\s*\)/gi, '\\sqrt{$1}')
    // Multiplication: × * · → \times
    .replace(/[×*·]/g, '\\times')
    // PI symbol
    .replace(/π/g, '\\pi')
    // Degree symbol
    .replace(/°/g, '^\\circ');
  
  return latex;
}

/**
 * Extract OLE formulas from DOCX
 * Returns map of formula IDs to LaTeX/MathML content
 */
export async function extractOleFormulas(buffer: Buffer): Promise<Map<string, OleFormula>> {
  const formulas = new Map<string, OleFormula>();
  
  try {
    const zip = new JSZip();
    await zip.loadAsync(buffer);
    
    // Read document.xml and relationships
    const documentXml = await zip.file('word/document.xml')?.async('string') || '';
    const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string') || '';

    // Find all <w:object> blocks containing OLE equation objects
    // Structure: <w:object> contains <o:OLEObject ProgID="..." r:id="rIdN"/>
    // The r:id attribute (NOT ShapeID) references the embedded binary in relationships
    const objectPattern = /<w:object\b[^>]*>([\s\S]*?)<\/w:object>/gi;
    let objectMatch;
    let oleIndex = 0;

    while ((objectMatch = objectPattern.exec(documentXml)) !== null) {
      const blockContent = objectMatch[1];

      // Find the <o:OLEObject> tag with equation ProgID
      const oleTagMatch = blockContent.match(/<o:OLEObject\b([^>]*)>/i);
      if (!oleTagMatch) continue;

      const oleAttrs = oleTagMatch[1];
      const progIdMatch = oleAttrs.match(/ProgID="([^"]*)"/i);
      if (!progIdMatch) continue;

      const progId = progIdMatch[1];
      if (!progId.includes('Equation') && !progId.includes('MathType')) continue;

      // Get the relationship ID from r:id attribute (correct attribute, not ShapeID)
      const rIdMatch = oleAttrs.match(/r:id="([^"]*)"/i);
      if (!rIdMatch) continue;

      const rId = rIdMatch[1];
      const formulaId = `ole_${oleIndex++}`;

      // Look up the embedded file path in relationships
      const relMatch = relsXml.match(
        new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]*)"`, 'i')
      );
      if (!relMatch) continue;

      const embeddingTarget = relMatch[1];
      // Target can be relative like "embeddings/oleObject1.bin" or "../embeddings/..."
      const embeddingPath = embeddingTarget.startsWith('../')
        ? embeddingTarget.slice(3)
        : `word/${embeddingTarget}`;

      try {
        const embeddingData = await zip.file(embeddingPath)?.async('arraybuffer');
        if (embeddingData) {
          const embeddingBuffer = Buffer.from(embeddingData);
          const extractedText = extractTextFromOleBinary(embeddingBuffer);

          let latex = '';
          let mathml = '';

          if (extractedText.startsWith('<') && extractedText.includes('math')) {
            mathml = extractedText;
          } else if (extractedText.includes('\\')) {
            latex = extractedText;
          } else if (extractedText.length > 0) {
            latex = simplifyFormulaToLatex(extractedText);
          }

          if (latex || mathml) {
            formulas.set(formulaId, {
              id: formulaId,
              content: extractedText,
              latex: latex || undefined,
              mathml: mathml || undefined,
            });
          }
        }
      } catch (err) {
        console.warn(`[ole-extractor] Failed to extract embedding ${embeddingPath}:`, err);
      }
    }
    
    console.log(`[ole-extractor] Extracted ${formulas.size} OLE formulas from DOCX`);
  } catch (err) {
    console.warn('[ole-extractor] Error extracting OLE formulas:', err);
  }
  
  return formulas;
}

/**
 * Replace WMF images with extracted OLE formulas in imageMap
 * For each WMF image in the imageMap, attempt to replace with corresponding LaTeX formula
 */
export function replaceOleImagesWithLatex(
  wmfEntries: { index: number; base64: string }[],
  formulas: Map<string, OleFormula>,
  imageMap: Map<number, string>
): number {
  let replacedCount = 0;
  
  // Convert formulas map to array for iteration
  const formulasArray = Array.from(formulas.values());
  
  // For each WMF image, try to find and replace with corresponding formula
  for (let i = 0; i < wmfEntries.length && i < formulasArray.length; i++) {
    const wmfEntry = wmfEntries[i];
    const formula = formulasArray[i];
    
    if (formula.latex) {
      // Replace the WMF base64 in imageMap with a LaTeX marker
      // Format: [[LATEX:$...$]] for downstream renderer compatibility
      const trimmed = formula.latex.trim();
      const latexWithDelimiters =
        trimmed.startsWith('$') || trimmed.startsWith('\\(') || trimmed.startsWith('\\[')
          ? trimmed
          : `$${trimmed}$`;
      const latexMarker = `[[LATEX:${latexWithDelimiters}]]`;
      imageMap.set(wmfEntry.index, latexMarker);
      replacedCount++;
    }
  }
  
  return replacedCount;
}
