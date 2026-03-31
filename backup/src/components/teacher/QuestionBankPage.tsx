'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Library, Plus, Filter, Search, Upload, Trash2, ChevronDown,
  BookOpen, AlertTriangle, CheckCircle, RefreshCw, X, Eye, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ─── Types ─────────────────────────────────────────────── */
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type QuestionKind = 'MCQ' | 'TF' | 'ESSAY';

interface BankQuestion {
  id: string;
  num: number;
  text: string;
  kind: QuestionKind;
  difficulty: Difficulty;
  difficultyNum: number;
  chapter?: string;
  points: number;
  options?: string;
  answer: string;
  bankId: string;
}

interface ExamBank {
  id: string;
  title: string;
  subject: string;
  grade?: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  questions: BankQuestion[];
  _count?: { questions: number };
}

/* ─── Helpers ────────────────────────────────────────────── */
const DIFF_META = {
  EASY:   { label: 'Dễ',         bg: '#0A3D2E', color: '#4ADEAA', border: '#4ADEAA33', num: 1 },
  MEDIUM: { label: 'Trung bình', bg: '#3B2500', color: '#FBB040', border: '#FBB04033', num: 2 },
  HARD:   { label: 'Khó',        bg: '#3D0C0C', color: '#FF6B6B', border: '#FF6B6B33', num: 3 },
};

const KIND_META = {
  MCQ:   { label: 'Trắc nghiệm', color: '#60C8FF' },
  TF:    { label: 'Đúng/Sai',    color: '#B794F4' },
  ESSAY: { label: 'Tự luận',     color: '#FBB040' },
};

const S = {
  bg: '#070F1D', card: '#0D1829', border: 'rgba(255,255,255,.08)',
  text: '#E2EAF4', muted: 'rgba(255,255,255,.35)', blue: '#60C8FF',
};

function DiffBadge({ d }: { d: Difficulty }) {
  const m = DIFF_META[d];
  return (
    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color, border: `1px solid ${m.border}`, flexShrink: 0 }}>
      {m.label}
    </span>
  );
}
function KindBadge({ k }: { k: QuestionKind }) {
  const m = KIND_META[k];
  return (
    <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: m.color + '18', color: m.color, flexShrink: 0 }}>
      {m.label}
    </span>
  );
}

