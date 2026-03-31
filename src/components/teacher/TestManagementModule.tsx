'use client';

/**
 * TestManagementModule — Quản lý bài test
 * NÂNG CẤP: Fetch dữ liệu thật từ /api/teacher/submissions/exams
 * Fallback sang mock data nếu API không có.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Users, TrendingUp, TrendingDown, Clock,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle2,
  BookOpen, Layers, Eye, RefreshCw, Trash2,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */
export interface ClassInfo { id: string; name: string; year: number }

interface Submission {
  studentId: string; studentName: string;
  score: number;
  submittedAt: string;
  duration: number;
  isPassed?: boolean | null;
}

interface ExamStat {
  id: string;
  title: string;
  subject: string;
  className: string;
  totalQ: number;
  maxScore: number;
  duration: number;
  deadlineAt: string;
  publishedAt: string;
  variantCount: number;
  status?: string;
  submissions: Submission[];
  classSize: number;
}

/* ─── Helpers ────────────────────────────────────────────── */
const C = { bg:'#070F1D', card:'#0D1829', border:'rgba(255,255,255,.08)', text:'#E2EAF4', muted:'rgba(255,255,255,.35)', blue:'#60C8FF', green:'#4ADEAA', amber:'#FBB040', red:'#FF6B6B' };

