// app/api/exams/parse-docx/route.ts
// DOCX parser for exam creation — no exam bank saving
import { NextRequest, NextResponse } from 'next/server';
import {
  formatTF4AnswerString,
  hasUnderlinedToken,
  inferMcqAnswerFromUnderline,
  inferSaqAnswerFromUnderline,
  inferTF4AnswersFromUnderline,
  stripParserTokens,
} from '@/utils/exam-answer-inference';
import { parseDocxUnderlineInference } from '@/utils/docx-parser-ts';
import { convertWmfImage, isWmfImage, isDisplayableImage as isDisplayableImageUtil, batchConvertWmfImages } from '@/utils/wmf-converter';
import { preprocessDocxMath, resolveLatexMarkers } from '@/utils/omml-to-latex';
import { extractOleFormulas, replaceOleImagesWithLatex, type OleFormula } from '@/utils/ole-extractor';
import { createDocxParseQueue } from '@/lib/bullmq';
import { prisma } from '@/lib/prisma';
import {
  buildStoragePath,
  guessContentTypeByFilename,
  hasSupabaseStorageConfig,
  uploadBufferToStorage,
} from '@/lib/supabase-storage';

const prismaAny = prisma as any;

/* ─── Types ── */
interface ParsedQuestion {
  id: string;
  num: number;
  text: string;
  type: 'mcq' | 'tf' | 'tf4' | 'essay' | 'saq';
  options: string[];
  subItems?: { label: string; text: string; answer: string; isUnderlined?: boolean }[];
  answer: string;
  points: number;
  difficulty: number;
  chapter?: string;
  images: string[];
  inlineImages: string[];
  status: 'ok' | 'warn' | 'error';
  warnMsg?: string;
}

