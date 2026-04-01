'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Check, Save, Eye, Trash2, XCircle } from 'lucide-react';
import { getAuthUser } from '@/lib/auth-storage';
import LaTeXRenderer from '@/components/latex/LaTeXRenderer';
import InlineContentRenderer from '@/components/latex/InlineContentRenderer';

export interface ClassInfo { id: string; name: string; year: number; code?: string }
type ExamPhase = 'upload' | 'parsing' | 'review' | 'config' | 'done';
type QuestionType = 'mcq' | 'tf' | 'tf4' | 'essay' | 'saq';

interface ParsedQ {
  id: string; num: number; text: string; type: QuestionType;
  options: string[]; answer: string; points: number;
  difficulty: number; status: 'ok' | 'warn' | 'error'; warnMsg?: string;
  images?: string[];
  inlineImages?: string[];
  subItems?: { label: string; text: string; answer: string }[];
}

function buildTF4AnswerText(subItems?: { label: string; text: string; answer: string }[]) {
  if (!Array.isArray(subItems) || subItems.length === 0) return '';
  return subItems
    .map((s) => {
      const normalized = (s.answer || '').toLowerCase();
      const short = normalized === 'đúng' || normalized === 'true' ? 'Đ' : normalized === 'sai' || normalized === 'false' ? 'S' : '?';
      return `${s.label}-${short}`;
    })
    .join(' ');
}

type ExamKind = 'ORAL' | 'QUIZ15' | 'PERIOD';
interface ExamConfig {
  subject: string; chapter: string;
  examKind: ExamKind;  // ORAL=miệng hs1, QUIZ15=15p hs1, PERIOD=1tiết hs2
  mcqCount: number;    // Trắc nghiệm
  tfCount: number;     // Đúng / Sai
  essayCount: number;  // Tự luận
  duration: number; deadlineDays: number; autoDeleteAfter: number;
  variantCount: number; saveToBank: boolean;
}

const DEFAULT_CFG: ExamConfig = { subject: 'Môn học', chapter: '', examKind: 'PERIOD', mcqCount: 10, tfCount: 5, essayCount: 2, duration: 45, deadlineDays: 7, autoDeleteAfter: 7, variantCount: 1, saveToBank: false };
const EXAM_KIND_OPTIONS: { key: ExamKind; label: string; badge: string; coef: number }[] = [
  { key: 'ORAL', label: 'Miệng', badge: 'Hệ số 1', coef: 1 },
  { key: 'QUIZ15', label: '15 phút', badge: 'Hệ số 1', coef: 1 },
  { key: 'PERIOD', label: '1 tiết', badge: 'Hệ số 2', coef: 2 },
];

/* ══════════════════════════════════════════════════════════
   CLIENT-SIDE PARSER — không cần API, chạy trên browser
   Đọc file .txt hoặc text thuần với định dạng mẫu.
   ══════════════════════════════════════════════════════════ */
function parseText(text: string): { questions: ParsedQ[]; subject?: string; chapter?: string } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: ParsedQ[] = [];
  let detectedSubject = '', detectedChapter = '';

  for (const line of lines.slice(0, 15)) {
    const sm = line.match(/Môn[:\s]+([A-Za-zÀ-ỹ\s]+)/i);
    if (sm) detectedSubject = sm[1].trim();
    const cm = line.match(/Chương[:\s]+(\S+)/i);
    if (cm) detectedChapter = cm[1].trim();
  }

  let i = 0;
  while (i < lines.length) {
    const qMatch = lines[i].match(/^Câu\s+(\d+)\s*(\(TF\)|\(TL\))?[:\s]+(.+)/i);
    if (!qMatch) { i++; continue; }

    const num = parseInt(qMatch[1]);
    const typeHint = qMatch[2]?.toLowerCase() || '';
    const textLines = [qMatch[3].trim()];
    i++;

    while (i < lines.length && !lines[i].match(/^(Câu\s+\d+|[A-D]\.|Đáp án|\[Điểm)/i)) {
      if (lines[i]) textLines.push(lines[i]);
      i++;
    }

    const options: string[] = [];
    while (i < lines.length && lines[i].match(/^[A-D]\./)) {
      options.push(lines[i].replace(/^[A-D]\.\s*/, '').trim()); i++;
    }

    let answer = '', points = options.length > 0 ? 0.5 : 2.0, difficulty = 1;
    let chapter = detectedChapter, status: ParsedQ['status'] = 'ok', warnMsg = '';

    while (i < lines.length && !lines[i].match(/^Câu\s+\d+/i)) {
      const l = lines[i];
      const am = l.match(/^Đáp án[:\s]+([A-DĐS][^\s\[]*)/i);
      if (am) {
        answer = am[1].trim();
        if (['đúng', 'true'].includes(answer.toLowerCase())) answer = 'Đúng';
        if (['sai', 'false'].includes(answer.toLowerCase())) answer = 'Sai';
      }
      const dm = l.match(/\[Độ khó:\s*(\d+)\]/i); if (dm) difficulty = parseInt(dm[1]);
      const mm = l.match(/\[Mức:\s*(dễ|trung bình|khó)\]/i);
      if (mm) { const m = mm[1].toLowerCase(); difficulty = m === 'dễ' ? 1 : m === 'trung bình' ? 2 : 3; }
      const pm = l.match(/\[Điểm:\s*([\d.]+)\]/i); if (pm) points = parseFloat(pm[1]);
      const chm = l.match(/\[Chương:\s*([^\]]+)\]/i); if (chm) chapter = chm[1].trim();
      const km = l.match(/\[Từ khóa:\s*([^\]]+)\]/i); if (km && !answer) answer = km[1].trim();
      i++;
      if (l.includes('[Điểm:') || l.match(/^Đáp án/i)) break;
    }

    let type: QuestionType = typeHint.includes('tl') ? 'essay' : typeHint.includes('tf') ? 'tf' : options.length >= 2 ? 'mcq' : 'essay';
    if (!answer) { status = type === 'essay' ? 'warn' : 'error'; warnMsg = type === 'essay' ? 'Tự luận — GV chấm tay' : 'Không tìm thấy đáp án'; }

    questions.push({ id: `q_${num}_${Date.now() + num}`, num, text: textLines.join(' ').trim(), type, options, answer, points, difficulty, status, warnMsg });
  }
  return { questions, subject: detectedSubject || undefined, chapter: detectedChapter || undefined };
}

/* ══════════════════════════════════════════════════════════
   LƯU VÀO LOCALSTORAGE — hoạt động 100% không cần API
   ══════════════════════════════════════════════════════════ */
