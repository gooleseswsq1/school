// app/api/exam-banks/parse/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  formatTF4AnswerString,
  hasUnderlinedToken,
  inferMcqAnswerFromUnderline,
  inferTF4AnswersFromUnderline,
  stripParserTokens,
} from '@/utils/exam-answer-inference';
import { convertWmfImage, isWmfImage, isDisplayableImage as isDisplayableImageUtil, batchConvertWmfImages } from '@/utils/wmf-converter';
import { preprocessDocxMath, resolveLatexMarkers } from '@/utils/omml-to-latex';
import { extractOleFormulas, replaceOleImagesWithLatex, type OleFormula } from '@/utils/ole-extractor';

const prisma = new PrismaClient();

/* ─── Types ── */
interface ParsedQuestion {
  id: string;
  num: number;
  text: string;
  type: 'mcq' | 'tf' | 'tf4' | 'essay' | 'saq';
  options: string[];
  /** For tf4: sub-items with Đúng/Sai answers */
  subItems?: { label: string; text: string; answer: string; isUnderlined?: boolean }[];
  answer: string;
  points: number;
  difficulty: number;
  chapter?: string;
  images: string[];               // base64 data URIs for block-level images (graphs, tables)
  inlineImages: string[];          // base64 data URIs for inline images (formulas) referenced by {{INLINE_IMG:N}} in text
  status: 'ok' | 'warn' | 'error';
  warnMsg?: string;
}

/* ─── Difficulty mapping ── */
function numToDifficulty(n: number): 'EASY' | 'MEDIUM' | 'HARD' {
  if (n <= 1) return 'EASY';
  if (n <= 2) return 'MEDIUM';
  return 'HARD';
}

/* ═══════════════════════════════════════════════════════════════
   HTML-aware parser — reads mammoth HTML to preserve image positions
   ═══════════════════════════════════════════════════════════════ */