/* ─── Question row ───────────────────────────────────────── */
function QuestionRow({ q, selected, onToggle }: { q: BankQuestion; selected: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const opts: string[] = q.options ? JSON.parse(q.options) : [];

  return (
    <div style={{
      border: `1px solid ${selected ? '#60C8FF44' : S.border}`,
      background: selected ? 'rgba(96,200,255,.04)' : S.card,
      borderRadius: 12, marginBottom: 8, overflow: 'hidden', transition: 'all .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        {/* Checkbox */}
        <button onClick={onToggle} style={{
          width: 22, height: 22, borderRadius: 6, border: `2px solid ${selected ? '#60C8FF' : 'rgba(255,255,255,.2)'}`,
          background: selected ? '#60C8FF' : 'transparent', flexShrink: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <CheckCircle style={{ width: 13, height: 13, color: '#000' }} />}
        </button>

        {/* Q number */}
        <span style={{ fontSize: 11, fontWeight: 700, color: S.muted, minWidth: 28 }}>#{q.num}</span>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: S.text, lineHeight: 1.4, wordBreak: 'break-word' }}>
            {/* Render LaTeX hints: $...$ */}
            {q.text.substring(0, expanded ? undefined : 120)}{!expanded && q.text.length > 120 ? '…' : ''}
          </div>
          {expanded && opts.length > 0 && (
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {opts.map((o, i) => (
                <div key={i} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12,
                  background: o.startsWith(q.answer + '.') ? '#0A3D2E' : 'rgba(255,255,255,.04)',
                  color: o.startsWith(q.answer + '.') ? '#4ADEAA' : S.muted,
                  border: o.startsWith(q.answer + '.') ? '1px solid #4ADEAA33' : '1px solid transparent',
                }}>
                  {o}
                </div>
              ))}
            </div>
          )}
          {expanded && q.kind === 'ESSAY' && (
            <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', fontSize: 12, color: S.muted }}>
              💡 {q.answer}
            </div>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
          <DiffBadge d={q.difficulty} />
          <KindBadge k={q.kind} />
        </div>

        {/* Points + chapter */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 52 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: S.blue }}>{q.points}đ</div>
          {q.chapter && <div style={{ fontSize: 10, color: S.muted }}>Ch.{q.chapter}</div>}
        </div>

        {/* Expand */}
        <button onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 4, borderRadius: 6, display: 'flex' }}>
          <ChevronDown style={{ width: 14, height: 14, transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function QuestionBankPage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [banks, setBanks]     = useState<ExamBank[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeBank, setActiveBank]   = useState<string>('ALL');
  const [diffFilter, setDiffFilter]   = useState<Difficulty | 'ALL'>('ALL');
  const [kindFilter, setKindFilter]   = useState<QuestionKind | 'ALL'>('ALL');
  const [searchText, setSearchText]   = useState('');

  // Selection for exam creation
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [examTitle, setExamTitle]     = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [examDuration, setExamDuration] = useState(45);
  const [creating, setCreating]       = useState(false);

  /* ── Boot ── */
  useEffect(() => {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) { router.push('/auth/login'); return; }
    const u = JSON.parse(raw);
    if (u.role !== 'TEACHER' && u.role !== 'ADMIN') { router.push('/'); return; }
    setUser(u);
    fetchBanks(u.id);
  }, []);

  const fetchBanks = async (authorId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exam-banks?authorId=${authorId}`);
      if (res.ok) setBanks(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  /* ── All questions flat ── */
  const allQuestions: BankQuestion[] = banks.flatMap(b =>
    (b.questions || []).map(q => ({ ...q, bankId: b.id }))
  );

  const filtered = allQuestions.filter(q => {
    if (activeBank !== 'ALL' && q.bankId !== activeBank) return false;
    if (diffFilter !== 'ALL' && q.difficulty !== diffFilter) return false;
    if (kindFilter !== 'ALL' && q.kind !== kindFilter) return false;
    if (searchText && !q.text.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  /* ── Counts ── */
  const countByDiff = (d: Difficulty) => allQuestions.filter(q => q.difficulty === d).length;
  const selectedList = allQuestions.filter(q => selected.has(q.id));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Create exam from selected ── */
  const handleCreateExam = async () => {
    if (!examTitle || selectedList.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: examTitle,
          subject: examSubject,
          duration: examDuration,
          creatorId: user.id,
          questionIds: [...selected],
        }),
      });
      if (res.ok) {
        setShowCreateExam(false);
        setSelected(new Set());
        setExamTitle('');
        router.push('/teacher');
      }
    } catch { /* ignore */ }
    setCreating(false);
  };

  /* ── Stats ── */
  const easyCount   = countByDiff('EASY');
  const mediumCount = countByDiff('MEDIUM');
  const hardCount   = countByDiff('HARD');

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.bg }}>
      <div style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,.1)', borderTopColor: S.blue, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style dangerouslySetInnerHTML={{__html: '@keyframes spin{to{transform:rotate(360deg)}}'}} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.text, fontFamily: 'system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        * { box-sizing: border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder { color: rgba(255,255,255,.3); }
      `}} />

      {/* ── Navbar ── */}
      <nav style={{ background: '#060E1C', borderBottom: `1px solid ${S.border}`, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/teacher" style={{ fontSize: 14, fontWeight: 700, color: S.blue, textDecoration: 'none' }}>← Quay lại</Link>
            <span style={{ color: S.border }}>|</span>
            <Library style={{ width: 16, height: 16, color: S.blue }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Ngân hàng câu hỏi</span>
          </div>
          <Link href="/teacher/exam/upload"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: S.blue, color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            <Upload style={{ width: 14, height: 14 }} /> Import đề Word
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px', animation: 'fadeUp .3s ease both' }}>

        {/* ── Diff summary ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {([['EASY','DỄ','#4ADEAA','#0A3D2E'],['MEDIUM','TRUNG BÌNH','#FBB040','#3B2500'],['HARD','KHÓ','#FF6B6B','#3D0C0C']] as const).map(([diff, lbl, col, bg]) => (
            <button key={diff} onClick={() => setDiffFilter(diffFilter === diff ? 'ALL' : diff)}
              style={{
                background: diffFilter === diff ? bg : S.card,
                border: `2px solid ${diffFilter === diff ? col : S.border}`,
                borderRadius: 14, padding: '16px 20px', cursor: 'pointer',
                textAlign: 'left', transition: 'all .15s',
              }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 4, letterSpacing: '0.08em' }}>{lbl}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: S.text }}>
                {diff === 'EASY' ? easyCount : diff === 'MEDIUM' ? mediumCount : hardCount}
              </div>
              <div style={{ fontSize: 11, color: S.muted }}>câu hỏi</div>
            </button>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {/* Bank selector */}
          <select value={activeBank} onChange={e => setActiveBank(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, background: S.card, border: `1px solid ${S.border}`, color: S.text, fontSize: 13, cursor: 'pointer', minWidth: 180 }}>
            <option value="ALL">📚 Tất cả ngân hàng ({allQuestions.length})</option>
            {banks.map(b => (
              <option key={b.id} value={b.id}>{b.subject} — {b.title} ({b.questions?.length || 0})</option>
            ))}
          </select>

          {/* Kind filter */}
          {(['ALL','MCQ','TF','ESSAY'] as const).map(k => (
            <button key={k} onClick={() => setKindFilter(k)}
              style={{
                padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: kindFilter === k ? S.blue : 'rgba(255,255,255,.07)',
                color: kindFilter === k ? '#000' : S.muted, transition: 'all .15s',
              }}>
              {k === 'ALL' ? 'Tất cả loại' : KIND_META[k].label}
            </button>
          ))}

          {/* Search */}
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: S.muted }} />
            <input value={searchText} onChange={e => setSearchText(e.target.value)}
              placeholder="Tìm kiếm câu hỏi..."
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 10, background: S.card, border: `1px solid ${S.border}`, color: S.text, fontSize: 13, outline: 'none' }} />
          </div>
        </div>

        {/* ── Selection bar ── */}
        {selected.size > 0 && (
          <div style={{
            background: '#0C3B6E', border: `1px solid #60C8FF44`, borderRadius: 14,
            padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontWeight: 700, color: S.blue, fontSize: 14 }}>✓ {selected.size} câu đã chọn</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: S.muted }}>
                {selectedList.filter(q=>q.difficulty==='EASY').length} dễ ·{' '}
                {selectedList.filter(q=>q.difficulty==='MEDIUM').length} TB ·{' '}
                {selectedList.filter(q=>q.difficulty==='HARD').length} khó
              </span>
              <button onClick={() => setSelected(new Set())}
                style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: 'none', color: S.muted, fontSize: 12, cursor: 'pointer' }}>
                Bỏ chọn
              </button>
              <button onClick={() => setShowCreateExam(true)}
                style={{ padding: '5px 14px', borderRadius: 8, background: S.blue, border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap style={{ width: 13, height: 13 }} /> Tạo đề từ đây
              </button>
            </div>
          </div>
        )}

        {/* ── Questions list ── */}
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Library style={{ width: 48, height: 48, color: 'rgba(255,255,255,.12)', margin: '0 auto 12px' }} />
            <div style={{ color: S.muted, fontSize: 14 }}>
              {allQuestions.length === 0
                ? 'Chưa có câu hỏi. Hãy import file Word để bắt đầu.'
                : 'Không tìm thấy câu hỏi phù hợp với bộ lọc hiện tại.'}
            </div>
            {allQuestions.length === 0 && (
              <Link href="/teacher/exam/upload"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '9px 18px', borderRadius: 10, background: S.blue, color: '#000', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                <Upload style={{ width: 14, height: 14 }} /> Import đề Word ngay
              </Link>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: S.muted, marginBottom: 10 }}>
              Hiển thị {filtered.length} câu · Nhấn vào hộp chọn để thêm vào đề
            </div>
            {filtered.map(q => (
              <QuestionRow
                key={q.id}
                q={q}
                selected={selected.has(q.id)}
                onToggle={() => toggleSelect(q.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Create exam modal ── */}
      {showCreateExam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, animation: 'fadeUp .25s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Tạo đề kiểm tra</span>
              <button onClick={() => setShowCreateExam(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, display: 'flex' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {([['EASY','4ADEAA'],['MEDIUM','FBB040'],['HARD','FF6B6B']] as const).map(([d,c]) => (
                <div key={d} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#'+c+'18', border: `1px solid #${c}33`, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#'+c }}>{selectedList.filter(q=>q.difficulty===d).length}</div>
                  <div style={{ fontSize: 10, color: S.muted }}>{d==='EASY'?'Dễ':d==='MEDIUM'?'TB':'Khó'}</div>
                </div>
              ))}
            </div>

            {/* Form */}
            {[
              { label: 'Tiêu đề đề thi *', val: examTitle, set: setExamTitle, ph: 'Vd: Kiểm tra Toán Ch.1–3' },
              { label: 'Môn học', val: examSubject, set: setExamSubject, ph: 'Toán, Vật lý, Hóa học...' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: S.blue, marginBottom: 6, letterSpacing: '0.06em' }}>{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.06)', border: `1px solid ${S.border}`, color: S.text, fontSize: 13, outline: 'none' }} />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: S.blue, marginBottom: 6, letterSpacing: '0.06em' }}>Thời gian làm bài (phút)</label>
              <input type="number" min={10} max={180} value={examDuration} onChange={e => setExamDuration(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.06)', border: `1px solid ${S.border}`, color: S.text, fontSize: 13, outline: 'none' }} />
            </div>

            <button onClick={handleCreateExam} disabled={!examTitle || creating}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', cursor: examTitle ? 'pointer' : 'not-allowed',
                background: examTitle ? S.blue : 'rgba(255,255,255,.06)', color: examTitle ? '#000' : S.muted,
                fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {creating ? 'Đang tạo...' : `Tạo đề (${selected.size} câu)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}