function saveToLocalStorage(teacherId: string, cfg: ExamConfig, questions: ParsedQ[], className: string, publish = false) {
  const existing = JSON.parse(localStorage.getItem(`exams_${teacherId}`) || '[]');
  const id = `exam_${Date.now()}`;
  const closeAt = new Date(Date.now() + cfg.deadlineDays * 86_400_000).toISOString();
  existing.push({
    id, title: `${cfg.subject} — ${cfg.chapter}`, subject: cfg.subject,
    examKind: cfg.examKind,
    className, duration: cfg.duration, status: publish ? 'OPEN' : 'DRAFT',
    variantCount: cfg.variantCount, deadlineAt: closeAt,
    reviewUnlocksAt: new Date(Date.now() + cfg.deadlineDays * 86_400_000 + 7 * 86_400_000).toISOString(),
    publishedAt: publish ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(), classSize: 0,
    totalQ: questions.length,
    maxScore: questions.reduce((s, q) => s + q.points, 0),
    submissions: [],
    items: questions.map((q, idx) => ({
      id: `${id}_i${idx}`, order: idx + 1, pointsSnapshot: q.points,
      textSnapshot: q.text,
      optionsSnapshot: JSON.stringify({
        options: q.options || [],
        subItems: q.subItems || [],
        images: q.images || [],
        inlineImages: q.inlineImages || [],
        type: q.type === 'tf4' ? 'TF4' : q.type === 'saq' ? 'SAQ' : undefined,
      }),
      answerSnapshot: q.type === 'tf4' && q.subItems?.length
        ? JSON.stringify(q.subItems.reduce<Record<string, string>>((acc, s) => {
          acc[s.label] = s.answer || '';
          return acc;
        }, {}))
        : q.answer,
      kindSnapshot: q.type === 'mcq' ? 'MCQ' : q.type === 'tf' ? 'TF' : q.type === 'tf4' ? 'TF4' : q.type === 'saq' ? 'SAQ' : 'ESSAY',
      question: { kind: q.type === 'mcq' ? 'MCQ' : (q.type === 'tf' || q.type === 'tf4') ? 'TF' : 'ESSAY', difficulty: q.difficulty <= 1 ? 'EASY' : q.difficulty <= 2 ? 'MEDIUM' : 'HARD', points: q.points },
    })),
  });
  localStorage.setItem(`exams_${teacherId}`, JSON.stringify(existing));
  return id;
}