/** Split mammoth HTML into a sequence of {type:'text'|'img', value} tokens */
function tokenizeHtml(html: string): { type: 'text' | 'img'; value: string }[] {
  const tokens: { type: 'text' | 'img'; value: string }[] = [];
  // Strip tags except <img>, convert <br> / <p> to newlines
  let cleaned = html
    // Preserve underlined spans to infer answer when no explicit answer symbol exists.
    .replace(/<(u|ins)\b[^>]*>/gi, ' [[UL]] ')
    .replace(/<\/\s*(u|ins)\s*>/gi, ' [[/UL]] ')
    .replace(/<span\b[^>]*style\s*=\s*"[^"]*text-decoration\s*:\s*underline[^"]*"[^>]*>/gi, ' [[UL]] ')
    .replace(/<span\b[^>]*style\s*=\s*"[^"]*underline[^"]*"[^>]*>/gi, ' [[UL]] ')
    .replace(/<\/\s*span\s*>/gi, ' [[/UL]] ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');

  // Resolve [[LATEX:...]] markers injected during OMML preprocessing
  cleaned = cleaned.replace(/\[\[LATEX:(.*?)\]\]/g, (_m, latex: string) => ` ${latex.trim()} `);

  // Extract <img src="..."> as image tokens, text as text tokens
  const imgRegex = /<img\s+[^>]*src\s*=\s*"([^"]+)"[^>]*>/gi;
  let lastIndex = 0;
  let match;
  while ((match = imgRegex.exec(cleaned)) !== null) {
    const before = cleaned.slice(lastIndex, match.index).replace(/<[^>]*>/g, '');
    if (before.trim()) tokens.push({ type: 'text', value: before });
    tokens.push({ type: 'img', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  const rest = cleaned.slice(lastIndex).replace(/<[^>]*>/g, '');
  if (rest.trim()) tokens.push({ type: 'text', value: rest });
  return tokens;
}

/** Merge tokens into lines, preserving image positions as {{IMG:index}} placeholders */
function tokensToAnnotatedLines(tokens: { type: 'text' | 'img'; value: string }[]): { lines: string[]; imageMap: Map<number, string> } {
  const imageMap = new Map<number, string>();
  let imgCounter = 0;
  let combined = '';
  for (const tok of tokens) {
    if (tok.type === 'img') {
      imageMap.set(imgCounter, tok.value);
      combined += `{{IMG:${imgCounter}}}`;
      imgCounter++;
    } else {
      combined += tok.value;
    }
  }
  const lines = combined
    .replace(/\u00A0/g, ' ')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  return { lines, imageMap };
}

/* ─── Parse annotated lines → questions ── */
function parseAnnotatedLines(lines: string[], imageMap: Map<number, string>): {
  questions: ParsedQuestion[];
  subject?: string;
  chapter?: string;
  imageMap: Map<number, string>;
} {
  const questions: ParsedQuestion[] = [];

  let detectedSubject = '';
  let detectedChapter = '';
  for (const line of lines.slice(0, 30)) {
    const subjectMatch = line.match(/Môn\s*[:\-]\s*([^|[\]]+)/i);
    if (subjectMatch) detectedSubject = subjectMatch[1].trim();
    const chapterMatch = line.match(/Chương\s*[:\-]\s*([^[\]]+)/i);
    if (chapterMatch) detectedChapter = chapterMatch[1].trim();
  }

  // Regex patterns
  // Câu 1: [TF4] Nội dung...  OR  Câu 1: [SAQ] Nội dung...  OR  Câu 1: Nội dung...
  const qRegex = /^Câu\s*(\d+)\s*[:.)\-]?\s*(?:\[(TF4|TF|SAQ|TL|MCQ)\]\s*)?(.*)$/i;
  // Alternative format: Câu 1(TF4): ... or Câu 1(SAQ) ...
  const qRegexAlt = /^Câu\s*(\d+)\s*\((TF4|TF|SAQ|TL|MCQ)\)\s*[:.)\-]?\s*(.*)$/i;

  const optionRegex = /^([A-D])[.\s)]+(.+)$/;  // Case-sensitive: only uppercase A-D
  const subItemRegex = /^([a-z])\)\s*(.+)$/i;
  const sectionRegex = /^PH[ẦA]N\s*\d+/i;
  const answerLineRegex = /^Đáp\s*án\s*(?:đúng)?\s*[:\-]?\s*(.*)$/i;
  // New: ĐS. answer format — "ĐS. A" for MCQ, "ĐS. T,S,S,S" for TF4
  const dsAnswerRegex = /^[ĐD][SsƯư]\s*[.:\-]\s*(.+)$/;

  /** Only include browser-displayable image formats (exclude EMF/WMF Word equation images) */
  function isDisplayableImage(src: string): boolean {
    return isDisplayableImageUtil(src);
  }

  /** Check if image is WMF/EMF that needs conversion */
  function isWmfEmfImage(src: string): boolean {
    return isWmfImage(src);
  }

  /** Extract image data URIs from text containing {{IMG:N}} placeholders.
   *  Includes both displayable images AND WMF images (marked for conversion) */
  function extractImages(text: string): string[] {
    const imgs: string[] = [];
    let m;
    const re = /\{\{IMG:(\d+)\}\}/g;
    while ((m = re.exec(text)) !== null) {
      const src = imageMap.get(parseInt(m[1], 10));
      if (src && (isDisplayableImage(src) || isWmfEmfImage(src))) imgs.push(src);
    }
    return imgs;
  }

  /** Clean parser placeholders from display text, preserving LaTeX */
  function cleanImgTags(text: string): string {
    let cleaned = stripParserTokens(text);
    // Resolve any remaining [[LATEX:...]] markers
    cleaned = resolveLatexMarkers(cleaned);
    return cleaned;
  }

  let i = 0;
  while (i < lines.length) {
    let qMatch = lines[i].match(qRegex);
    if (!qMatch) { i++; continue; }

    const num = parseInt(qMatch[1], 10);
    const hint = (qMatch[2] || '').toUpperCase();
    const textParts: string[] = [qMatch[3] || ''];
    const options: string[] = [];
    const subItems: { label: string; text: string; answer: string; isUnderlined?: boolean }[] = [];
    let answer = '';
    let points = 1;
    let difficulty = 1;
    let chapter = detectedChapter;

    i += 1;

    // Collect content until next question or section
    while (i < lines.length) {
      const line = lines[i];
      if (qRegex.test(line) || sectionRegex.test(line)) break;

      // Strip [[UL]]/[[/UL]] markers for regex matching (they break ^anchored patterns)
      const lineNoUl = line.replace(/\[\[\/?UL\]\]/g, '').replace(/\s+/g, ' ').trim();

      // For TF4/TF questions, check sub-items FIRST (before MCQ options)
      // to prevent a)/b)/c)/d) being captured as A./B./C./D. options
      if (hint === 'TF4' || hint === 'TF') {
        const subMatch = lineNoUl.match(subItemRegex);
        if (subMatch) {
          subItems.push({
            label: subMatch[1].toLowerCase(),
            text: cleanImgTags(subMatch[2]),
            answer: '',
            isUnderlined: hasUnderlinedToken(line), // Check ORIGINAL line for underline
          });
          i += 1;
          continue;
        }
      }

      // A. B. C. D. options (MCQ)
      const optMatch = lineNoUl.match(optionRegex);
      if (optMatch) {
        options.push(optMatch[2]); // Store ONLY content, prefix added by UI
        i += 1;
        continue;
      }

      // ĐS. answer line — new format: "ĐS. A" (MCQ) or "ĐS. T,S,S,S" (TF4)
      const dsMatch = lineNoUl.match(dsAnswerRegex);
      if (dsMatch) {
        const dsValue = dsMatch[1].trim();
        // Check if TF4 format: comma-separated T/S values (e.g. T,S,S,S or Đ,S,Đ,S)
        const tf4Tokens = dsValue.split(/[,\s]+/).filter(t => /^[TĐStsđ]$/i.test(t));
        if (tf4Tokens.length >= 2 && subItems.length > 0) {
          // TF4 answer: assign to sub-items by position
          const labels = 'abcdefghijklmnopqrstuvwxyz'.split('');
          for (let si = 0; si < tf4Tokens.length && si < subItems.length; si++) {
            const val = /^[TĐtđ]$/i.test(tf4Tokens[si]) ? 'Đúng' : 'Sai';
            const sub = subItems.find(s => s.label === labels[si]);
            if (sub) sub.answer = val;
          }
          answer = subItems.map(s => `${s.label}-${s.answer === 'Đúng' ? 'Đ' : 'S'}`).join(' ');
        } else {
          // MCQ answer: single letter A/B/C/D
          const letter = dsValue.toUpperCase().charAt(0);
          if (['A', 'B', 'C', 'D'].includes(letter)) {
            answer = letter;
          } else {
            answer = dsValue; // Fallback: store raw
          }
        }
        i += 1;
        continue;
      }

      // Đáp án line
      const ansMatch = line.match(answerLineRegex);
      if (ansMatch) {
        let rawAns = ansMatch[1].trim();
        // Also parse bracket metadata from the same answer line
        const ansLineBrackets = Array.from(line.matchAll(/\[([^\]]+)\]/g)).map(m => m[1]);
        for (const token of ansLineBrackets) {
          const [kRaw, ...rest] = token.split(':');
          const key = (kRaw || '').trim().toLowerCase();
          const value = rest.join(':').trim();
          if (!key) continue;
          if (key.includes('điểm')) points = Number.parseFloat(value) || points;
          if (key.includes('độ khó')) difficulty = Number.parseInt(value, 10) || difficulty;
          if (key.includes('chương')) chapter = value || chapter;
        }
        // Strip bracket metadata from answer value: "A   [Độ khó: 1]  [Điểm: 0.5]"
        rawAns = rawAns.replace(/\[.*$/, '').trim();
        if (rawAns) {
          answer = rawAns;
        } else {
          // SAQ: answer is on the NEXT line
          if (i + 1 < lines.length && !qRegex.test(lines[i + 1]) && !qRegexAlt.test(lines[i + 1])) {
            i += 1;
            answer = cleanImgTags(lines[i]);
          }
        }
        i += 1;
        continue;
      }

      // Bracket metadata: [Điểm: X] [Độ khó: N] [Chương: X] [Từ khóa: ...]
      const bracketTokens = Array.from(line.matchAll(/\[([^\]]+)\]/g)).map(m => m[1]);
      if (bracketTokens.length > 0) {
        for (const token of bracketTokens) {
          const [kRaw, ...rest] = token.split(':');
          const key = (kRaw || '').trim().toLowerCase();
          const value = rest.join(':').trim();
          if (!key) continue;
          if (key.includes('điểm')) points = Number.parseFloat(value) || points;
          if (key.includes('độ khó')) difficulty = Number.parseInt(value, 10) || difficulty;
          if (key.includes('mức')) {
            const v = value.toLowerCase();
            if (v.includes('dễ')) difficulty = 1;
            else if (v.includes('trung')) difficulty = 2;
            else if (v.includes('khó')) difficulty = 3;
          }
          if (key.includes('chương')) chapter = value || chapter;
        }
        // If line is ONLY brackets, skip adding to text
        if (line.replace(/\[[^\]]*\]/g, '').trim().length === 0) {
          i += 1;
          continue;
        }
      }

      // Pure metadata lines
      const isPureMeta = /^(Đáp án|ĐS|Ds|\[)/i.test(lineNoUl);
      if (!isPureMeta) {
        textParts.push(line);
      }

      i += 1;
    }

    // Collect all text
    const fullText = textParts.join(' ');

    // Determine type
    let type: 'mcq' | 'tf' | 'tf4' | 'essay' | 'saq';
    if (hint === 'TF4') type = 'tf4';
    else if (hint === 'SAQ') type = 'saq';
    else if (hint === 'TL') type = 'essay';
    else if (hint === 'TF') type = subItems.length > 0 ? 'tf4' : 'tf';
    else if (hint === 'MCQ') type = 'mcq';
    else if (options.length >= 2) type = 'mcq';
    else if (/^(Đúng|Sai)$/i.test(answer)) type = 'tf';
    else type = 'essay';

    // Parse TF4 sub-item answers from the answer line
    // Format: "a-Đ b-S c-Đ d-S" or "a)Đúng b)Sai c)Đúng d)Sai" (supports a-z)
    if (type === 'tf4' && answer && subItems.length > 0) {
      const tf4Parts = answer.match(/([a-z])\s*[\-\)]\s*(Đ|S|Đúng|Sai|True|False|1|0)/gi);
      if (tf4Parts) {
        for (const part of tf4Parts) {
          const m = part.match(/([a-z])\s*[\-\)]\s*(Đ|S|Đúng|Sai|True|False|1|0)/i);
          if (m) {
            const label = m[1].toLowerCase();
            const val = /^(Đ|Đúng|True|1)$/i.test(m[2]) ? 'Đúng' : 'Sai';
            const sub = subItems.find(s => s.label === label);
            if (sub) sub.answer = val;
          }
        }
      }
    }

    // Infer TF4 sub-item answers from underline when answer symbols are missing.
    if (type === 'tf4' && subItems.length > 0 && subItems.every(s => !s.answer)) {
      const inferredSubItems = inferTF4AnswersFromUnderline(subItems as any);
      subItems.splice(0, subItems.length, ...inferredSubItems.map(s => ({ ...s, answer: s.answer || '' })));
      if (!answer) {
        answer = formatTF4AnswerString(subItems);
      }
    }

    // Infer MCQ answer by underlined option when no explicit answer symbol exists.
    if (type === 'mcq' && !answer && options.length > 0) {
      answer = inferMcqAnswerFromUnderline(options);
    }

    // Normalize MCQ answer
    if (type === 'mcq' && answer) {
      const upper = answer.toUpperCase().trim();
      if (['A', 'B', 'C', 'D'].includes(upper)) answer = upper;
    }

    // Normalize TF answer
    if (type === 'tf') {
      if (/^(true|1|đúng|đ)$/i.test(answer)) answer = 'Đúng';
      else if (/^(false|0|sai|s)$/i.test(answer)) answer = 'Sai';
    }

    // Validate
    let status: 'ok' | 'warn' | 'error' = 'ok';
    let warnMsg = '';

    if (type === 'mcq') {
      if (options.length < 4) { status = 'warn'; warnMsg = 'Câu trắc nghiệm thiếu lựa chọn (khuyến nghị 4 đáp án)'; }
      if (!answer || !['A','B','C','D'].includes(answer)) { status = 'error'; warnMsg = 'Không tìm thấy đáp án hoặc đáp án không hợp lệ (A/B/C/D)'; }
    } else if (type === 'tf') {
      if (!answer) { status = 'error'; warnMsg = 'Không tìm thấy đáp án Đúng/Sai'; }
    } else if (type === 'tf4') {
      const unanswered = subItems.filter(s => !s.answer).length;
      if (unanswered > 0) { status = 'warn'; warnMsg = `${unanswered} ý chưa có đáp án Đ/S`; }
      if (subItems.length === 0) { status = 'warn'; warnMsg = 'Câu TF4 nhưng không tìm thấy ý a) b) c) d)'; }
    } else if (type === 'saq') {
      if (!answer) { status = 'warn'; warnMsg = 'Chưa có đáp án — giáo viên chấm tay'; }
    } else if (type === 'essay') {
      if (!answer) { status = 'warn'; warnMsg = 'Tự luận — giáo viên chấm tay'; }
    }

    questions.push({
      id: `q_${num}_${Date.now()}_${questions.length + 1}`,
      num,
      text: cleanImgTags(fullText),
      type,
      options: options.map(o => cleanImgTags(o)),
      subItems: type === 'tf4' ? subItems : undefined,
      answer,
      points,
      difficulty,
      chapter,
      images: [],  // Populated by post-parse resolution
      inlineImages: [],
      status,
      warnMsg: warnMsg || undefined,
    });
  }

  return { questions, subject: detectedSubject || undefined, chapter: detectedChapter || undefined, imageMap };
}