function pct(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ padding: '6px 10px', borderRadius: 8, background: color + '18', border: `1px solid ${color}33`, flex: 1, minWidth: 60 }}>
      <div style={{ fontSize: 9, color: C.muted, marginBottom: 2, fontWeight: 600, letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

/* ─── Exam card ──────────────────────────────────────────── */
function ExamCard({ exam, onDelete, deleting }: { exam: ExamStat; onDelete: (exam: ExamStat) => void; deleting: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const submitted  = exam.submissions.length;
  const pending    = Math.max(0, exam.classSize - submitted);
  const avgScore   = submitted > 0
    ? (exam.submissions.reduce((s, sub) => s + sub.score, 0) / submitted).toFixed(1)
    : '—';
  const passCount  = exam.submissions.filter(s => s.score >= 5).length;
  const completion = pct(submitted, exam.classSize);

  const isOpen = exam.status === 'OPEN';
  const deadlinePast = exam.deadlineAt && new Date(exam.deadlineAt) < new Date();

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 12, overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{exam.title}</span>
            <span style={{
              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
              background: isOpen && !deadlinePast ? '#0A3D2E' : '#1A1A2E',
              color: isOpen && !deadlinePast ? C.green : C.muted,
            }}>
              {isOpen && !deadlinePast ? '● Đang mở' : '■ Đã đóng'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              `${exam.subject}`,
              `${exam.totalQ} câu`,
              `${exam.duration} phút`,
              `${exam.variantCount} mã đề`,
            ].map((t, i) => (
              <span key={i} style={{ fontSize: 11, color: C.muted }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Progress ring */}
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 52, height: 52, margin: '0 auto 4px' }}>
            <svg viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)', width: 52, height: 52 }}>
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="4" />
              <circle cx="26" cy="26" r="22" fill="none"
                stroke={completion >= 80 ? C.green : completion >= 40 ? C.amber : C.red}
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - completion / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.text }}>{completion}%</span>
          </div>
          <div style={{ fontSize: 10, color: C.muted }}>{submitted}/{exam.classSize}</div>
        </div>

        <ChevronDown style={{ width: 16, height: 16, color: C.muted, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', marginTop: 4 }} />
      </button>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', flexWrap: 'wrap' }}>
        <StatPill label="ĐIỂM TB" value={avgScore} color={C.blue} />
        <StatPill label="ĐẠT (≥5)" value={`${passCount}/${submitted}`} color={C.green} />
        <StatPill label="CHƯA NỘP" value={pending} color={pending > 0 ? C.amber : C.muted} />
        <StatPill label="HẠN NỘP" value={exam.deadlineAt ? new Date(exam.deadlineAt).toLocaleDateString('vi-VN') : '—'} color={deadlinePast ? C.red : C.text} />
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${completion}%`, background: completion >= 80 ? C.green : completion >= 40 ? C.amber : C.red, borderRadius: 2, transition: 'width .8s ease' }} />
        </div>
      </div>

      {/* Expanded: student list */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button
              onClick={() => onDelete(exam)}
              disabled={deleting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 8,
                background: 'rgba(255,107,107,.12)',
                border: '1px solid rgba(255,107,107,.3)',
                color: '#FF6B6B',
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontSize: 11,
                fontWeight: 700,
                opacity: deleting ? 0.65 : 1,
              }}
              title="Xóa bài kiểm tra"
            >
              <Trash2 style={{ width: 12, height: 12 }} />
              {deleting ? 'Đang xóa...' : 'Xóa đề này'}
            </button>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, letterSpacing: '0.06em' }}>
            DANH SÁCH NỘP BÀI ({submitted})
          </div>

          {/* Score distribution mini chart */}
          {submitted > 0 && (
            <div style={{ display: 'flex', gap: 2, height: 28, alignItems: 'flex-end', marginBottom: 12 }}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(bucket => {
                const count = exam.submissions.filter(s => Math.floor(s.score) === bucket).length;
                const height = submitted > 0 ? Math.max(4, (count / submitted) * 100) : 4;
                return (
                  <div key={bucket} title={`Điểm ${bucket}: ${count} HS`}
                    style={{ flex: 1, height: `${height}%`, borderRadius: 2, background: bucket >= 8 ? C.green : bucket >= 5 ? C.amber : C.red, opacity: count > 0 ? 1 : 0.15 }} />
                );
              })}
            </div>
          )}

          {/* Table */}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Học sinh', 'Điểm', 'Thời gian', 'Nộp lúc'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: C.muted, fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exam.submissions.sort((a, b) => b.score - a.score).map((sub, i) => (
                  <tr key={sub.studentId + i}
                    style={{ borderBottom: `1px solid rgba(255,255,255,.04)` }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '7px 8px', color: C.text, fontWeight: 500 }}>{sub.studentName}</td>
                    <td style={{ padding: '7px 8px' }}>
                      <span style={{ fontWeight: 700, color: sub.score >= 8 ? C.green : sub.score >= 5 ? C.amber : C.red }}>
                        {sub.score.toFixed(1)}
                      </span>
                    </td>
                    <td style={{ padding: '7px 8px', color: C.muted }}>{sub.duration > 0 ? `${sub.duration} phút` : '—'}</td>
                    <td style={{ padding: '7px 8px', color: C.muted }}>
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Students who haven't submitted */}
            {pending > 0 && (
              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(251,176,64,.08)', border: '1px solid rgba(251,176,64,.2)', fontSize: 11, color: C.amber }}>
                ⚠ {pending} học sinh chưa nộp bài
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN MODULE
   ═══════════════════════════════════════════════════════════ */
interface Props { activeClass: ClassInfo | null; teacherId: string }

export default function TestManagementModule({ activeClass, teacherId }: Props) {
  const [exams, setExams]       = useState<ExamStat[]>([]);
  const [loading, setLoading]   = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  /* ── Fetch real data ── */
  const loadExams = async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const className = activeClass?.name || '';
      const res = await fetch(`/api/teacher/submissions/exams?teacherId=${teacherId}&className=${encodeURIComponent(className)}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      } else {
        setExams([]);
      }
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExams(); }, [activeClass, teacherId]);

  const handleDeleteExam = async (exam: ExamStat) => {
    const ok = window.confirm(`Xóa bài kiểm tra "${exam.title}"? Hành động này không thể hoàn tác.`);
    if (!ok) return;

    setDeletingExamId(exam.id);
    try {
      const res = await fetch(`/api/exams/${exam.id}?teacherId=${encodeURIComponent(teacherId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Xóa bài kiểm tra thất bại');
      }

      setExams((prev) => prev.filter((e) => e.id !== exam.id));
    } catch (e: any) {
      alert(e?.message || 'Không thể xóa bài kiểm tra');
    } finally {
      setDeletingExamId(null);
    }
  };

  /* ── Filtered exams ── */
  const filtered = useMemo(() => {
    if (filterStatus === 'ALL') return exams;
    return exams.filter(e => {
      if (filterStatus === 'OPEN') return e.status === 'OPEN' && (!e.deadlineAt || new Date(e.deadlineAt) > new Date());
      if (filterStatus === 'CLOSED') return e.status === 'CLOSED' || (e.deadlineAt && new Date(e.deadlineAt) < new Date());
      return true;
    });
  }, [exams, filterStatus]);

  /* ── Aggregate stats ── */
  const totalSubmissions = exams.reduce((s, e) => s + e.submissions.length, 0);
  const avgScore = totalSubmissions > 0
    ? (exams.flatMap(e => e.submissions).reduce((s, sub) => s + sub.score, 0) / totalSubmissions).toFixed(1)
    : '—';
  const openCount = exams.filter(e => e.status === 'OPEN').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <BarChart3 style={{ width: 18, height: 18, color: C.blue }} />
            <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Quản lý bài test</span>
            {activeClass && (
              <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: 'rgba(96,200,255,.15)', color: C.blue, fontWeight: 600 }}>
                {activeClass.name}
              </span>
            )}
          </div>
        </div>
        <button onClick={loadExams} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'rgba(255,255,255,.07)', border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, cursor: 'pointer' }}>
          <RefreshCw style={{ width: 13, height: 13, animation: loading ? 'spin .8s linear infinite' : 'none' }} />
          Làm mới
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px' }}>
          <div style={{ fontSize: 9, color: C.muted, marginBottom: 2, fontWeight: 600 }}>TỔNG ĐỀ THI</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{exams.length}</div>
          <div style={{ fontSize: 10, color: C.blue }}>{openCount} đang mở</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px' }}>
          <div style={{ fontSize: 9, color: C.muted, marginBottom: 2, fontWeight: 600 }}>BÀI ĐÃ NỘP</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{totalSubmissions}</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px' }}>
          <div style={{ fontSize: 9, color: C.muted, marginBottom: 2, fontWeight: 600 }}>ĐIỂM TB LỚP</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: Number(avgScore) >= 7 ? C.green : Number(avgScore) >= 5 ? C.amber : C.red }}>
            {avgScore}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['ALL','OPEN','CLOSED'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s', background: filterStatus === s ? C.blue : 'rgba(255,255,255,.07)', color: filterStatus === s ? '#000' : C.muted }}>
            {s === 'ALL' ? 'Tất cả' : s === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
          </button>
        ))}
      </div>

      {/* Exam cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,.1)', borderTopColor: C.blue, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
          Đang tải dữ liệu...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
          <BarChart3 style={{ width: 40, height: 40, color: 'rgba(255,255,255,.1)', margin: '0 auto 12px' }} />
          <div>Chưa có đề thi nào{activeClass ? ` cho lớp ${activeClass.name}` : ''}.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Bấm "Tạo bài kiểm tra" để tạo đề đầu tiên.</div>
        </div>
      ) : (
        filtered.map(exam => (
          <ExamCard
            key={exam.id}
            exam={exam}
            onDelete={handleDeleteExam}
            deleting={deletingExamId === exam.id}
          />
        ))
      )}
    </div>
  );
}