/* ─── UI helpers ─────────────────────────────────────────── */
function Reveal({ visible, delay = 0, children }: { visible: boolean; delay?: number; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (!visible) { setShow(false); return; } const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [visible, delay]);
  if (!show) return null;
  return <div style={{ animation: 'examReveal .32s cubic-bezier(.34,1.3,.64,1) both' }}>{children}</div>;
}
function StepBlock({ title, done, children, onHeaderClick }: { title: string; done?: boolean; children: React.ReactNode; onHeaderClick?: () => void }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <div
        onClick={onHeaderClick}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,.05)', cursor: onHeaderClick ? 'pointer' : 'default' }}>
        {done ? <Check style={{ width: 14, height: 14, color: '#60C8FF', flexShrink: 0 }} /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.25)', flexShrink: 0 }} />}
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E2EAF4' }}>{title}</span>
      </div>
      <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,.03)' }}>{children}</div>
    </div>
  );
}
function PhaseBar({ phase, onJump }: { phase: ExamPhase; onJump?: (target: ExamPhase) => void }) {
  const phases: ExamPhase[] = ['upload', 'review', 'config', 'done'];
  const labels = ['Upload', 'Review', 'Cấu hình', 'Phát hành'];
  const order = ['upload', 'parsing', 'review', 'config', 'done'];
  const cur = order.indexOf(phase);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {phases.map((ph, i) => {
        const pi = order.indexOf(ph); const done = cur > pi; const active = ph === phase || (phase === 'parsing' && ph === 'upload'); const canJump = cur >= pi && phase !== 'parsing'; return (
          <span key={ph} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              disabled={!canJump}
              onClick={() => canJump && onJump?.(ph)}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 500, background: active ? '#185FA5' : done ? 'rgba(59,109,17,.25)' : 'rgba(255,255,255,.06)', color: active ? 'white' : done ? '#7EFFB2' : 'rgba(255,255,255,.5)', border: 'none', cursor: canJump ? 'pointer' : 'default', opacity: canJump ? 1 : .85 }}>
              {done && !active ? '✓ ' : ''}{labels[i]}
            </button>
            {i < phases.length - 1 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>›</span>}
          </span>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function ExamCreator({ activeClass, onBack, defaultSubject }: { activeClass: ClassInfo | null; onBack: () => void; defaultSubject?: string }) {
  const [phase, setPhase] = useState<ExamPhase>('upload');
  const [buildMode, setBuildMode] = useState<'choose' | 'file' | 'manual'>('choose');
  const [parseLog, setParseLog] = useState<string[]>([]);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStage, setParseStage] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed' | 'canceled'>('idle');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isCancelingJob, setIsCancelingJob] = useState(false);
  const [lastParsedFile, setLastParsedFile] = useState<File | null>(null);
  const [parseETA, setParseETA] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ParsedQ[]>([]);
  const [parsedImages, setParsedImages] = useState<string[]>([]);
  const [parseMatrix, setParseMatrix] = useState<{ mcq: number; tf: number; saq?: number; essay: number; total: number; withImages?: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [manualAnswers, setManualAnswers] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const stopPollingRef = useRef(false);

  // Manual question builder state
  const [builderQs, setBuilderQs] = useState<ParsedQ[]>([]);
  const [editingQ, setEditingQ] = useState<ParsedQ | null>(null);
  const [qForm, setQForm] = useState({ text: '', type: 'mcq' as QuestionType, opts: ['', '', '', ''], answer: 'A', points: 0.5, essay: '' });
  const addBuilderQ = () => {
    const id = `bq_${Date.now()}`;
    let q: ParsedQ;
    if (qForm.type === 'mcq') {
      const filledOpts = qForm.opts.filter(o => o.trim());
      q = { id, num: builderQs.length + 1, type: 'mcq', text: qForm.text.trim(), options: filledOpts, answer: qForm.answer, points: qForm.points, difficulty: 1, status: 'ok' };
    } else if (qForm.type === 'tf') {
      q = { id, num: builderQs.length + 1, type: 'tf', text: qForm.text.trim(), options: [], answer: qForm.answer || 'Đúng', points: qForm.points, difficulty: 1, status: 'ok' };
    } else {
      q = { id, num: builderQs.length + 1, type: 'essay', text: qForm.text.trim(), options: [], answer: qForm.essay || '', points: qForm.points, difficulty: 1, status: 'warn', warnMsg: 'Tự luận — GV chấm tay' };
    }
    if (!q.text) return;
    setBuilderQs(p => [...p, q]);
    setQForm({ text: '', type: qForm.type, opts: ['', '', '', ''], answer: 'A', points: qForm.points, essay: '' });
  };
  const removeBuilderQ = (id: string) => setBuilderQs(p => p.filter(q => q.id !== id));
  const commitManual = () => {
    if (builderQs.length === 0) return;
    setQuestions(builderQs);
    setF('mcqCount', builderQs.filter(q => q.type === 'mcq').length);
    setF('tfCount', builderQs.filter(q => q.type === 'tf').length);
    setF('essayCount', builderQs.filter(q => q.type === 'essay').length);
    setPhase('review');
  };
  const startEditQuestion = (q: ParsedQ) => {
    setEditingQ({
      ...q,
      options: [...q.options],
      subItems: q.subItems ? q.subItems.map((s) => ({ ...s })) : undefined,
    });
  };
  const saveEditQuestion = () => {
    if (!editingQ) return;
    const cleanText = editingQ.text.trim();
    if (!cleanText) return;
    const nextAnswer = editingQ.type === 'tf4'
      ? buildTF4AnswerText(editingQ.subItems)
      : (manualAnswers[editingQ.id] || editingQ.answer || '').trim();
    const cleaned: ParsedQ = {
      ...editingQ,
      text: cleanText,
      options: editingQ.type === 'mcq' ? editingQ.options.map(o => o.trim()).filter(Boolean) : [],
      answer: nextAnswer,
    };
    setQuestions(prev => prev.map(q => q.id === cleaned.id ? { ...cleaned } : q));
    if (cleaned.answer) {
      setManualAnswers(prev => ({ ...prev, [cleaned.id]: cleaned.answer }));
    }
    setEditingQ(null);
  };

  const [cfg, setCfg] = useState<ExamConfig>({ ...DEFAULT_CFG, subject: defaultSubject || DEFAULT_CFG.subject });
  const setF = <K extends keyof ExamConfig>(k: K, v: ExamConfig[K]) => setCfg(c => ({ ...c, [k]: v }));

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [savedDraft, setSavedDraft] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const autoMcqCount = questions.filter(q => q.type === 'mcq').length;
  const autoTfCount = questions.filter(q => q.type === 'tf' || q.type === 'tf4').length;
  const autoEssayCount = questions.filter(q => q.type === 'essay' || q.type === 'saq').length;
  const totalQ = questions.length > 0 ? questions.length : cfg.mcqCount + cfg.tfCount + cfg.essayCount;
  const s0done = !!cfg.chapter;
  const s1done = totalQ > 0;
  const s2done = cfg.duration > 0 && cfg.deadlineDays > 0;
  const s3done = cfg.variantCount > 0;
  const deadlineDate = new Date(Date.now() + cfg.deadlineDays * 86_400_000).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
  const phaseOrder: ExamPhase[] = ['upload', 'parsing', 'review', 'config', 'done'];
  const goToPhase = (target: ExamPhase) => {
    if (phase === 'parsing') return;
    const currentIdx = phaseOrder.indexOf(phase);
    const targetIdx = phaseOrder.indexOf(target);
    if (targetIdx >= 0 && targetIdx <= currentIdx) setPhase(target);
  };

  const BLUE = '#185FA5';
  const inp = { width: '100%', padding: '9px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.07)', color: '#E2EAF4', fontSize: 13, outline: 'none', fontFamily: 'inherit' } as React.CSSProperties;
  const inpBlue = { ...inp, border: '1px solid #185FA5', background: 'rgba(24,95,165,.12)' } as React.CSSProperties;
  const pill = (a: boolean) => ({ padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1.5px solid ${a ? '#60C8FF' : 'rgba(255,255,255,.15)'}`, background: a ? BLUE : 'rgba(255,255,255,.07)', color: a ? 'white' : 'rgba(255,255,255,.5)', cursor: 'pointer', transition: 'all .15s' } as React.CSSProperties);

  const parseStateLabel: Record<typeof parseStage, string> = {
    idle: 'Đang khởi tạo',
    queued: 'Đang chờ trong hàng đợi',
    processing: 'Worker đang xử lý',
    completed: 'Hoàn tất',
    failed: 'Thất bại',
    canceled: 'Đã hủy',
  };

  const parseStateColor: Record<typeof parseStage, string> = {
    idle: '#60C8FF',
    queued: '#60C8FF',
    processing: '#FBB040',
    completed: '#4ADEAA',
    failed: '#F87171',
    canceled: '#94A3B8',
  };

  /* ── Parse ─────────────────────────────────────────────── */
  const runParse = async (file: File) => {
    stopPollingRef.current = false;
    setLastParsedFile(file);
    setPhase('parsing');
    setParseLog([]);
    setParseProgress(0);
    setParseError(null);
    setParseETA(null);
    setParseStage('idle');
    setActiveJobId(null);
    const log = (m: string) => setParseLog(p => [...p, m]);

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const pollJobUntilDone = async (jobId: string) => {
      let tries = 0;
      const maxTries = 240; // 240 * 1.5s ~= 6 minutes
      let lastStatus = '';
      let queuedAtMs = 0;
      let processingAtMs = 0;

      while (tries < maxTries) {
        if (stopPollingRef.current) {
          throw new Error('Đã hủy tiến trình parse.');
        }

        tries += 1;

        const statusRes = await fetch(`/api/jobs/${jobId}`);
        if (!statusRes.ok) {
          const statusErr = await statusRes.json().catch(() => ({}));
          throw new Error(statusErr.error || `Không đọc được trạng thái job (${statusRes.status})`);
        }

        const job = await statusRes.json();
        const status = String(job.status || '').toUpperCase();

        if (status !== lastStatus) {
          lastStatus = status;
          if (status === 'QUEUED') {
            queuedAtMs = Date.now();
            setParseStage('queued');
            setParseProgress(68);
            log('Đang xếp hàng xử lý...');
          } else if (status === 'PROCESSING') {
            processingAtMs = Date.now();
            setParseStage('processing');
            setParseProgress(86);
            log('Worker đang parse nội dung đề...');
          } else if (status === 'FAILED') {
            setParseStage('failed');
            setParseETA(null);
            throw new Error(job.error || 'Parse thất bại trong background worker');
          } else if (status === 'CANCELED') {
            setParseStage('canceled');
            setParseETA(null);
            throw new Error(job.error || 'Job đã bị hủy');
          } else if (status === 'COMPLETED') {
            setParseStage('completed');
            setParseETA(null);
            setParseProgress(95);
            log('Nhận kết quả parse từ worker...');
            return job;
          }
        }

        // Update ETA live on every poll tick
        if (status === 'QUEUED' && queuedAtMs) {
          const elapsedS = Math.floor((Date.now() - queuedAtMs) / 1000);
          const etaS = Math.max(0, 30 - elapsedS);
          setParseETA(etaS > 0 ? `Worker sẽ nhận job trong ~${etaS}s` : 'Worker đang nhận job...');
        } else if (status === 'PROCESSING' && processingAtMs) {
          const elapsedS = Math.floor((Date.now() - processingAtMs) / 1000);
          const etaS = Math.max(0, 90 - elapsedS);
          setParseETA(etaS > 60 ? 'Parse DOCX thường mất ~1-2 phút' : etaS > 0 ? `Còn khoảng ${etaS}s...` : 'Sắp hoàn thành...');
        }

        await wait(1500);
      }

      throw new Error('Hết thời gian chờ parse. Vui lòng thử lại.');
    };

    for (const [pct, msg] of [[10, `Mở file "${file.name}"...`], [30, 'Nhận diện định dạng'], [50, 'Phân tích câu hỏi...']] as [number, string][]) {
      await new Promise(r => setTimeout(r, 350)); setParseProgress(pct); log(msg);
    }

    let parsed: ParsedQ[] = [], sub = '', chp = '';
    let extractedImages: string[] = [];

    // 1. Parse qua API (ưu tiên vì hỗ trợ .docx + ảnh)
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/exams/parse-docx', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Không parse được file theo mẫu K12');
      }
      const data = await res.json();

      // New default behavior: endpoint enqueues async parse job.
      if (data?.queued && data?.jobId) {
        setParseProgress(60);
        setParseStage('queued');
        setActiveJobId(String(data.jobId));
        log(`✓ Đã tạo job parse: ${data.jobId}`);
        const job = await pollJobUntilDone(data.jobId as string);

        const body = job?.result?.body || {};
        parsed = body.questions || [];
        sub = body.subject || '';
        chp = body.chapter || '';
        extractedImages = body.images || [];
        setParseMatrix(body.matrix || null);
        log(`✓ Parse hoàn tất — ${parsed.length} câu`);
      } else {
        // Backward compatibility if server still returns sync result
        parsed = data.questions || [];
        sub = data.subject || '';
        chp = data.chapter || '';
        extractedImages = data.images || [];
        setParseMatrix(data.matrix || null);
        setParseStage('completed');
        log(`✓ Server parse xong — ${parsed.length} câu`);
      }
    } catch (apiError: any) {
      // 2. Chỉ fallback cho .txt; .docx bắt buộc parse chuẩn API
      if (!file.name.match(/\.(txt)$/i)) {
        throw new Error(apiError?.message || 'Không parse được file .docx theo mẫu K12');
      }
      log('Đang phân tích trực tiếp trên trình duyệt...');
      setParseProgress(60);
      if (file.name.match(/\.(txt)$/i)) {
        const text = await file.text();
        const result = parseText(text);
        parsed = result.questions; sub = result.subject || ''; chp = result.chapter || '';
      }
      setParseMatrix(null);
      log(`✓ Phân tích xong — ${parsed.length} câu hỏi`);
    }

    if (parsed.length === 0) {
      throw new Error('Không tìm thấy câu hỏi hợp lệ. Vui lòng dùng đúng mẫu K12.');
    }

    setParseProgress(100);
    setParseStage('completed');
    setActiveJobId(null);
    setQuestions(parsed);
    setParsedImages(extractedImages);
    // Cập nhật số câu theo từng loại dựa vào file đã parse
    setF('mcqCount', parsed.filter(q => q.type === 'mcq').length);
    setF('tfCount', parsed.filter(q => q.type === 'tf' || q.type === 'tf4').length);
    setF('essayCount', parsed.filter(q => q.type === 'essay' || q.type === 'saq').length);
    if (sub && !cfg.subject) setF('subject', sub);
    if (chp && !cfg.chapter) setF('chapter', chp);
    await new Promise(r => setTimeout(r, 300));
    setPhase('review');
  };

  const handleParseFromFile = async (file: File) => {
    try {
      await runParse(file);
    } catch (err: any) {
      const message = err?.message || 'Không parse được file theo mẫu K12';
      setParseError(message);
      setParseStage(message.includes('hủy') ? 'canceled' : 'failed');
      setActiveJobId(null);
      setPhase('upload');
      setParseProgress(0);
      setParseLog([]);
    }
  };

  const handleCancelParseJob = async () => {
    if (!activeJobId || isCancelingJob) return;

    setIsCancelingJob(true);
    stopPollingRef.current = true;

    try {
      const res = await fetch(`/api/jobs/${activeJobId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Không hủy được job');
      }

      setParseStage('canceled');
      setParseError('Đã hủy tiến trình parse.');
      setActiveJobId(null);
      setParseProgress(0);
      setParseLog([]);
      setPhase('upload');
    } catch (error: any) {
      stopPollingRef.current = false;
      setParseError(error?.message || 'Không hủy được job');
    } finally {
      setIsCancelingJob(false);
    }
  };

  /* ── Tạo đề — thử API, fallback localStorage ─────────── */
  const handleGenerate = async () => {
    const teacher = getAuthUser();
    const finalQs = questions.map(q => ({ ...q, answer: manualAnswers[q.id] ?? q.answer }));

    // Validate: all non-essay questions must have answers
    const missing = finalQs.filter(q => q.type !== 'essay' && !q.answer);
    if (missing.length > 0) {
      alert(`Còn ${missing.length} câu chưa có đáp án. Vui lòng điền đầy đủ đáp án trước khi tạo đề.`);
      return;
    }

    setIsGenerating(true);
    const subjectName = cfg.subject || defaultSubject || DEFAULT_CFG.subject;
    const generatedTitle = `${subjectName} — ${cfg.chapter || 'Tổng hợp'}`;

    let createdId: string | null = null;

    // Thử API
    try {
      const res = await fetch('/api/exams', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: generatedTitle, subject: subjectName, examKind: cfg.examKind, className: activeClass?.name || '', duration: cfg.duration, mcqCount: autoMcqCount, tfCount: autoTfCount, essayCount: autoEssayCount, variantCount: cfg.variantCount, deadlineDays: cfg.deadlineDays, creatorId: teacher?.id, questions: finalQs }),
      });
      if (res.ok) { const d = await res.json(); createdId = d.id; }
      else throw new Error('no_api');
    } catch {
      // Lưu localStorage — hoàn toàn hoạt động không cần backend
      if (teacher?.id) createdId = saveToLocalStorage(teacher.id, cfg, finalQs, activeClass?.name || '');
      else createdId = `exam_${Date.now()}`;
    }

    setExamId(createdId);
    setIsGenerating(false);
    setPhase('done');
  };

  /* ── Phát hành ─────────────────────────────────────────── */
  const handlePublish = async () => {
    setIsPublishing(true);
    const teacher = getAuthUser();

    try {
      const closeAt = new Date(Date.now() + cfg.deadlineDays * 86_400_000).toISOString();
      const res = await fetch(`/api/exams/${examId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ closeAt }) });
      if (!res.ok) throw new Error('no_api');
    } catch {
      // Cập nhật localStorage
      if (teacher?.id) {
        const all = JSON.parse(localStorage.getItem(`exams_${teacher.id}`) || '[]');
        localStorage.setItem(`exams_${teacher.id}`, JSON.stringify(all.map((e: any) => e.id === examId ? { ...e, status: 'OPEN', publishedAt: new Date().toISOString() } : e)));
      }
    }
    setPublishSuccess(true);
    setIsPublishing(false);
  };

  const resetAll = () => { stopPollingRef.current = true; setPhase('upload'); setBuildMode('choose'); setParseLog([]); setParseProgress(0); setParseStage('idle'); setActiveJobId(null); setLastParsedFile(null); setParseETA(null); setQuestions([]); setParsedImages([]); setParseMatrix(null); setParseError(null); setBuilderQs([]); setManualAnswers({}); setCfg({ ...DEFAULT_CFG, subject: defaultSubject || DEFAULT_CFG.subject }); setSavedDraft(false); setExamId(null); setPublishSuccess(false); };

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <style>{`@keyframes examReveal{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} .ans-btn:hover{opacity:.85;} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Quay lại</button>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#E2EAF4' }}>Tạo bài kiểm tra</h2>
          {activeClass && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'rgba(24,95,165,.25)', color: '#60C8FF', fontWeight: 600 }}>{activeClass.name}</span>}
        </div>
        <div className="hidden sm:block"><PhaseBar phase={phase} onJump={goToPhase} /></div>
      </div>

      {/* ══ UPLOAD ══ */}
      {phase === 'upload' && (
        <div style={{ animation: 'examReveal .3s ease both' }}>

          {/* ── Choose mode ── */}
          {buildMode === 'choose' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setBuildMode('manual')} style={{ padding: '24px 16px', borderRadius: 14, background: 'rgba(24,95,165,.15)', border: '1.5px solid rgba(96,200,255,.35)', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✏️</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#60C8FF', marginBottom: 4 }}>Tạo câu hỏi thủ công</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Nhập từng câu hỏi trực tiếp — dễ dùng, không cần file</div>
              </button>
              <button onClick={() => setBuildMode('file')} style={{ padding: '24px 16px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1.5px dashed rgba(255,255,255,.2)', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#E2EAF4', marginBottom: 4 }}>Upload file .txt</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Tải lên file text với định dạng câu hỏi</div>
              </button>
            </div>
          )}

          {/* ── File upload ── */}
          {buildMode === 'file' && (
            <>
              <div style={{ marginBottom: 12, border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 12px', background: 'rgba(255,255,255,.03)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#60C8FF', marginBottom: 8 }}>Mẫu đề K12 online (gợi ý định dạng có hình ảnh)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ border: '1px solid rgba(96,200,255,.2)', borderRadius: 8, padding: 8, background: 'rgba(24,95,165,.12)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>Tiêu đề đề thi</div>
                    <div style={{ fontSize: 12, color: '#E2EAF4', fontWeight: 700 }}>MẪU THỬ K12 ONLINE</div>
                    <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Có thể chèn hình minh họa trong câu hỏi.</div>
                  </div>
                  <div style={{ border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: 8, background: 'rgba(255,255,255,.04)' }}>
                    <div style={{ width: '100%', height: 74, borderRadius: 6, background: 'linear-gradient(135deg,#185FA5,#60C8FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>ẢNH MINH HỌA TỪ FILE .DOCX</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>Khi parse thành công, ảnh sẽ hiển thị ở bước Review.</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>💡</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FCD34D', marginBottom: 4 }}>Lưu ý khi dùng công thức MathType</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
                      Để công thức và ký hiệu Toán học lên hệ thống trực tuyến sắc nét nhất: Mở file Word &gt; Chọn tab <strong>MathType</strong> &gt; Bấm <strong>Convert Equations</strong> &gt; Tích chọn <strong>MathType or Equation Editor</strong> và chuyển thành <strong>MathML or TeX</strong> trước khi lưu file.
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ border: '2px dashed rgba(96,200,255,.4)', borderRadius: 16, background: 'rgba(255,255,255,.04)', padding: '52px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}
                onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleParseFromFile(f); }} onClick={() => fileRef.current?.click()}>
                <Upload style={{ width: 36, height: 36, color: BLUE, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#60C8FF', margin: '0 0 6px' }}>Kéo thả file vào đây hoặc bấm để chọn</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', margin: 0 }}>Hỗ trợ: <strong>.docx</strong> (mẫu demo) · <strong>.txt</strong> (parse câu hỏi thật)</p>
                <input ref={fileRef} type="file" accept=".docx,.doc,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleParseFromFile(f); }} />
              </div>
              {parseError && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(248,113,113,.14)', border: '1px solid rgba(248,113,113,.35)', fontSize: 12, color: '#fda4af', marginBottom: lastParsedFile && (parseStage === 'failed' || parseStage === 'canceled') ? 6 : 0 }}>⚠ {parseError}</div>
                  {lastParsedFile && (parseStage === 'failed' || parseStage === 'canceled') && (
                    <button
                      onClick={() => handleParseFromFile(lastParsedFile)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'rgba(251,176,64,.15)', border: '1px solid rgba(251,176,64,.4)', color: '#FBB040', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      🔄 Thử lại — &quot;{lastParsedFile.name}&quot;
                    </button>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <button onClick={() => setBuildMode('choose')} style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', background: 'none', border: 'none', cursor: 'pointer' }}>← Quay lại</button>
                <a href="/Mau-Thu-K12-Online.docx" download style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 7, background: 'rgba(96,200,255,.1)', color: '#60C8FF', fontSize: 11, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(96,200,255,.25)' }}>📥 File mẫu K12 (.docx)</a>
                <a href="/mau-de-kiem-tra.txt" download style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 7, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.65)', fontSize: 11, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,.16)' }}>txt dự phòng</a>
              </div>
            </>
          )}

          {/* ── Manual builder ── */}
          {buildMode === 'manual' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <button onClick={() => setBuildMode('choose')} style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', background: 'none', border: 'none', cursor: 'pointer' }}>← Quay lại</button>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#E2EAF4' }}>Tạo câu hỏi — {builderQs.length} câu</span>
                {builderQs.length > 0 && (
                  <button onClick={commitManual} style={{ marginLeft: 'auto', padding: '6px 18px', borderRadius: 8, background: BLUE, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Xong — Xem lại {builderQs.length} câu →
                  </button>
                )}
              </div>

              {/* Question type selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {([['mcq', '📝 Trắc nghiệm'], ['tf', '✓ Đúng/Sai'], ['essay', '✏️ Tự luận']] as const).map(([t, l]) => (
                  <button key={t} onClick={() => setQForm(f => ({ ...f, type: t, answer: t === 'tf' ? 'Đúng' : 'A' }))} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: qForm.type === t ? '#185FA5' : 'rgba(255,255,255,.08)', color: qForm.type === t ? 'white' : 'rgba(255,255,255,.5)' }}>{l}</button>
                ))}
              </div>

              {/* Question text */}
              <textarea value={qForm.text} onChange={e => setQForm(f => ({ ...f, text: e.target.value }))} placeholder="Nhập nội dung câu hỏi..." rows={3} style={{ ...inp, resize: 'vertical', marginBottom: 8 }} />

              {/* MCQ options */}
              {qForm.type === 'mcq' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                  {qForm.opts.map((o, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', width: 16 }}>{String.fromCharCode(65 + i)}.</span>
                      <input value={o} onChange={e => { const n = [...qForm.opts]; n[i] = e.target.value; setQForm(f => ({ ...f, opts: n })); }} placeholder={`Đáp án ${String.fromCharCode(65 + i)}`} style={{ ...inp, padding: '6px 10px', fontSize: 12 }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Answer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', flexShrink: 0 }}>Đáp án đúng:</span>
                {qForm.type === 'mcq' && ['A', 'B', 'C', 'D'].map(l => (
                  <button key={l} onClick={() => setQForm(f => ({ ...f, answer: l }))} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 700, background: qForm.answer === l ? BLUE : 'rgba(255,255,255,.1)', color: qForm.answer === l ? 'white' : 'rgba(255,255,255,.5)' }}>{l}</button>
                ))}
                {qForm.type === 'tf' && ['Đúng', 'Sai'].map(l => (
                  <button key={l} onClick={() => setQForm(f => ({ ...f, answer: l }))} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', background: qForm.answer === l ? BLUE : 'rgba(255,255,255,.1)', color: qForm.answer === l ? 'white' : 'rgba(255,255,255,.5)' }}>{l}</button>
                ))}
                {qForm.type === 'essay' && <input value={qForm.essay} onChange={e => setQForm(f => ({ ...f, essay: e.target.value }))} placeholder="Từ khóa / đáp án gợi ý (tùy chọn)" style={{ ...inp, flex: 1, padding: '5px 10px', fontSize: 12 }} />}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Điểm:</span>
                  {[0.25, 0.5, 1, 1.5, 2].map(p => (
                    <button key={p} onClick={() => setQForm(f => ({ ...f, points: p }))} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, border: 'none', cursor: 'pointer', background: qForm.points === p ? '#185FA5' : 'rgba(255,255,255,.08)', color: qForm.points === p ? 'white' : 'rgba(255,255,255,.5)' }}>{p}</button>
                  ))}
                </div>
              </div>

              <button onClick={addBuilderQ} disabled={!qForm.text.trim()} style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: qForm.text.trim() ? '#22c55e' : 'rgba(255,255,255,.08)', color: qForm.text.trim() ? 'white' : 'rgba(255,255,255,.3)', border: 'none', fontSize: 13, fontWeight: 600, cursor: qForm.text.trim() ? 'pointer' : 'not-allowed', marginBottom: 12 }}>
                + Thêm câu hỏi
              </button>

              {/* List of added questions */}
              {builderQs.length > 0 && (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {builderQs.map((q, i) => (
                    <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 8, marginBottom: 6, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', minWidth: 20, paddingTop: 1 }}>#{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 12, color: '#E2EAF4', lineHeight: 1.5 }}><InlineContentRenderer content={q.text} inlineImages={q.inlineImages} /></span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: q.type === 'mcq' ? 'rgba(24,95,165,.25)' : q.type === 'tf' ? 'rgba(10,61,46,.25)' : 'rgba(239,159,39,.15)', color: q.type === 'mcq' ? '#60C8FF' : q.type === 'tf' ? '#4ADEAA' : '#FBB040', flexShrink: 0 }}>{q.type === 'mcq' ? 'TN' : q.type === 'tf' ? 'Đ/S' : 'TL'}</span>
                      <button onClick={() => removeBuilderQ(q.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ PARSING ══ */}
      {phase === 'parsing' && (
        <div style={{ animation: 'examReveal .3s ease both' }}>
          <div style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', borderStyle: 'solid', borderWidth: 2, borderLeftColor: parseStateColor[parseStage], borderRightColor: parseStateColor[parseStage], borderBottomColor: parseStateColor[parseStage], borderTopColor: 'transparent', animation: 'spin .8s linear infinite', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#E2EAF4' }}>Đang phân tích file...</div>
                  <div style={{ fontSize: 11, color: parseStateColor[parseStage] }}>{parseStateLabel[parseStage]}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {activeJobId && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontFamily: 'monospace' }}>job: {activeJobId.slice(0, 10)}...</span>}
                {activeJobId && (
                  <button
                    onClick={handleCancelParseJob}
                    disabled={isCancelingJob}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(248,113,113,.35)', background: 'rgba(248,113,113,.15)', color: '#fda4af', cursor: isCancelingJob ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, opacity: isCancelingJob ? 0.75 : 1 }}
                  >
                    <XCircle style={{ width: 13, height: 13 }} />
                    {isCancelingJob ? 'Đang hủy...' : 'Hủy job'}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { key: 'queued', label: 'QUEUED', active: parseStage === 'queued' || parseStage === 'processing' || parseStage === 'completed', color: '#60C8FF' },
                { key: 'processing', label: 'PROCESSING', active: parseStage === 'processing' || parseStage === 'completed', color: '#FBB040' },
                { key: 'completed', label: 'COMPLETED', active: parseStage === 'completed', color: '#4ADEAA' },
              ].map((step) => (
                <div key={step.key} style={{ border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '6px 8px', background: step.active ? `${step.color}22` : 'rgba(255,255,255,.03)' }}>
                  <div style={{ fontSize: 10, color: step.active ? step.color : 'rgba(255,255,255,.35)', fontWeight: 700 }}>{step.label}</div>
                </div>
              ))}
            </div>

            <div style={{ height: 8, background: 'rgba(255,255,255,.08)', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${parseProgress}%`, background: `linear-gradient(90deg, ${parseStateColor[parseStage]}, #60C8FF)`, borderRadius: 99, transition: 'width .35s ease' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: parseETA ? 4 : 10, fontSize: 11 }}>
              <span style={{ color: 'rgba(255,255,255,.5)' }}>Tiến độ xử lý</span>
              <span style={{ color: parseStateColor[parseStage], fontWeight: 700 }}>{parseProgress}%</span>
            </div>
            {parseETA && (parseStage === 'queued' || parseStage === 'processing') && (
              <div style={{ marginBottom: 10, fontSize: 11, color: 'rgba(255,255,255,.4)', textAlign: 'center', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
                ⏱ {parseETA}
              </div>
            )}

            <div style={{ maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.8 }}>
              {parseLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* ══ REVIEW ══ */}
      {phase === 'review' && (
        <div style={{ animation: 'examReveal .3s ease both' }}>
          {parseMatrix && (
            <div style={{ marginBottom: 12, border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '8px 12px', background: 'rgba(24,95,165,.12)', fontSize: 12, color: '#E2EAF4' }}>
              Ma trận: TN {parseMatrix.mcq} · Đ/S {parseMatrix.tf}{parseMatrix.saq ? ` · Điền ${parseMatrix.saq}` : ''} · TL {parseMatrix.essay} · Tổng {parseMatrix.total}{parseMatrix.withImages ? ` · 🖼 ${parseMatrix.withImages} câu có ảnh` : ''}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {([['📝 TN', questions.filter(q => q.type === 'mcq').length, '#60C8FF'], ['✓ Đ/S', questions.filter(q => q.type === 'tf' || q.type === 'tf4').length, '#4ADEAA'], ['📝 Điền', questions.filter(q => q.type === 'saq').length, '#A78BFA'], ['✏️ TL', questions.filter(q => q.type === 'essay').length, '#FBB040']] as const).filter(([, c]) => c > 0).map(([l, c, col]) => (
              <div key={l as string} style={{ padding: '5px 12px', borderRadius: 8, background: (col as string) + '22', fontSize: 12, fontWeight: 600, color: col as string }}>{l}: {c}</div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{questions.filter(q => q.status === 'ok').length}/{questions.length} OK</span>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 12 }}>
            {questions.map(q => {
              const sc = q.status === 'ok' ? '#7EFFB2' : q.status === 'warn' ? '#FFB86C' : '#FF9090';
              const typeLabel = q.type === 'mcq' ? 'TN' : q.type === 'tf' ? 'Đ/S' : q.type === 'tf4' ? 'TF4' : q.type === 'saq' ? 'Điền' : 'TL';
              const typeColor = q.type === 'mcq' ? '#60C8FF' : q.type === 'tf' || q.type === 'tf4' ? '#4ADEAA' : q.type === 'saq' ? '#A78BFA' : '#FBB040';
              return (
                <div key={q.id} style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 8, border: `1px solid ${sc}33`, background: q.status === 'ok' ? 'rgba(59,109,17,.1)' : q.status === 'warn' ? 'rgba(239,159,39,.1)' : 'rgba(226,75,74,.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sc, flexShrink: 0, minWidth: 24 }}>#{q.num}</span>
                    <span style={{ fontSize: 15, color: '#E2EAF4', flex: 1 }}><InlineContentRenderer content={q.text} inlineImages={q.inlineImages} /></span>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: `${typeColor}22`, color: typeColor, flexShrink: 0 }}>{typeLabel}</span>
                    <button onClick={() => startEditQuestion(q)} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.05)', color: '#E2EAF4', cursor: 'pointer', flexShrink: 0 }}>Sửa</button>
                  </div>
                  {/* Per-question images — larger display to avoid clipping */}
                  {q.images && q.images.length > 0 && (
                    <div style={{ marginLeft: 28, marginBottom: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {q.images.map((src, idx) => (
                        <img key={idx} src={src} alt={`q${q.num}-img${idx + 1}`} style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 6, border: '1px solid rgba(255,255,255,.15)' }} />
                      ))}
                    </div>
                  )}
                  {/* TF4 sub-items */}
                  {q.type === 'tf4' && q.subItems && q.subItems.length > 0 && (
                    <div style={{ marginLeft: 28, marginBottom: 6 }}>
                      {q.subItems.map(sub => (
                        <div key={sub.label} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, color: '#60C8FF' }}>{sub.label})</span>
                          <span style={{ flex: 1 }}><InlineContentRenderer content={sub.text} inlineImages={q.inlineImages} /></span>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: sub.answer === 'Đúng' ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)', color: sub.answer === 'Đúng' ? '#4ade80' : '#f87171' }}>{sub.answer || '?'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {editingQ?.id === q.id && (
                    <div style={{ marginLeft: 28, marginBottom: 8, padding: 10, borderRadius: 8, border: '1px solid rgba(96,200,255,.25)', background: 'rgba(24,95,165,.12)' }}>
                      <textarea value={editingQ.text} onChange={e => setEditingQ(p => p ? { ...p, text: e.target.value } : p)} rows={3} style={{ ...inp, resize: 'vertical', marginBottom: 6 }} />
                      {editingQ.type === 'mcq' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                          {[0, 1, 2, 3].map(i => (
                            <input key={i} value={editingQ.options[i] || ''} onChange={e => setEditingQ(p => { if (!p) return p; const opts = [...p.options]; opts[i] = e.target.value; return { ...p, options: opts }; })} placeholder={`Đáp án ${String.fromCharCode(65 + i)}`} style={{ ...inp, padding: '6px 10px', fontSize: 12 }} />
                          ))}
                        </div>
                      )}
                      {editingQ.type === 'tf4' && (
                        <div style={{ marginBottom: 6, display: 'grid', gap: 6 }}>
                          {(editingQ.subItems || []).map((sub, idx) => (
                            <div key={sub.label || idx} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#60C8FF' }}>{sub.label})</span>
                              <input
                                value={sub.text || ''}
                                onChange={e => setEditingQ(p => {
                                  if (!p || !p.subItems) return p;
                                  const next = p.subItems.map((x, i) => i === idx ? { ...x, text: e.target.value } : x);
                                  return { ...p, subItems: next };
                                })}
                                placeholder="Nội dung mệnh đề"
                                style={{ ...inp, padding: '6px 10px', fontSize: 12 }}
                              />
                              {['Đúng', 'Sai'].map(choice => (
                                <button
                                  key={choice}
                                  onClick={() => setEditingQ(p => {
                                    if (!p || !p.subItems) return p;
                                    const next = p.subItems.map((x, i) => i === idx ? { ...x, answer: choice } : x);
                                    return { ...p, subItems: next };
                                  })}
                                  style={{ padding: '4px 9px', borderRadius: 6, fontSize: 12, border: 'none', background: (sub.answer || '').toLowerCase() === choice.toLowerCase() ? BLUE : 'rgba(255,255,255,.1)', color: (sub.answer || '').toLowerCase() === choice.toLowerCase() ? 'white' : 'rgba(255,255,255,.55)', cursor: 'pointer' }}
                                >
                                  {choice}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Đáp án:</span>
                        {editingQ.type === 'mcq' && ['A', 'B', 'C', 'D'].map(l => <button key={l} onClick={() => setEditingQ(p => p ? { ...p, answer: l } : p)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 12, border: 'none', background: editingQ.answer === l ? BLUE : 'rgba(255,255,255,.1)', color: editingQ.answer === l ? 'white' : 'rgba(255,255,255,.55)', cursor: 'pointer' }}>{l}</button>)}
                        {editingQ.type === 'tf' && ['Đúng', 'Sai'].map(l => <button key={l} onClick={() => setEditingQ(p => p ? { ...p, answer: l } : p)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 12, border: 'none', background: editingQ.answer === l ? BLUE : 'rgba(255,255,255,.1)', color: editingQ.answer === l ? 'white' : 'rgba(255,255,255,.55)', cursor: 'pointer' }}>{l}</button>)}
                        {editingQ.type === 'tf4' && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{buildTF4AnswerText(editingQ.subItems) || 'Chưa chọn đáp án'}</span>}
                        {editingQ.type === 'essay' && <input value={editingQ.answer || ''} onChange={e => setEditingQ(p => p ? { ...p, answer: e.target.value } : p)} placeholder="Từ khóa gợi ý" style={{ ...inp, padding: '6px 10px', fontSize: 12, flex: 1 }} />}
                        <input type="number" min={0.25} step={0.25} value={editingQ.points} onChange={e => setEditingQ(p => p ? { ...p, points: Number(e.target.value) || p.points } : p)} style={{ ...inp, width: 76, padding: '6px 8px', fontSize: 12, textAlign: 'center' }} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>điểm</span>
                        <button onClick={saveEditQuestion} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 6, fontSize: 11, background: '#0A3D2E', color: '#7EFFB2', border: '1px solid rgba(74,222,128,.3)', cursor: 'pointer' }}>Lưu</button>
                        <button onClick={() => setEditingQ(null)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.15)', cursor: 'pointer' }}>Hủy</button>
                      </div>
                    </div>
                  )}
                  {q.options.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4, marginLeft: 28 }}>{q.options.map((o, i) => <span key={i} style={{ fontSize: 13, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.6)' }}>{String.fromCharCode(65 + i)}. <InlineContentRenderer content={o} inlineImages={q.inlineImages} /></span>)}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 28 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>Đáp án: <strong style={{ color: sc }}>{q.type === 'tf4' ? (buildTF4AnswerText(q.subItems) || '?') : (q.answer || '?')}</strong></span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>{q.points}đ</span>
                    {q.warnMsg && <span style={{ fontSize: 11, color: '#FFB86C' }}>⚠ {q.warnMsg}</span>}
                  </div>
                  {q.status !== 'ok' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, marginLeft: 28 }}>
                      {q.type === 'mcq' && ['A', 'B', 'C', 'D'].map(l => <button key={l} className="ans-btn" onClick={() => setManualAnswers(p => ({ ...p, [q.id]: l }))} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', background: manualAnswers[q.id] === l ? '#185FA5' : 'rgba(255,255,255,.1)', color: manualAnswers[q.id] === l ? 'white' : 'rgba(255,255,255,.5)', fontWeight: 700 }}>{l}</button>)}
                      {q.type === 'tf' && ['Đúng', 'Sai'].map(l => <button key={l} className="ans-btn" onClick={() => setManualAnswers(p => ({ ...p, [q.id]: l }))} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', background: manualAnswers[q.id] === l ? '#185FA5' : 'rgba(255,255,255,.1)', color: manualAnswers[q.id] === l ? 'white' : 'rgba(255,255,255,.5)' }}>{l}</button>)}
                      {q.type === 'essay' && <input style={{ ...inp, flex: 1, background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.2)' }} placeholder="Nhập từ khóa / đáp án gợi ý..." value={manualAnswers[q.id] || ''} onChange={e => setManualAnswers(p => ({ ...p, [q.id]: e.target.value }))} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={() => setPhase('config')} style={{ width: '100%', padding: '12px 0', borderRadius: 10, background: BLUE, color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Xong — Cấu hình đề thi →</button>
        </div>
      )}

      {/* ══ CONFIG ══ */}
      {phase === 'config' && (
        <div style={{ animation: 'examReveal .3s ease both' }}>
          <StepBlock title="Chủ đề & loại kiểm tra" done={s0done}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: BLUE, display: 'block', marginBottom: 5 }}>Chương / Chủ đề</label>
              <input style={inpBlue} placeholder="vd: Chương 3, Ôn tập HK1..." value={cfg.chapter} onChange={e => setF('chapter', e.target.value)} />
              <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Môn học lấy theo tài khoản giáo viên, không cần chọn lại ở bước này.</div>
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>Loại kiểm tra</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {EXAM_KIND_OPTIONS.map(({ key, label, badge }) => (
                <button key={key} onClick={() => setF('examKind', key)}
                  style={{ ...pill(cfg.examKind === key), padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: 10, opacity: .65 }}>{badge}</span>
                </button>
              ))}
            </div>
          </StepBlock>

          <Reveal visible={s0done} delay={80}>
            <StepBlock title="Cấu trúc đề & số câu" done={s1done}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                {([
                  ['mcq', '📝 Trắc nghiệm (4 đáp án)', autoMcqCount, '#60C8FF', 'rgba(24,95,165,.25)'],
                  ['tf', '✓ Đúng / Sai', autoTfCount, '#4ADEAA', 'rgba(10,61,46,.25)'],
                  ['essay', '✏️ Tự luận', autoEssayCount, '#FBB040', 'rgba(59,37,0,.25)']
                ] as const).map(([key, label, count, color, bg]) => (
                  <div key={key} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 8px', background: bg }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color, display: 'block', marginBottom: 6 }}>{label}</label>
                    <div style={{ fontSize: 20, fontWeight: 800, color, textAlign: 'center', lineHeight: 1 }}>{count}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' }}>
                <span style={{ color: 'rgba(255,255,255,.5)' }}>Tổng số câu</span><span style={{ fontWeight: 700, color: '#E2EAF4' }}>{totalQ} câu</span>
              </div>
            </StepBlock>
          </Reveal>

          <Reveal visible={s1done} delay={80}>
            <StepBlock title="Thời gian & hạn nộp" done={s2done}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>Thời gian (phút)</label><div style={{ display: 'flex', gap: 5 }}>{[30, 45, 60, 90].map(m => <button key={m} onClick={() => setF('duration', m)} style={{ ...pill(cfg.duration === m), flex: 1, padding: '7px 0' }}>{m}</button>)}</div></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>Hạn nộp (ngày)</label><div style={{ display: 'flex', gap: 5 }}>{[1, 3, 7, 14].map(d => <button key={d} onClick={() => setF('deadlineDays', d)} style={{ ...pill(cfg.deadlineDays === d), flex: 1, padding: '7px 0' }}>{d}</button>)}<input type="number" min={1} max={90} placeholder="…" onChange={e => { const v = parseInt(e.target.value); if (v > 0) setF('deadlineDays', v); }} style={{ ...inp, width: 48, textAlign: 'center', padding: '7px 4px' }} /></div></div>
              </div>
              {cfg.deadlineDays > 0 && <div style={{ fontSize: 12, color: BLUE, background: 'rgba(24,95,165,.2)', padding: '8px 12px', borderRadius: 8 }}>Hạn nộp: <strong>{deadlineDate} lúc 23:59</strong></div>}
            </StepBlock>
          </Reveal>

          <Reveal visible={s2done} delay={80}>
            <StepBlock title="Số mã đề" done={s3done}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                {[1, 2, 3, 4, 6, 8].map(n => <button key={n} onClick={() => setF('variantCount', n)} style={{ ...pill(cfg.variantCount === n), width: 44 }}>{n}</button>)}
                <input type="number" min={1} max={50} placeholder="khác" onChange={e => { const v = parseInt(e.target.value); if (v > 0) setF('variantCount', v); }} style={{ ...inp, width: 60, textAlign: 'center' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap' }}>mã đề</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', opacity: 0.4, pointerEvents: 'none' }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: '2px solid rgba(255,255,255,.15)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                </div>
                <div><div style={{ fontSize: 13, fontWeight: 500, color: '#E2EAF4' }}>Ngân hàng đề thi</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Tính năng đang phát triển</div></div>
              </label>
            </StepBlock>
          </Reveal>

          <Reveal visible={s3done} delay={80}>
            <button onClick={handleGenerate} disabled={isGenerating} style={{ width: '100%', padding: '13px 0', borderRadius: 10, background: isGenerating ? '#93C5FD' : BLUE, color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'background .2s' }}>
              {isGenerating ? '⚙️  Đang tạo đề...' : `Tạo ${cfg.variantCount} mã đề · ${totalQ} câu · ${cfg.duration} phút · hạn ${cfg.deadlineDays} ngày`}
            </button>
          </Reveal>
        </div>
      )}

      {/* ══ DONE ══ */}
      {phase === 'done' && (
        <div style={{ animation: 'examReveal .35s ease both' }}>
          <div style={{ background: 'rgba(59,109,17,.2)', border: '1px solid #3B6D1188', borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3B6D11', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check style={{ width: 14, height: 14, color: 'white' }} /></div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#7EFFB2' }}>{cfg.variantCount} mã đề đã tạo xong!</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {Array.from({ length: cfg.variantCount }, (_, i) => (
                <div key={i} style={{ border: '1px solid rgba(127,255,178,.25)', borderRadius: 8, padding: '6px 14px', background: 'rgba(59,109,17,.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7EFFB2', fontFamily: 'monospace' }}>Mã {String(i + 1).padStart(3, '0')}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{totalQ} câu · {cfg.duration} phút</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'rgba(127,255,178,.7)', margin: 0 }}>Hạn nộp: <strong>{deadlineDate} lúc 23:59</strong></p>
          </div>

          {publishSuccess && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(59,109,17,.25)', border: '1px solid #7EFFB2', fontSize: 13, color: '#7EFFB2', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}><Check style={{ width: 14, height: 14 }} />Đề đã phát hành cho lớp <strong>{activeClass?.name}</strong>. Học sinh có thể làm bài!</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <button onClick={() => setSavedDraft(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 500, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.07)', color: '#E2EAF4', cursor: 'pointer' }}><Save style={{ width: 15, height: 15 }} />{savedDraft ? 'Đã lưu ✓' : 'Lưu nháp'}</button>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 500, border: '0.5px solid rgba(255,255,255,.15)', background: 'rgba(13,24,41,.95)', color: '#E2EAF4', cursor: 'pointer' }}><Eye style={{ width: 15, height: 15 }} />Review đáp án</button>
          </div>

          {!publishSuccess && <button onClick={handlePublish} disabled={isPublishing} style={{ width: '100%', padding: '12px 0', borderRadius: 10, background: isPublishing ? '#93C5FD' : BLUE, color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: isPublishing ? 'not-allowed' : 'pointer', marginBottom: 8 }}>{isPublishing ? 'Đang phát hành...' : `Phát hành cho lớp ${activeClass?.name || '...'} →`}</button>}

          <button onClick={resetAll} style={{ width: '100%', padding: '8px 0', borderRadius: 10, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Trash2 style={{ width: 12, height: 12 }} />Tạo đề thi mới</button>
        </div>
      )}
    </div>
  );
}