/* ─── Extract HTML + images from docx using mammoth ── */
async function extractDocxContent(buffer: Buffer): Promise<{ html: string; text: string; images: string[] }> {
  try {
    const mammoth = await import('mammoth');
    const textResult = await mammoth.extractRawText({ buffer });
    const imageUrls: string[] = [];
    const htmlResult = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image: any) => {
          const base64 = await image.read('base64');
          const src = `data:${image.contentType};base64,${base64}`;
          imageUrls.push(src);
          return { src };
        }),
      }
    );
    return { html: htmlResult.value, text: textResult.value, images: imageUrls };
  } catch (err) {
    console.error('mammoth not available:', err);
    throw new Error('mammoth not installed. Run: npm install mammoth');
  }
}

/**
 * POST /api/exam-banks/parse
 * Body: multipart/form-data
 *   - file: File (.docx | .txt | .pdf)
 *   - authorId?: string  (để lưu vào ExamBank)
 *
 * Returns: { questions, bankId, subject, chapter, matrix }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const authorId = formData.get('authorId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name.toLowerCase();

    // Extract text based on file type
    let rawText = '';
    let docImages: string[] = [];
    let questions: ParsedQuestion[] = [];
    let subject: string | undefined;
    let chapter: string | undefined;

    if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      // Pre-process: extract OMML math equations and convert to LaTeX markers
      let processedBuffer: Buffer = buffer;
      if (filename.endsWith('.docx')) {
        try {
          processedBuffer = Buffer.from(await preprocessDocxMath(buffer));
        } catch (err) {
          console.warn('[parse] OMML math preprocessing failed, using original buffer:', err);
        }
      }
      
      // ── Extract OLE objects (MathType formulas) from Word document ──
      let oleFormulas = new Map<string, OleFormula>();
      try {
        oleFormulas = await extractOleFormulas(buffer);
        console.log(`[parse] Extracted ${oleFormulas.size} OLE formulas from document`);
      } catch (err) {
        console.warn('[parse] OLE formula extraction failed (non-fatal):', err);
      }
      
      const docx = await extractDocxContent(processedBuffer);
      docImages = docx.images;
      // Use HTML-based parsing for proper image-to-question binding
      const tokens = tokenizeHtml(docx.html);
      const { lines, imageMap } = tokensToAnnotatedLines(tokens);

      // ── Track which images are formulas (WMF) vs illustrations (PNG/JPEG) ──
      const formulaIndices = new Set<number>();
      const wmfEntries: { index: number; base64: string }[] = [];
      for (const [idx, src] of imageMap.entries()) {
        if (isWmfImage(src)) {
          formulaIndices.add(idx); // Remember: this was a formula image
          wmfEntries.push({ index: idx, base64: src });
        }
      }
      
      // ── First, try to replace WMF images with extracted OLE formulas ──
      let replacedWithOleCount = 0;
      if (oleFormulas.size > 0) {
        console.log(`[parse] Attempting to replace ${wmfEntries.length} WMF images with ${oleFormulas.size} extracted OLE formulas`);
        const replaced = replaceOleImagesWithLatex(wmfEntries, oleFormulas, imageMap);
        replacedWithOleCount = replaced;
        console.log(`[parse] Successfully replaced ${replaced} WMF images with OLE formulas`);
      }
      
      // ── For remaining WMF images, attempt batch conversion to PNG ──
      const remainingWmfEntries = wmfEntries.filter(entry => {
        const currentSrc = imageMap.get(entry.index);
        return currentSrc && isWmfImage(currentSrc);
      });
      
      if (remainingWmfEntries.length > 0) {
        console.log(`[parse] Converting remaining ${remainingWmfEntries.length} WMF images to PNG`);
        const batchResult = await batchConvertWmfImages(remainingWmfEntries);
        let convertedCount = 0;
        for (const entry of remainingWmfEntries) {
          const converted = batchResult.get(entry.index);
          if (converted) {
            imageMap.set(entry.index, converted);
            convertedCount++;
          } else {
            // Try individual conversion as fallback
            try {
              const result = await convertWmfImage(entry.base64, entry.index);
              imageMap.set(entry.index, result.displaySrc);
              if (result.converted) convertedCount++;
            } catch { /* keep original */ }
          }
        }
        console.log(`[parse] WMF conversion: ${remainingWmfEntries.length} found, ${convertedCount} converted to PNG`);
      }
      
      console.log(`[parse] WMF processing complete: ${replacedWithOleCount} replaced with OLE formulas, ${wmfEntries.length - replacedWithOleCount} converted to PNG/kept as-is`);

      const parsed = parseAnnotatedLines(lines, imageMap);
      questions = parsed.questions;
      subject = parsed.subject;
      chapter = parsed.chapter;

      // ── Post-parse: resolve [img:N] markers ──
      // Formula images (WMF origin) → inline with text as {{INLINE_IMG:N}}
      // Illustration images (PNG/JPEG origin) → block images below question in images[]
      for (const q of questions) {
        const inlineImages: string[] = [];
        const blockImages: string[] = [];

        // Helper: resolve a [img:N] marker based on image origin
        function resolveImgMarker(_match: string, idxStr: string): string {
          const imgIdx = parseInt(idxStr, 10);
          const src = imageMap.get(imgIdx);
          if (!src) return '';

          // Check if OLE extractor replaced this entry with a [[LATEX:...]] marker
          // (OLE extraction puts LaTeX strings in imageMap instead of base64 data URIs)
          const latexMarkerMatch = src.match(/^\[\[LATEX:([\s\S]*)\]\]$/);
          if (latexMarkerMatch) {
            // Return LaTeX inline so LaTeXRenderer can render it properly
            const latex = latexMarkerMatch[1].trim();
            return ` ${latex} `;
          }

          if (formulaIndices.has(imgIdx)) {
            // Formula (was WMF/MathType) → inline with text
            const idx = inlineImages.length;
            inlineImages.push(src);
            return `{{INLINE_IMG:${idx}}}`;
          } else {
            // Illustration (original PNG/JPEG) → collect for block display
            if (!blockImages.includes(src)) blockImages.push(src);
            return ''; // Remove marker from text
          }
        }

        // Resolve in question text
        q.text = q.text.replace(/\[img:(\d+)\]/g, resolveImgMarker);
        // Resolve in options
        q.options = q.options.map(opt =>
          opt.replace(/\[img:(\d+)\]/g, resolveImgMarker)
        );
        // Resolve in sub-items (TF4)
        if (q.subItems) {
          for (const sub of q.subItems) {
            sub.text = sub.text.replace(/\[img:(\d+)\]/g, resolveImgMarker);
          }
        }
        q.inlineImages = inlineImages;
        q.images = blockImages;
      }
    } else if (filename.endsWith('.txt')) {
      rawText = buffer.toString('utf-8');
      const lines = rawText.replace(/\u00A0/g, ' ').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const parsed = parseAnnotatedLines(lines, new Map());
      questions = parsed.questions;
      subject = parsed.subject;
      chapter = parsed.chapter;
    } else if (filename.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'PDF chưa được hỗ trợ trực tiếp. Vui lòng dùng file .docx hoặc .txt' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Định dạng không hỗ trợ. Dùng .docx hoặc .txt' },
        { status: 400 }
      );
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy câu hỏi nào. Kiểm tra định dạng file (xem file mẫu).' },
        { status: 422 }
      );
    }

    // Nếu có authorId → lưu vào ExamBank + BankQuestion
    let bankId: string | null = null;
    if (authorId) {
      try {
        const bank = await prisma.examBank.create({
          data: {
            title: subject ? `${subject} — ${file.name}` : file.name,
            subject: subject || 'Không xác định',
            description: `Parse từ file: ${file.name}`,
            fileUrl: '',
            authorId,
            questions: {
              create: questions.map(q => {
                const kindMap: Record<string, 'MCQ' | 'TF' | 'TF4' | 'SAQ' | 'ESSAY'> = { mcq: 'MCQ', tf: 'TF', tf4: 'TF4', saq: 'SAQ', essay: 'ESSAY' };
                return {
                  num: q.num,
                  text: q.text,
                  kind: kindMap[q.type] || 'ESSAY',
                  difficulty: numToDifficulty(q.difficulty),
                  difficultyNum: q.difficulty,
                  chapter: q.chapter,
                  points: q.points,
                  options: q.options.length > 0
                    ? JSON.stringify(q.options)
                    : q.subItems ? JSON.stringify(q.subItems) : null,
                  answer: q.answer,
                  subItems: q.subItems ? JSON.stringify(q.subItems) : null,
                  answerTolerance: q.type === 'saq' ? 0 : null,
                };
              }),
            },
          },
        });
        bankId = bank.id;
      } catch (dbErr) {
        // DB lỗi nhưng vẫn trả về questions (không fail toàn bộ)
        console.error('DB save error (non-fatal):', dbErr);
      }
    }

    const matrix = {
      mcq: questions.filter(q => q.type === 'mcq').length,
      tf: questions.filter(q => q.type === 'tf' || q.type === 'tf4').length,
      saq: questions.filter(q => q.type === 'saq').length,
      essay: questions.filter(q => q.type === 'essay').length,
      total: questions.length,
      withImages: questions.filter(q => q.images.length > 0 || q.inlineImages.length > 0).length,
    };

    return NextResponse.json({
      questions,
      images: docImages,
      matrix,
      bankId,
      subject: subject || null,
      chapter: chapter || null,
      totalParsed: questions.length,
      okCount: questions.filter(q => q.status === 'ok').length,
      warnCount: questions.filter(q => q.status !== 'ok').length,
    });

  } catch (error: any) {
    console.error('[POST /api/exam-banks/parse]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}