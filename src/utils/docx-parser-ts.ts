import JSZip from 'jszip';

type QType = 'mcq' | 'tf' | 'tf4' | 'essay' | 'saq';

interface RunInfo {
  text: string;
  underlined: boolean;
  bold: boolean;
}

interface ParagraphInfo {
  text: string;
  runs: RunInfo[];
}

interface ParsedQuestion {
  num: number;
  hint: string;
  text: string;
  runs: RunInfo[];
  options: { letter: string; text: string; runs: RunInfo[] }[];
  subItems: { label: string; text: string; answer: string; runs: RunInfo[] }[];
  answer: string;
  saqAnswer: string;
  expectAnswerNext: boolean;
}

export interface UnderlineInferenceQuestion {
  num: number;
  type: QType;
  answer: string;
  subItems: { label: string; answer: string }[];
  status: 'ok' | 'warn' | 'error';
  warnMsg?: string;
}

export interface UnderlineInferenceResult {
  questions: UnderlineInferenceQuestion[];
  total: number;
  matrix: { mcq: number; tf: number; saq: number; essay: number };
  error?: string;
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x0*D;/gi, '')
    .replace(/&#x0*A;/gi, '\n')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number.parseInt(d, 10) || 0));
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function extractRuns(paragraphXml: string): RunInfo[] {
  const runs: RunInfo[] = [];
  const runRegex = /<w:r\b[\s\S]*?<\/w:r>/gi;
  const runMatches = paragraphXml.match(runRegex) || [];

  for (const runXml of runMatches) {
    const underlined = /<w:u\b[^>]*\/?>(?:<\/w:u>)?/i.test(runXml) && !/w:val="none"/i.test(runXml);
    const bold = /<w:b\b[^>]*\/?>(?:<\/w:b>)?/i.test(runXml) && !/w:val="0"/i.test(runXml);

    let text = '';
    const textRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
    let m: RegExpExecArray | null;
    while ((m = textRegex.exec(runXml)) !== null) {
      text += decodeXmlEntities(m[1]);
    }

    if (/<w:tab\s*\/?>/i.test(runXml)) text += '\t';
    if (/<w:br\s*\/?>/i.test(runXml)) text += ' ';

    if (text.length > 0) {
      runs.push({ text, underlined, bold });
    }
  }

  return runs;
}

async function extractParagraphsWithFormatting(buffer: Buffer): Promise<ParagraphInfo[]> {
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('DOCX thiếu word/document.xml');
  }

  const xml = await docXmlFile.async('string');
  const paragraphs: ParagraphInfo[] = [];
  const paraRegex = /<w:p\b[\s\S]*?<\/w:p>/gi;
  const paraMatches = xml.match(paraRegex) || [];

  for (const paraXml of paraMatches) {
    const runs = extractRuns(paraXml);
    const text = normalizeWhitespace(runs.map((r) => r.text).join(''));
    if (!text) continue;
    paragraphs.push({ text, runs });
  }

  return paragraphs;
}

function inferQuestionType(q: ParsedQuestion): QType {
  if (q.hint === 'TF4') return 'tf4';
  if (q.hint === 'SAQ') return 'saq';
  if (q.hint === 'TL') return 'essay';
  if (q.hint === 'TF') return q.subItems.length > 0 ? 'tf4' : 'tf';
  if (q.hint === 'MCQ') return 'mcq';
  if (q.options.length >= 2) return 'mcq';
  if (q.subItems.length > 0) return 'tf4';
  return 'essay';
}

function normalizeTfAnswer(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (/^(đúng|đ|true|1)$/i.test(t)) return 'Đúng';
  if (/^(sai|s|false|0)$/i.test(t)) return 'Sai';
  return '';
}

