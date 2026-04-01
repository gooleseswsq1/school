'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  Send, BookOpen, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams, usePathname } from 'next/navigation';
import LaTeXRenderer from '@/components/latex/LaTeXRenderer';
import InlineContentRenderer from '@/components/latex/InlineContentRenderer';

/* ─── Types ─────────────────────────────────────────────── */
type QuestionKind = 'MCQ' | 'TF' | 'TF4' | 'SAQ' | 'ESSAY';

interface ExamItem {
  id: string;
  order: number;
  question: {
    id: string;
    text: string;
    kind: string;
    points: number;
    chapter?: string;
    options?: string;
    answer?: string;
  };
  textSnapshot?: string;
  optionsSnapshot?: string;
  kindSnapshot?: string | null;  // loại câu hỏi: MCQ | TF | ESSAY
  answerSnapshot?: string;       // đáp án đúng (dùng để chấm local)
  pointsSnapshot: number;
}

interface ExamData {
  id: string;
  title: string;
  subject: string;
  duration: number;
  status: string;
  items: ExamItem[];
}

interface SnapshotPayload {
  options?: string[];
  subItems?: Array<{ label: string; text: string; answer?: string }>;
  images?: string[];
  inlineImages?: string[];
  type?: string;
}

function normalizeKind(kind: string | null | undefined): QuestionKind {
  const value = String(kind || '').toUpperCase();
  if (value === 'TF4') return 'TF4';
  if (value === 'SAQ') return 'SAQ';
  if (value === 'TF') return 'TF';
  if (value === 'ESSAY') return 'ESSAY';
  return 'MCQ';
}

function parseSnapshotPayload(raw: string | undefined): SnapshotPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { options: parsed.map((x) => String(x)) };
    if (parsed && typeof parsed === 'object') return parsed as SnapshotPayload;
  } catch {
    const fallback = String(raw).split(/[|\n]/).map(s => s.trim()).filter(Boolean);
    if (fallback.length > 0) return { options: fallback };
  }
  return null;
}

function parseTF4AnswerMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).reduce<Record<string, string>>((acc, [k, v]) => {
        acc[k.toLowerCase()] = String(v || '');
        return acc;
      }, {});
    }
  } catch {
    // fallback for legacy answer format: a-Đ b-S c-Đ d-S
  }
  const out: Record<string, string> = {};
  const parts = raw.match(/([a-d])\s*[\-\)]\s*(Đ|S|Đúng|Sai|True|False|1|0)/gi) || [];
  parts.forEach((part) => {
    const m = part.match(/([a-d])\s*[\-\)]\s*(Đ|S|Đúng|Sai|True|False|1|0)/i);
    if (!m) return;
    out[m[1].toLowerCase()] = /^(Đ|Đúng|True|1)$/i.test(m[2]) ? 'Đúng' : 'Sai';
  });
  return out;
}

/* ─── Question kind badge ───────────────────────── */
const KIND_META: Record<string, { label: string; color: string; bg: string }> = {
  MCQ:   { label: 'Trắc nghiệm', color: '#60C8FF', bg: 'rgba(24,95,165,.25)' },
  TF:    { label: 'Đúng / Sai',   color: '#4ADEAA', bg: 'rgba(10,61,46,.25)' },
  TF4:   { label: 'TF4', color: '#89F7FE', bg: 'rgba(37,102,112,.25)' },
  SAQ:   { label: 'SAQ', color: '#F6E27F', bg: 'rgba(110,94,19,.25)' },
  ESSAY: { label: 'Tự luận',     color: '#FBB040', bg: 'rgba(59,37,0,.25)' },
};

/* ─── Countdown timer ────────────────────────────────────── */
function Timer({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expired = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(id);
          if (!expired.current) { expired.current = true; onExpire(); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const isLow = remaining < 5 * 60;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 12,
      background: isLow ? '#3D0C0C' : '#0D1829',
      border: `1px solid ${isLow ? '#FF6B6B44' : 'rgba(255,255,255,.1)'}`,
      animation: isLow && remaining % 2 === 0 ? 'pulse .5s ease' : 'none',
    }}>
      <Clock style={{ width: 15, height: 15, color: isLow ? '#FF6B6B' : '#60C8FF' }} />
      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: isLow ? '#FF6B6B' : '#E2EAF4' }}>
        {h > 0 && `${h}:`}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      </span>
    </div>
  );
}