function ensureLatexDelimiters(latex: string): string {
  const trimmed = latex.trim();
  if (!trimmed) return trimmed;
  if (
    trimmed.startsWith('$') ||
    trimmed.startsWith('\\(') ||
    trimmed.startsWith('\\[')
  ) {
    return trimmed;
  }
  return `$${trimmed}$`;
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

function tokenizeHtml(html: string): { type: 'text' | 'img'; value: string }[] {
  const tokens: { type: 'text' | 'img'; value: string }[] = [];
  let cleaned = html
    .replace(/<(u|ins)\b[^>]*>/gi, ' [[UL]] ')
    .replace(/<\/\s*(u|ins)\s*>/gi, ' [[/UL]] ')
    .replace(/<span\b[^>]*style\s*=\s*"[^"]*text-decoration\s*:\s*underline[^"]*"[^>]*>/gi, ' [[UL]] ')
    .replace(/<span\b[^>]*style\s*=\s*"[^"]*underline[^"]*"[^>]*>/gi, ' [[UL]] ')
    .replace(/<\/\s*span\s*>/gi, ' [[/UL]] ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');

  cleaned = cleaned.replace(/\[\[LATEX:(.*?)\]\]/g, (_m, latex: string) => ` ${latex.trim()} `);

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

  function extractGlobalAnswerMap(allLines: string[]): Map<number, string> {
    const out = new Map<number, string>();

    const parsePairsIntoMap = (raw: string) => {
      const cleaned = raw.replace(/\[\[\/?UL\]\]/g, ' ').replace(/\s+/g, ' ').trim();
      const strictPairRe = /(?:câu\s*)?(\d{1,3})\s*[:.)\-]?\s*([ABCDĐS])/gi;
      let strictCount = 0;
      let m: RegExpExecArray | null;
      while ((m = strictPairRe.exec(cleaned)) !== null) {
        const num = Number.parseInt(m[1], 10);
        const ans = m[2].toUpperCase();
        if (num > 0) {
          out.set(num, ans);
          strictCount += 1;
        }
      }

      // Fallback for compact keys like: 1A 2C 3D 4B
      if (strictCount === 0) {
        const compactRe = /(\d{1,3})\s*([ABCD])/gi;
        let compactCount = 0;
        while ((m = compactRe.exec(cleaned)) !== null) {
          const num = Number.parseInt(m[1], 10);
          const ans = m[2].toUpperCase();
          if (num > 0) {
            out.set(num, ans);
            compactCount += 1;
          }
        }

        // Pattern: 1. A 2. B ...
        if (compactCount === 0) {
          const dottedRe = /(\d{1,3})\s*[.)\-]\s*([ABCD])/gi;
          while ((m = dottedRe.exec(cleaned)) !== null) {
            const num = Number.parseInt(m[1], 10);
            const ans = m[2].toUpperCase();
            if (num > 0) out.set(num, ans);
          }
        }
      }
    };

    for (let idx = 0; idx < allLines.length; idx++) {
      const line = allLines[idx] || '';
      const noUl = line.replace(/\[\[\/?UL\]\]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!/đáp\s*án|answer\s*key|bảng\s*đáp\s*án/i.test(noUl)) continue;

      parsePairsIntoMap(noUl);
      // Answer keys are often in the next few lines.
      for (let j = idx + 1; j < Math.min(allLines.length, idx + 25); j++) {
        const next = (allLines[j] || '').replace(/\[\[\/?UL\]\]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!next) continue;
        if (/^Câu\s*\d+/i.test(next)) break;
        parsePairsIntoMap(next);
      }
    }

    // Fallback: if no explicit "Đáp án" heading exists, scan lines that look like
    // numbered answer lists (e.g. "1A 2C 3D", "1. A; 2. B", "1-C").
    if (out.size === 0) {
      const candidatePairs = new Map<number, string>();
      for (const rawLine of allLines) {
        const line = (rawLine || '').replace(/\[\[\/?UL\]\]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!line) continue;
        if (/^Câu\s*\d+/i.test(line)) continue;
        if (/^[A-D][.)\s]+/i.test(line)) continue; // option line, not answer key

        const pairRe = /(?:^|[\s,;|])(?:câu\s*)?(\d{1,3})\s*[:.)\-]?\s*([ABCD])(?=$|[\s,;|])/gi;
        const pairs = Array.from(line.matchAll(pairRe));

        // Keep only lines that contain a dense list of answer pairs.
        if (pairs.length >= 3) {
          for (const p of pairs) {
            const num = Number.parseInt(p[1], 10);
            const ans = (p[2] || '').toUpperCase();
            if (num > 0 && ['A', 'B', 'C', 'D'].includes(ans)) {
              candidatePairs.set(num, ans);
            }
          }
          continue;
        }

        // Support one-pair-per-line answer keys: "12. C"
        const single = line.match(/^(?:câu\s*)?(\d{1,3})\s*[:.)\-]?\s*([ABCD])$/i);
        if (single) {
          const num = Number.parseInt(single[1], 10);
          const ans = (single[2] || '').toUpperCase();
          if (num > 0 && ['A', 'B', 'C', 'D'].includes(ans)) {
            candidatePairs.set(num, ans);
          }
        }
      }

      if (candidatePairs.size >= 5) {
        for (const [k, v] of candidatePairs) out.set(k, v);
      }
    }

    return out;
  }

  const globalAnswerMap = extractGlobalAnswerMap(lines);

  let detectedSubject = '';
  let detectedChapter = '';
  for (const line of lines.slice(0, 30)) {
    const subjectMatch = line.match(/Môn\s*[:\-]\s*([^|[\]]+)/i);
    if (subjectMatch) detectedSubject = subjectMatch[1].trim();
    const chapterMatch = line.match(/Chương\s*[:\-]\s*([^[\]]+)/i);
    if (chapterMatch) detectedChapter = chapterMatch[1].trim();
  }

  const qRegex = /^Câu\s*(\d+)\s*[:.)\-]?\s*(?:\[(TF4|TF|SAQ|TL|MCQ)\]\s*)?(.*)$/i;
  const qRegexAlt = /^Câu\s*(\d+)\s*\((TF4|TF|SAQ|TL|MCQ)\)\s*[:.)\-]?\s*(.*)$/i;
  const optionRegex = /^([A-D])[.\s)]+(.+)$/;
  const subItemRegex = /^([a-z])\)\s*(.+)$/i;
  const sectionRegex = /^PH[ẦA]N\s*\d+/i;
  const answerLineRegex = /^Đáp\s*án\s*(?:đúng)?\s*[:\-]?\s*(.*)$/i;
  const dsAnswerRegex = /^[ĐD][SsƯư]\s*[.:\-]\s*(.+)$/;

  function isDisplayableImage(src: string): boolean {
    return isDisplayableImageUtil(src);
  }

  function isWmfEmfImage(src: string): boolean {
    return isWmfImage(src);
  }

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

  function cleanImgTags(text: string): string {
    let cleaned = stripParserTokens(text);
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

    while (i < lines.length) {
      const line = lines[i];
      if (qRegex.test(line) || sectionRegex.test(line)) break;

      const lineNoUl = line.replace(/\[\[\/?UL\]\]/g, '').replace(/\s+/g, ' ').trim();

      if (hint === 'TF4' || hint === 'TF') {
        const subMatch = lineNoUl.match(subItemRegex);
        if (subMatch) {
          subItems.push({
            label: subMatch[1].toLowerCase(),
            text: cleanImgTags(subMatch[2]),
            answer: '',
            isUnderlined: hasUnderlinedToken(line),
          });
          i += 1;
          continue;
        }
      }

      const optMatch = lineNoUl.match(optionRegex);
      if (optMatch) {
        options.push(optMatch[2]);
        i += 1;
        continue;
      }

      const dsMatch = lineNoUl.match(dsAnswerRegex);
      if (dsMatch) {
        const dsValue = dsMatch[1].trim();
        const tf4Tokens = dsValue.split(/[,\s]+/).filter(t => /^[TĐStsđ]$/i.test(t));
        if (tf4Tokens.length >= 2 && subItems.length > 0) {
          const labels = 'abcdefghijklmnopqrstuvwxyz'.split('');
          for (let si = 0; si < tf4Tokens.length && si < subItems.length; si++) {
            const val = /^[TĐtđ]$/i.test(tf4Tokens[si]) ? 'Đúng' : 'Sai';
            const sub = subItems.find(s => s.label === labels[si]);
            if (sub) sub.answer = val;
          }
          answer = subItems.map(s => `${s.label}-${s.answer === 'Đúng' ? 'Đ' : 'S'}`).join(' ');
        } else {
          const letter = dsValue.toUpperCase().charAt(0);
          if (['A', 'B', 'C', 'D'].includes(letter)) {
            answer = letter;
          } else {
            answer = dsValue;
          }
        }
        i += 1;
        continue;
      }

      const ansMatch = line.match(answerLineRegex);
      if (ansMatch) {
        let rawAns = ansMatch[1].trim();
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
        rawAns = rawAns.replace(/\[.*$/, '').trim();
        if (rawAns) {
          answer = rawAns;
        } else {
          if (i + 1 < lines.length && !qRegex.test(lines[i + 1]) && !qRegexAlt.test(lines[i + 1])) {
            i += 1;
            answer = cleanImgTags(lines[i]);
          }
        }
        i += 1;
        continue;
      }

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
        if (line.replace(/\[[^\]]*\]/g, '').trim().length === 0) {
          i += 1;
          continue;
        }
      }

      const isPureMeta = /^(Đáp án|ĐS|Ds|\[)/i.test(lineNoUl);
      if (!isPureMeta) {
        textParts.push(line);
      }

      i += 1;
    }

    const fullText = textParts.join(' ');

    let type: 'mcq' | 'tf' | 'tf4' | 'essay' | 'saq';
    if (hint === 'TF4') type = 'tf4';
    else if (hint === 'SAQ') type = 'saq';
    else if (hint === 'TL') type = 'essay';
    else if (hint === 'TF') type = subItems.length > 0 ? 'tf4' : 'tf';
    else if (hint === 'MCQ') type = 'mcq';
    else if (options.length >= 2) type = 'mcq';
    else if (/^(Đúng|Sai)$/i.test(answer)) type = 'tf';
    else type = 'essay';

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

    if (type === 'tf4' && subItems.length > 0 && subItems.every(s => !s.answer)) {
      const inferredSubItems = inferTF4AnswersFromUnderline(subItems as any);
      subItems.splice(0, subItems.length, ...inferredSubItems.map(s => ({ ...s, answer: s.answer || '' })));
      if (!answer) {
        answer = formatTF4AnswerString(subItems);
      }
    }

    if (type === 'mcq' && !answer && options.length > 0) {
      answer = inferMcqAnswerFromUnderline(options);
    }

    if (!answer && globalAnswerMap.has(num)) {
      answer = globalAnswerMap.get(num) || '';
    }

    // Infer SAQ answer from underlined text in question body
    if (type === 'saq' && !answer) {
      answer = inferSaqAnswerFromUnderline(fullText);
    }

    if (type === 'mcq' && answer) {
      const upper = answer.toUpperCase().trim();
      if (['A', 'B', 'C', 'D'].includes(upper)) answer = upper;
    }

    if (type === 'tf') {
      if (/^(true|1|đúng|đ)$/i.test(answer)) answer = 'Đúng';
      else if (/^(false|0|sai|s)$/i.test(answer)) answer = 'Sai';
    }

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
      images: [],
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
 * POST /api/exams/parse-docx
 * Body: multipart/form-data
 *   - file: File (.docx | .txt)
 *
 * Returns: { questions, subject, chapter, matrix }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // Default mode: enqueue async parse job, do not parse synchronously in request.
    // Worker sets x-parse-sync=1 to run the sync parser branch below.
    const isSyncParse = request.headers.get('x-parse-sync') === '1';
    if (!isSyncParse) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        let fileUrl = '';
        if (hasSupabaseStorageConfig()) {
          const path = buildStoragePath('docx-parse', file.name || 'input.docx');
          const uploaded = await uploadBufferToStorage({
            path,
            buffer,
            contentType: file.type || guessContentTypeByFilename(file.name || 'input.docx'),
            cacheControl: '3600',
          });
          fileUrl = uploaded.publicUrl;
        } else {
          const mime = file.type || guessContentTypeByFilename(file.name || 'input.docx');
          fileUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        }

        if (!fileUrl) {
          throw new Error('Cannot prepare file URL for async parsing');
        }

        const userId = request.headers.get('x-user-id') || undefined;
        const backgroundJob = await prismaAny.backgroundJob.create({
          data: {
            type: 'DOCX_PARSE',
            status: 'QUEUED',
            userId,
            inputJson: JSON.stringify({
              fileName: file.name,
              target: 'exams',
            }),
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        });

        const queue = createDocxParseQueue();
        const enqueued = await queue.add('docx-parse', {
          backgroundJobId: backgroundJob.id,
          fileUrl,
          fileName: file.name || 'input.docx',
          target: 'exams',
        });

        await prismaAny.backgroundJob.update({
          where: { id: backgroundJob.id },
          data: { queueJobId: String(enqueued.id) },
        });

        await queue.close();

        return NextResponse.json(
          {
            success: true,
            queued: true,
            jobId: backgroundJob.id,
            status: 'QUEUED',
          },
          { status: 202 }
        );
      } catch (enqueueError) {
        console.warn('[parse-docx] Async enqueue failed, fallback to sync parse:', enqueueError);
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name.toLowerCase();

    let docImages: string[] = [];
    let questions: ParsedQuestion[] = [];
    let subject: string | undefined;
    let chapter: string | undefined;

    if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      // 1) Parse full content + images via mammoth pipeline
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
        console.log(`[parse-docx] Extracted ${oleFormulas.size} OLE formulas from document`);
      } catch (err) {
        console.warn('[parse-docx] OLE formula extraction failed (non-fatal):', err);
      }

      const docx = await extractDocxContent(processedBuffer);
      docImages = docx.images;
      const tokens = tokenizeHtml(docx.html);
      const { lines, imageMap } = tokensToAnnotatedLines(tokens);

      const formulaIndices = new Set<number>();
      const wmfEntries: { index: number; base64: string }[] = [];
      for (const [idx, src] of imageMap.entries()) {
        if (isWmfImage(src)) {
          formulaIndices.add(idx);
          wmfEntries.push({ index: idx, base64: src });
        }
      }

      // ── First, try to replace WMF images with extracted OLE formulas ──
      if (oleFormulas.size > 0 && wmfEntries.length > 0) {
        const replaced = replaceOleImagesWithLatex(wmfEntries, oleFormulas, imageMap);
        console.log(`[parse-docx] Replaced ${replaced} WMF images with OLE formulas`);
      }

      // ── For remaining WMF images, attempt batch conversion to PNG ──
      const remainingWmfEntries = wmfEntries.filter(entry => {
        const currentSrc = imageMap.get(entry.index);
        return currentSrc && isWmfImage(currentSrc);
      });

      if (remainingWmfEntries.length > 0) {
        const batchResult = await batchConvertWmfImages(remainingWmfEntries);
        for (const entry of remainingWmfEntries) {
          const converted = batchResult.get(entry.index);
          if (converted) {
            imageMap.set(entry.index, converted);
          } else {
            try {
              const result = await convertWmfImage(entry.base64, entry.index);
              imageMap.set(entry.index, result.displaySrc);
            } catch { /* keep original */ }
          }
        }
      }

      const parsed = parseAnnotatedLines(lines, imageMap);
      questions = parsed.questions;
      subject = parsed.subject;
      chapter = parsed.chapter;

      for (const q of questions) {
        const inlineImages: string[] = [];
        const blockImages: string[] = [];

        function resolveImgMarker(_match: string, idxStr: string): string {
          const imgIdx = parseInt(idxStr, 10);
          const src = imageMap.get(imgIdx);
          if (!src) return '';

          // If OLE extraction replaced this WMF image with a LaTeX marker,
          // inject math text directly instead of rendering a broken <img src="[[LATEX:...]]">.
          const latexMarkerMatch = src.match(/^\[\[LATEX:([\s\S]*)\]\]$/);
          if (latexMarkerMatch) {
            const latex = ensureLatexDelimiters(latexMarkerMatch[1]);
            return ` ${latex} `;
          }

          if (formulaIndices.has(imgIdx)) {
            const idx = inlineImages.length;
            inlineImages.push(src);
            return `{{INLINE_IMG:${idx}}}`;
          }
          if (!blockImages.includes(src)) blockImages.push(src);
          return '';
        }

        q.text = q.text.replace(/\[img:(\d+)\]/g, resolveImgMarker);
        q.options = q.options.map(opt => opt.replace(/\[img:(\d+)\]/g, resolveImgMarker));
        if (q.subItems) {
          for (const sub of q.subItems) {
            sub.text = sub.text.replace(/\[img:(\d+)\]/g, resolveImgMarker);
          }
        }
        q.inlineImages = inlineImages;
        q.images = blockImages;
      }

      // 2) Parse underline answer intent directly from DOCX XML and merge by question number.
      const inferred = await parseDocxUnderlineInference(buffer);
      if (!inferred.error && inferred.questions.length > 0) {
        const inferMap = new Map(inferred.questions.map((q) => [q.num, q]));

        for (const q of questions) {
          const source = inferMap.get(q.num);
          if (!source) continue;

          if (q.type === 'mcq' && source.type === 'mcq' && /^[ABCD]$/i.test(source.answer || '')) {
            q.answer = (source.answer || '').toUpperCase();
            q.status = 'ok';
            q.warnMsg = undefined;
          }

          if (q.type === 'tf' && source.type === 'tf' && /^(Đúng|Sai)$/i.test(source.answer || '')) {
            q.answer = /đúng/i.test(source.answer) ? 'Đúng' : 'Sai';
            q.status = 'ok';
            q.warnMsg = undefined;
          }

          if (q.type === 'tf4' && source.type === 'tf4' && q.subItems && q.subItems.length > 0) {
            const subMap = new Map((source.subItems || []).map((s) => [s.label.toLowerCase(), s.answer]));
            for (const sub of q.subItems) {
              const next = subMap.get(sub.label.toLowerCase());
              if (next === 'Đúng' || next === 'Sai') sub.answer = next;
            }
            q.answer = formatTF4AnswerString(q.subItems.map((s) => ({ ...s, answer: s.answer || 'Sai' })) as any);
            const unresolved = q.subItems.filter((s) => !s.answer).length;
            if (unresolved === 0) {
              q.status = 'ok';
              q.warnMsg = undefined;
            }
          }

          if (q.type === 'saq' && source.type === 'saq' && source.answer) {
            q.answer = source.answer;
            q.status = 'ok';
            q.warnMsg = undefined;
          }
        }
      }
    } else if (filename.endsWith('.txt')) {
      const rawText = buffer.toString('utf-8');
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
      subject: subject || null,
      chapter: chapter || null,
      totalParsed: questions.length,
      okCount: questions.filter(q => q.status === 'ok').length,
      warnCount: questions.filter(q => q.status !== 'ok').length,
    });

  } catch (error: any) {
    console.error('[POST /api/exams/parse-docx]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