export async function parseDocxUnderlineInference(buffer: Buffer): Promise<UnderlineInferenceResult> {
  try {
    const paragraphs = await extractParagraphsWithFormatting(buffer);
    const qRegex = /^Câu\s*(\d+)\s*[:.)\-]?\s*(?:\[(TF4|TF|SAQ|TL|MCQ)\]\s*)?(.*)$/i;
    const qRegexAlt = /^Câu\s*(\d+)\s*\((TF4|TF|SAQ|TL|MCQ)\)\s*[:.)\-]?\s*(.*)$/i;
    const optRegex = /^([A-D])[.)\s]+(.+)$/;
    const subRegex = /^([a-d])[)\.]\s*(.+)$/i;
    const ansRegex = /^Đáp\s*án\s*(?:đúng)?\s*[:\-]?\s*(.*)$/i;

    const parsed: ParsedQuestion[] = [];
    let current: ParsedQuestion | null = null;

    for (const para of paragraphs) {
      const text = para.text;
      const qMatch = text.match(qRegex) || text.match(qRegexAlt);
      if (qMatch) {
        if (current) parsed.push(current);
        current = {
          num: Number.parseInt(qMatch[1], 10),
          hint: (qMatch[2] || '').toUpperCase(),
          text: qMatch[3] || '',
          runs: [...para.runs],
          options: [],
          subItems: [],
          answer: '',
          saqAnswer: '',
          expectAnswerNext: false,
        };
        continue;
      }

      if (!current) continue;

      const optMatch = text.match(optRegex);
      if (optMatch) {
        current.options.push({ letter: optMatch[1], text: optMatch[2], runs: [...para.runs] });
        continue;
      }

      const subMatch = text.match(subRegex);
      if (subMatch) {
        current.subItems.push({
          label: subMatch[1].toLowerCase(),
          text: subMatch[2],
          answer: '',
          runs: [...para.runs],
        });
        continue;
      }

      const ansMatch = text.match(ansRegex);
      if (ansMatch) {
        const raw = (ansMatch[1] || '').trim();
        const ulToken = para.runs.find((r) => r.underlined && /\b([A-D]|Đúng|Sai|Đ|S|True|False)\b/i.test(r.text));
        if (ulToken) {
          const token = ulToken.text.trim().toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(token)) current.answer = token;
          else {
            const tf = normalizeTfAnswer(token);
            if (tf) current.answer = tf;
          }
        }
        if (!current.answer && raw) current.answer = raw;
        current.expectAnswerNext = true;
        continue;
      }

      if (current.expectAnswerNext) {
        if (!current.saqAnswer) current.saqAnswer = text;
        current.expectAnswerNext = false;
        continue;
      }

      current.runs.push(...para.runs);
    }

    if (current) parsed.push(current);

    const questions: UnderlineInferenceQuestion[] = parsed.map((q) => {
      const type = inferQuestionType(q);
      let answer = q.answer || '';
      const subItems = q.subItems.map((s) => ({ label: s.label, answer: '' }));

      if (type === 'mcq') {
        if (!answer) {
          for (const opt of q.options) {
            if (opt.runs.some((r) => r.underlined)) {
              answer = opt.letter;
              break;
            }
          }
        }
        answer = answer.trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(answer)) answer = '';
      }

      if (type === 'tf') {
        if (!answer) {
          const ul = q.runs.find((r) => r.underlined && /^(Đúng|Sai|True|False|Đ|S)$/i.test(r.text.trim()));
          if (ul) answer = ul.text;
        }
        answer = normalizeTfAnswer(answer);
      }

      if (type === 'tf4') {
        for (let i = 0; i < q.subItems.length; i++) {
          const s = q.subItems[i];
          const byLabel = s.runs.some((r) => {
            if (!r.underlined) return false;
            const t = r.text.trim().toLowerCase();
            return t === s.label || t === `${s.label})` || t.startsWith(`${s.label})`);
          });
          subItems[i].answer = byLabel ? 'Đúng' : 'Sai';
        }
        answer = subItems.map((s) => `${s.label}-${s.answer === 'Đúng' ? 'Đ' : 'S'}`).join(' ');
      }

      if (type === 'saq') {
        if (!answer) answer = q.saqAnswer || '';
      }

      let status: 'ok' | 'warn' | 'error' = 'ok';
      let warnMsg = '';
      if (type === 'mcq' && !answer) {
        status = 'error';
        warnMsg = 'Không tìm thấy đáp án hoặc đáp án không hợp lệ (A/B/C/D)';
      } else if (type === 'tf' && !answer) {
        status = 'error';
        warnMsg = 'Không tìm thấy đáp án Đúng/Sai';
      } else if (type === 'tf4') {
        const unanswered = subItems.filter((s) => !s.answer).length;
        if (unanswered > 0) {
          status = 'warn';
          warnMsg = `${unanswered} ý chưa có đáp án Đ/S`;
        }
      }

      return {
        num: q.num,
        type,
        answer,
        subItems,
        status,
        warnMsg: warnMsg || undefined,
      };
    });

    return {
      questions,
      total: questions.length,
      matrix: {
        mcq: questions.filter((q) => q.type === 'mcq').length,
        tf: questions.filter((q) => q.type === 'tf' || q.type === 'tf4').length,
        saq: questions.filter((q) => q.type === 'saq').length,
        essay: questions.filter((q) => q.type === 'essay').length,
      },
    };
  } catch (err: any) {
    return {
      questions: [],
      total: 0,
      matrix: { mcq: 0, tf: 0, saq: 0, essay: 0 },
      error: err?.message || 'Parse DOCX underline failed',
    };
  }
}