/* ─── Question navigator dots ────────────────────────────── */
function NavDot({ num, answered, active, onClick }: {
  num: number; answered: boolean; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
        background: active ? '#60C8FF' : answered ? '#0A3D2E' : 'rgba(255,255,255,.08)',
        color: active ? '#000' : answered ? '#4ADEAA' : 'rgba(255,255,255,.5)',
        outline: active ? '2px solid #60C8FF' : 'none',
        outlineOffset: 2,
      }}>
      {num}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
interface StudentExamPageProps {
  mode?: 'exam' | 'review' | 'practice';
}

export default function StudentExamPage({ mode = 'exam' }: StudentExamPageProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const examId = params?.examId as string;
  const isReviewMode = mode !== 'exam' || pathname?.includes('/review');

  const [user, setUser]       = useState<any>(null);
  const [exam, setExam]       = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [currentIdx, setCurrentIdx]   = useState(0);
  const [answers, setAnswers]         = useState<Record<string, string>>({});
  const [tf4Answers, setTf4Answers]   = useState<Record<string, Record<string, 'Đúng' | 'Sai'>>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [score, setScore]             = useState<{ score: number; max: number } | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  /* ── Boot ── */
  useEffect(() => {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) { router.push('/auth/login'); return; }
    const u = JSON.parse(raw);
    setUser(u);
    fetchExam(u.id);
  }, [examId, isReviewMode]);

  const fetchExam = async (studentId: string) => {
    setLoading(true);

    // Exam ID bắt đầu bằng "exam_" → lưu trong localStorage (API chưa hoạt động)
    if (examId?.startsWith('exam_')) {
      try {
        let foundExam: any = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith('exams_')) continue;
          const exams = JSON.parse(localStorage.getItem(key) || '[]');
          foundExam = exams.find((e: any) => e.id === examId);
          if (foundExam) break;
        }
        if (!foundExam) throw new Error('Không tìm thấy đề thi');
        if (!isReviewMode && foundExam.status !== 'OPEN') throw new Error('Đề thi chưa được mở');
        // Map sang format ExamData
        setExam({
          id: foundExam.id,
          title: foundExam.title,
          subject: foundExam.subject || 'Bài kiểm tra',
          duration: foundExam.duration || 45,
          status: foundExam.status,
          items: (foundExam.items || []).map((item: any) => ({
            id: item.id,
            order: item.order,
            pointsSnapshot: item.pointsSnapshot,
            textSnapshot: item.textSnapshot,
            kindSnapshot: item.kindSnapshot || null,
            optionsSnapshot: item.optionsSnapshot,
            answerSnapshot: item.answerSnapshot,
            question: {
              ...(item.question || {}),
              kind: item.kindSnapshot || item.question?.kind || (item.optionsSnapshot ? 'MCQ' : 'ESSAY'),
              points: item.question?.points || item.pointsSnapshot || 1,
            },
          })),
        });
      } catch (e: any) {
        setError(e.message || 'Không thể tải đề thi');
      }
      setLoading(false);
      return;
    }

    // Gọi API bình thường
    try {
      const modeParam = isReviewMode ? '&mode=review' : '';
      const res = await fetch(`/api/exams/${examId}?studentId=${studentId}${modeParam}`);
      if (!res.ok) throw new Error(await res.text());
      setExam(await res.json());
    } catch (e: any) {
      setError(e.message || 'Không thể tải đề thi');
    }
    setLoading(false);
  };

  const currentItem = exam?.items[currentIdx];

  const handleSelectAnswer = (itemId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [itemId]: val }));
  };

  const handleEssayChange = (itemId: string, val: string) => {
    setEssayAnswers(prev => ({ ...prev, [itemId]: val }));
  };

  const handleTF4Select = (itemId: string, label: string, val: 'Đúng' | 'Sai') => {
    setTf4Answers(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [label.toLowerCase()]: val,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!exam || !user) return;
    setSubmitting(true);

    const allAnswers = { ...answers };
    Object.entries(tf4Answers).forEach(([k, v]) => { allAnswers[k] = JSON.stringify(v); });
    Object.entries(essayAnswers).forEach(([k, v]) => { allAnswers[k] = v; });

    // Local exam → chấm điểm client-side
    if (examId?.startsWith('exam_')) {
      let score = 0, maxScore = 0;
      for (const item of exam.items) {
        const pts = item.pointsSnapshot || 1;
        maxScore += pts;
        const kind = normalizeKind(item.kindSnapshot || item.question?.kind);
        if (kind === 'ESSAY' || kind === 'SAQ') continue;
        if (kind === 'TF4') {
          const expected = parseTF4AnswerMap(item.answerSnapshot);
          const actual = parseTF4AnswerMap(allAnswers[item.id]);
          const keys = Object.keys(expected);
          if (keys.length > 0 && keys.every((k) => expected[k] === actual[k])) {
            score += pts;
          }
          continue;
        }
        const correct = (item.answerSnapshot || '').trim().toUpperCase();
        const student = (allAnswers[item.id] || '').trim().toUpperCase();
        if (student && student === correct) score += pts;
      }
      // Lưu kết quả vào localStorage
      const attemptKey = `attempt_${examId}_${user.id}`;
      localStorage.setItem(attemptKey, JSON.stringify({ score, maxScore, submittedAt: new Date().toISOString(), answers: allAnswers }));
      setScore({ score, max: maxScore });
      setSubmitted(true);
      setSubmitting(false);
      return;
    }

    // API submit
    try {
      const res = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id, answers: allAnswers }),
      });
      const data = await res.json();
      setScore(data);
      setSubmitted(true);
    } catch {
      alert('Lỗi khi nộp bài. Vui lòng thử lại.');
    }
    setSubmitting(false);
  };

  const getSubItemCount = (it: ExamItem): number => {
    const payload = parseSnapshotPayload(it.optionsSnapshot || it.question?.options);
    return payload?.subItems?.length || 0;
  };

  const isItemAnswered = (it: ExamItem): boolean => {
    const kind = normalizeKind(it.kindSnapshot || it.question?.kind);
    if (kind === 'ESSAY' || kind === 'SAQ') return Boolean((essayAnswers[it.id] || '').trim());
    if (kind === 'TF4') {
      const selected = tf4Answers[it.id] || {};
      const required = getSubItemCount(it);
      return required > 0 ? Object.keys(selected).length >= required : Object.keys(selected).length > 0;
    }
    return Boolean((answers[it.id] || '').trim());
  };

  const answeredCount = exam?.items.reduce((sum, it) => sum + (isItemAnswered(it) ? 1 : 0), 0) || 0;

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070F1D' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,.1)', borderTopColor: '#60C8FF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>Đang tải đề thi...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#070F1D', gap: 16 }}>
      <AlertCircle style={{ width: 48, height: 48, color: '#FF6B6B' }} />
      <div style={{ color: '#FF6B6B', fontSize: 15 }}>{error}</div>
      <Link href="/student" style={{ color: '#60C8FF', fontSize: 13 }}>← Quay lại trang chủ</Link>
    </div>
  );

  if (submitted && score) return (
    <div style={{ minHeight: '100vh', background: '#070F1D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0D1829', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: 40, maxWidth: 420, width: '100%', textAlign: 'center', animation: 'fadeUp .4s ease both' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: '#E2EAF4', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Nộp bài thành công!</h2>
        <p style={{ color: 'rgba(255,255,255,.5)', marginBottom: 28, fontSize: 14 }}>{exam?.title}</p>

        <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 16, padding: 24, marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 6 }}>Điểm của bạn</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: score.score >= score.max * 0.5 ? '#4ADEAA' : '#FF6B6B' }}>
            {score.score.toFixed(1)}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)' }}>/ {score.max} điểm</div>
          <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 3 }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${(score.score / score.max) * 100}%`, background: score.score >= score.max * 0.5 ? '#4ADEAA' : '#FF6B6B', transition: 'width 1s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>
            {Math.round((score.score / score.max) * 100)}%
          </div>
        </div>

        <Link href="/student" style={{ display: 'block', padding: '13px 0', borderRadius: 12, background: '#60C8FF', color: '#000', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          Quay lại trang chủ
        </Link>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );

  if (!exam || !currentItem) return null;

  const item = currentItem;
  const qText = item.textSnapshot || item.question.text || '';
  const payload = parseSnapshotPayload(item.optionsSnapshot || item.question?.options);
  const qOpts: string[] = payload?.options || [];
  const qSubItems = payload?.subItems || [];
  const qImages = payload?.images || [];
  const qInlineImages = payload?.inlineImages || [];
  const inferredKind: QuestionKind = qSubItems.length > 0
    ? 'TF4'
    : qOpts.length >= 4
      ? 'MCQ'
      : qOpts.length === 2
        ? 'TF'
        : 'ESSAY';
  const qKind: QuestionKind = normalizeKind(item.kindSnapshot || payload?.type || item.question?.kind || inferredKind);
  const km = KIND_META[qKind] || KIND_META.MCQ;
  const currentAnswer = qKind === 'ESSAY' || qKind === 'SAQ' ? essayAnswers[item.id] : answers[item.id];
  const correctAnswer = (item.answerSnapshot || '').trim().toUpperCase();
  const tf4CorrectMap = parseTF4AnswerMap(item.answerSnapshot);

  return (
    <div style={{ minHeight: '100vh', background: '#070F1D', color: '#E2EAF4', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}
        textarea:focus, textarea { outline: none; resize: vertical; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ background: '#060E1C', borderBottom: '1px solid rgba(255,255,255,.08)', position: 'sticky', top: 0, zIndex: 50, padding: '0 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#E2EAF4', truncate: true } as any}>{exam.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{exam.subject} · {exam.items.length} câu</div>
          </div>
          {isReviewMode ? (
            <div style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(74,222,170,.15)', border: '1px solid rgba(74,222,170,.35)', color: '#4ADEAA', fontSize: 12, fontWeight: 700 }}>
              Chế độ xem lại
            </div>
          ) : (
            <>
              <Timer totalSeconds={exam.duration * 60} onExpire={handleSubmit} />
              <button onClick={() => setConfirmSubmit(true)}
                style={{ padding: '8px 16px', borderRadius: 10, background: answeredCount < exam.items.length ? 'rgba(255,255,255,.08)' : '#4ADEAA', color: answeredCount < exam.items.length ? 'rgba(255,255,255,.5)' : '#000', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <Send style={{ width: 13, height: 13 }} /> Nộp bài
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Question navigator ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, padding: '14px 16px', background: '#0D1829', borderRadius: 14, border: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ width: '100%', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', marginBottom: 8, letterSpacing: '0.06em' }}>
            ĐÃ TRẢ LỜI: {answeredCount}/{exam.items.length}
          </div>
          {exam.items.map((it, i) => (
            <NavDot
              key={it.id}
              num={i + 1}
              answered={isItemAnswered(it)}
              active={i === currentIdx}
              onClick={() => setCurrentIdx(i)}
            />
          ))}
        </div>

        {/* ── Question card ── */}
        <div key={item.id} style={{ background: '#0D1829', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 28, marginBottom: 20, animation: 'fadeUp .2s ease both' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                {currentIdx + 1}
              </span>
              <div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                  {qKind === 'MCQ' ? 'Trắc nghiệm' : qKind === 'TF' ? 'Đúng / Sai' : qKind === 'TF4' ? 'TF4' : qKind === 'SAQ' ? 'Trả lời ngắn' : 'Tự luận'} · {item.pointsSnapshot}đ
                </span>
              </div>
            </div>
            <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: km.bg, color: km.color, flexShrink: 0 }}>
              {km.label}
            </span>
          </div>

          {/* Question text with LaTeX */}
          <div style={{ fontSize: 16, lineHeight: 1.7, color: '#E2EAF4', marginBottom: 22, fontWeight: 500 }}>
            <InlineContentRenderer content={qText} inlineImages={qInlineImages} />
          </div>

          {qImages.length > 0 && (
            <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
              {qImages.map((src, idx) => (
                <img
                  key={`${item.id}_img_${idx}`}
                  src={src}
                  alt={`question-${currentIdx + 1}-img-${idx + 1}`}
                  style={{
                    width: '100%',
                    maxHeight: 360,
                    objectFit: 'contain',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,.12)',
                    background: 'rgba(255,255,255,.02)',
                  }}
                />
              ))}
            </div>
          )}

          {/* MCQ options */}
          {qKind === 'MCQ' && qOpts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {qOpts.map((opt, oi) => {
                const letter = String.fromCharCode(65 + oi);
                const isSelected = currentAnswer === letter;
                const isCorrectInReview = isReviewMode && correctAnswer === letter;
                return (
                  <button key={oi} onClick={() => !isReviewMode && handleSelectAnswer(item.id, letter)}
                    style={{
                      padding: '13px 18px', borderRadius: 12, border: `2px solid ${isSelected ? '#60C8FF' : isCorrectInReview ? '#4ADEAA' : 'rgba(255,255,255,.1)'}`,
                      background: isSelected ? 'rgba(96,200,255,.1)' : isCorrectInReview ? 'rgba(74,222,170,.12)' : 'rgba(255,255,255,.04)',
                      color: isSelected ? '#60C8FF' : '#E2EAF4', textAlign: 'left', cursor: isReviewMode ? 'default' : 'pointer',
                      fontSize: 14, lineHeight: 1.5, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: isSelected ? '#60C8FF' : isCorrectInReview ? '#4ADEAA' : 'rgba(255,255,255,.1)', color: isSelected || isCorrectInReview ? '#000' : 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {letter}
                    </span>
                    <span style={{ textDecoration: isCorrectInReview ? 'underline' : 'none', textUnderlineOffset: isCorrectInReview ? 3 : undefined, textDecorationThickness: isCorrectInReview ? 2 : undefined }}>
                      <InlineContentRenderer content={opt.replace(/^[A-D]\.\s*/, '')} inlineImages={qInlineImages} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TF options */}
          {qKind === 'TF' && (
            <div style={{ display: 'flex', gap: 12 }}>
              {[['Đúng','✓'],['Sai','✗']].map(([val, sym]) => {
                const isSelected = currentAnswer === val;
                const isCorrectInReview = isReviewMode && correctAnswer === String(val).toUpperCase();
                return (
                  <button key={val} onClick={() => !isReviewMode && handleSelectAnswer(item.id, val)}
                    style={{ flex: 1, padding: '14px', borderRadius: 12, border: `2px solid ${isSelected ? (val==='Đúng' ? '#4ADEAA' : '#FF6B6B') : isCorrectInReview ? '#4ADEAA' : 'rgba(255,255,255,.1)'}`, background: isSelected ? (val==='Đúng' ? '#0A3D2E' : '#3D0C0C') : isCorrectInReview ? 'rgba(74,222,170,.12)' : 'rgba(255,255,255,.04)', color: isSelected ? (val==='Đúng' ? '#4ADEAA' : '#FF6B6B') : '#E2EAF4', cursor: isReviewMode ? 'default' : 'pointer', fontWeight: 700, fontSize: 16, transition: 'all .15s', textDecoration: isCorrectInReview ? 'underline' : 'none', textUnderlineOffset: isCorrectInReview ? 3 : undefined, textDecorationThickness: isCorrectInReview ? 2 : undefined }}>
                    {sym} {val}
                  </button>
                );
              })}
            </div>
          )}

          {qKind === 'TF4' && qSubItems.length > 0 && (
            <div style={{ display: 'grid', gap: 10 }}>
              {qSubItems.map((sub, idx) => {
                const label = String(sub.label || String.fromCharCode(97 + idx)).toLowerCase();
                const selected = tf4Answers[item.id]?.[label];
                const correctTF4Answer = (tf4CorrectMap[label] || '').toUpperCase();
                const isCorrectSubItem = isReviewMode && correctTF4Answer === 'ĐÚNG';
                return (
                  <div key={`${item.id}_${label}`} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 12, background: 'rgba(255,255,255,.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 14 }}>
                      <strong style={{ color: '#89F7FE', minWidth: 18 }}>{label})</strong>
                      <div style={{ lineHeight: 1.6, textDecoration: isCorrectSubItem ? 'underline' : 'none', textUnderlineOffset: isCorrectSubItem ? 3 : undefined, textDecorationThickness: isCorrectSubItem ? 2 : undefined }}><InlineContentRenderer content={sub.text || ''} inlineImages={qInlineImages} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['Đúng', 'Sai'] as const).map((val) => {
                        const active = selected === val;
                        const isCorrectInReview = isReviewMode && correctTF4Answer === val.toUpperCase();
                        return (
                          <button
                            key={val}
                            onClick={() => !isReviewMode && handleTF4Select(item.id, label, val)}
                            style={{
                              flex: 1,
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: `2px solid ${active ? (val === 'Đúng' ? '#4ADEAA' : '#FF6B6B') : isCorrectInReview ? '#4ADEAA' : 'rgba(255,255,255,.12)'}`,
                              background: active ? (val === 'Đúng' ? '#0A3D2E' : '#3D0C0C') : isCorrectInReview ? 'rgba(74,222,170,.12)' : 'rgba(255,255,255,.04)',
                              color: active ? (val === 'Đúng' ? '#4ADEAA' : '#FF6B6B') : '#E2EAF4',
                              cursor: isReviewMode ? 'default' : 'pointer',
                              fontWeight: 700,
                              fontSize: 14,
                              textDecoration: isCorrectInReview ? 'underline' : 'none',
                              textUnderlineOffset: isCorrectInReview ? 3 : undefined,
                              textDecorationThickness: isCorrectInReview ? 2 : undefined,
                            }}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Essay */}
          {(qKind === 'ESSAY' || qKind === 'SAQ') && (
            <>
              <textarea
                id={`student-exam-essay-${item.id}`}
                name={`examEssay-${item.id}`}
                value={essayAnswers[item.id] || ''}
                onChange={e => handleEssayChange(item.id, e.target.value)}
                placeholder={qKind === 'SAQ' ? 'Nhập đáp án ngắn...' : 'Viết câu trả lời của bạn tại đây...'}
                rows={qKind === 'SAQ' ? 3 : 6}
                style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)', color: '#E2EAF4', fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit' }}
                readOnly={isReviewMode}
              />
              {isReviewMode && qKind === 'SAQ' && item.answerSnapshot && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#4ADEAA' }}>
                  Đáp án mẫu: <span style={{ textDecoration: 'underline', textUnderlineOffset: 3, textDecorationThickness: 2 }}>{item.answerSnapshot}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Navigation ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
            style={{ padding: '11px 20px', borderRadius: 12, background: 'rgba(255,255,255,.08)', border: 'none', color: currentIdx === 0 ? 'rgba(255,255,255,.25)' : '#E2EAF4', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
            <ChevronLeft style={{ width: 15, height: 15 }} /> Câu trước
          </button>

          {currentIdx < exam.items.length - 1 ? (
            <button onClick={() => setCurrentIdx(i => i + 1)}
              style={{ padding: '11px 20px', borderRadius: 12, background: '#185FA5', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
              Câu tiếp <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          ) : isReviewMode ? (
            <Link href="/student" style={{ padding: '11px 20px', borderRadius: 12, background: '#4ADEAA', border: 'none', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              Kết thúc xem lại
            </Link>
          ) : (
            <button onClick={() => setConfirmSubmit(true)}
              style={{ padding: '11px 20px', borderRadius: 12, background: '#4ADEAA', border: 'none', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
              <Send style={{ width: 15, height: 15 }} /> Nộp bài
            </button>
          )}
        </div>

      </div>

      {/* ── Confirm submit modal ── */}
      {!isReviewMode && confirmSubmit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0D1829', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, padding: 28, maxWidth: 360, width: '100%', animation: 'fadeUp .2s ease both', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{answeredCount < exam.items.length ? '⚠️' : '✅'}</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Xác nhận nộp bài</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>
              Đã trả lời: <strong style={{ color: '#60C8FF' }}>{answeredCount}</strong> / {exam.items.length} câu
            </p>
            {answeredCount < exam.items.length && (
              <p style={{ fontSize: 12, color: '#FBB040', marginBottom: 14 }}>
                ⚠ Còn {exam.items.length - answeredCount} câu chưa trả lời
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setConfirmSubmit(false)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'rgba(255,255,255,.08)', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Xem lại
              </button>
              <button onClick={() => { setConfirmSubmit(false); handleSubmit(); }} disabled={submitting}
                style={{ flex: 2, padding: '11px 0', borderRadius: 10, background: '#4ADEAA', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {submitting ? 'Đang nộp...' : 'Nộp bài ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}