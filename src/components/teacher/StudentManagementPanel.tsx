'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import { Check, X, Users, Clock, UserCheck, AlertCircle, Flame, ChevronDown } from 'lucide-react';

/* ────── Types ────── */
interface StudentRequest {
  linkId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  className: string;
  schoolName: string;
  status: string;
  requestedAt: string;
  expiresAt: string | null;
  lastSeenDaysAgo?: number;
}

interface Props {
  teacherId: string;
  activeClassId?: string | null;
}

export default function StudentManagementPanel({ teacherId, activeClassId }: Props) {
  const [pending, setPending] = useState<StudentRequest[]>([]);
  const [accepted, setAccepted] = useState<StudentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'students' | 'grades'>('students');

  const loadData = async () => {
    try {
      const res = await fetch(`/api/teacher/student-requests?teacherId=${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        setPending(data.pending || []);
        setAccepted(data.accepted || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (teacherId) loadData();
  }, [teacherId]);

  const handleAction = async (linkId: string, action: 'accept' | 'reject') => {
    setProcessing(linkId);
    try {
      const res = await fetch('/api/teacher/student-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, action }),
      });
      if (res.ok) {
        await loadData(); // Reload
      }
    } catch { /* ignore */ }
    setProcessing(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #C3D5FF', borderTop: '3px solid #185FA5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeUp .28s ease' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Yêu cầu pending */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Clock style={{ width: 16, height: 16, color: '#f59e0b' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#E2EAF4' }}>Yêu cầu chờ duyệt</span>
          {pending.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: 10 }}>
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', background: 'rgba(255,255,255,.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,.08)' }}>
            <AlertCircle style={{ width: 24, height: 24, color: 'rgba(255,255,255,.3)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Không có yêu cầu nào</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(req => (
              <div key={req.linkId} style={{
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#E2EAF4' }}>
                      {req.studentName}
                      {(pending.filter(x => x.studentId === req.studentId).length > 1 || accepted.filter(x => x.studentId === req.studentId).length >= 1) && <span title="Đăng ký nhiều lớp" style={{ marginLeft: 6, fontSize: 13 }}>⭐</span>}
                    </span>
                    {req.className && (
                      <span style={{ fontSize: 11, background: 'rgba(96,200,255,.15)', color: '#60C8FF', padding: '2px 8px', borderRadius: 6 }}>
                        Lớp {req.className}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                    {req.studentEmail}
                    {req.schoolName && ` · ${req.schoolName}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleAction(req.linkId, 'accept')}
                    disabled={processing === req.linkId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', borderRadius: 8,
                      background: '#16a34a', color: 'white', border: 'none',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: processing === req.linkId ? 0.6 : 1,
                    }}>
                    <Check style={{ width: 14, height: 14 }} /> Chấp nhận
                  </button>
                  <button
                    onClick={() => handleAction(req.linkId, 'reject')}
                    disabled={processing === req.linkId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.15)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: processing === req.linkId ? 0.6 : 1,
                    }}>
                    <X style={{ width: 14, height: 14 }} /> Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Học sinh đã chấp nhận */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <UserCheck style={{ width: 16, height: 16, color: '#22c55e' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#E2EAF4' }}>Học sinh đã kết nối</span>
          {accepted.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: 10 }}>
              {accepted.length}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {(['students','grades'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: viewMode === m ? '#185FA5' : 'rgba(255,255,255,.08)',
                color: viewMode === m ? 'white' : 'rgba(255,255,255,.5)',
              }}>
                {m === 'students' ? 'Danh sách' : 'Bảng điểm'}
              </button>
            ))}
          </div>
        </div>

        {accepted.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', background: 'rgba(255,255,255,.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,.08)' }}>
            <Users style={{ width: 24, height: 24, color: 'rgba(255,255,255,.3)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Chưa có học sinh nào</p>
          </div>
        ) : viewMode === 'students' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {accepted.map(req => {
              const inactive = req.lastSeenDaysAgo !== undefined && req.lastSeenDaysAgo >= 3;
              return (
                <div key={req.linkId} style={{
                  background: 'rgba(255,255,255,.05)',
                  border: `1px solid ${inactive ? 'rgba(251,191,36,.25)' : 'rgba(255,255,255,.08)'}`,
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{req.studentName.charAt(0)}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#E2EAF4' }}>
                      {req.studentName}
                      {(accepted.filter(x => x.studentId === req.studentId).length > 1) && <span title="Đăng ký nhiều lớp" style={{ marginLeft: 6, fontSize: 12 }}>⭐</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                      {req.className ? `Lớp ${req.className}` : req.studentEmail}
                    </div>
                  </div>
                  {/* Activity badge */}
                  {req.lastSeenDaysAgo === 0 && (
                    <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:6, background:'rgba(34,197,94,.15)', color:'#4ade80', fontWeight:600 }}>
                      <Flame style={{ width:10, height:10 }} /> Hôm nay
                    </span>
                  )}
                  {req.lastSeenDaysAgo === 1 && (
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:'rgba(96,200,255,.12)', color:'#60C8FF', fontWeight:600 }}>Hôm qua</span>
                  )}
                  {req.lastSeenDaysAgo !== undefined && req.lastSeenDaysAgo >= 2 && (
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background: req.lastSeenDaysAgo >= 7 ? 'rgba(239,68,68,.15)' : 'rgba(251,191,36,.12)', color: req.lastSeenDaysAgo >= 7 ? '#f87171' : '#fbbf24', fontWeight:600 }}>
                      {req.lastSeenDaysAgo >= 7 ? `${req.lastSeenDaysAgo} ngày vắng` : `${req.lastSeenDaysAgo} ngày trước`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Bảng điểm cột ── */
          <GradesTable teacherId={teacherId} students={accepted} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GradesTable — bảng điểm theo cột loại kiểm tra
   ═══════════════════════════════════════════════════════════════ */
type Kind = 'ORAL' | 'QUIZ15' | 'PERIOD';
const KIND_LABEL: Record<Kind, string> = { ORAL: 'Miệng', QUIZ15: '15 phút', PERIOD: '1 tiết' };
const KIND_COEF: Record<Kind, number>  = { ORAL: 1, QUIZ15: 1, PERIOD: 2 };

interface GradeRow {
  studentId: string;
  studentName: string;
  scores: { examId: string; title: string; kind: Kind; score10: number }[];
}

function scoreColor(v: number | null): string {
  if (v === null) return 'rgba(255,255,255,.2)';
  if (v >= 8) return '#4ade80';
  if (v >= 6.5) return '#60C8FF';
  if (v >= 5) return '#fbbf24';
  return '#f87171';
}

function GradesTable({ teacherId, students }: { teacherId: string; students: StudentRequest[] }) {
  const [rows, setRows]     = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandId, setExpandId] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId || students.length === 0) { setLoading(false); return; }
    fetch(`/api/teacher/student-grades?teacherId=${teacherId}`)
      .then(r => r.ok ? r.json() : Promise.reject('err'))
      .then((data: GradeRow[]) => setRows(data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [teacherId, students.length]);

  if (loading) return (
    <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Đang tải điểm…</div>
  );

  if (rows.length === 0) return (
    <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
      Chưa có điểm nào được ghi nhận
    </div>
  );

  // Build column headers: unique exam titles per kind
  const oral   = [...new Set(rows.flatMap(r => r.scores.filter(s => s.kind === 'ORAL').map(s => s.examId)))];
  const quiz15 = [...new Set(rows.flatMap(r => r.scores.filter(s => s.kind === 'QUIZ15').map(s => s.examId)))];
  const period = [...new Set(rows.flatMap(r => r.scores.filter(s => s.kind === 'PERIOD').map(s => s.examId)))];
  const examMap = new Map(rows.flatMap(r => r.scores.map(s => [s.examId, s.title])));

  const labelOf = (id: string) => {
    const t = examMap.get(id) || id;
    return t.length > 12 ? t.slice(0, 12) + '…' : t;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#E2EAF4' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,.12)' }}>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: 'rgba(255,255,255,.5)', fontWeight: 600, whiteSpace: 'nowrap' }}>Học sinh</th>
            {oral.map(id => (
              <th key={id} style={{ padding: '4px 6px', textAlign: 'center', color: '#c084fc', fontWeight: 600 }}>
                <div style={{ fontSize: 9, color: '#a78bfa', marginBottom: 2 }}>MIỆNG</div>
                <div>{labelOf(id)}</div>
              </th>
            ))}
            {quiz15.map(id => (
              <th key={id} style={{ padding: '4px 6px', textAlign: 'center', color: '#38bdf8', fontWeight: 600 }}>
                <div style={{ fontSize: 9, color: '#7dd3fc', marginBottom: 2 }}>15 PHÚT</div>
                <div>{labelOf(id)}</div>
              </th>
            ))}
            {period.map(id => (
              <th key={id} style={{ padding: '4px 6px', textAlign: 'center', color: '#fbbf24', fontWeight: 600 }}>
                <div style={{ fontSize: 9, color: '#fde68a', marginBottom: 2 }}>1 TIẾT</div>
                <div>{labelOf(id)}</div>
              </th>
            ))}
            <th style={{ padding: '4px 8px', textAlign: 'center', color: '#4ade80', fontWeight: 700, whiteSpace: 'nowrap', borderLeft: '1px solid rgba(255,255,255,.1)' }}>ĐTB</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const scoreOf = (id: string) => row.scores.find(s => s.examId === id)?.score10 ?? null;
            const allKinds = [...oral.map(id => ({ id, kind: 'ORAL' as Kind })), ...quiz15.map(id => ({ id, kind: 'QUIZ15' as Kind })), ...period.map(id => ({ id, kind: 'PERIOD' as Kind }))];
            const done = allKinds.filter(({ id }) => scoreOf(id) !== null);
            const weighted = done.reduce((s, { id, kind }) => s + (scoreOf(id)! * KIND_COEF[kind]), 0);
            const coefSum  = done.reduce((s, { kind }) => s + KIND_COEF[kind], 0);
            const avg = coefSum > 0 ? Math.round(weighted / coefSum * 100) / 100 : null;

            return (
              <tr key={row.studentId} style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <td style={{ padding: '7px 10px', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.studentName}</td>
                {[...oral, ...quiz15, ...period].map(id => {
                  const v = scoreOf(id);
                  return (
                    <td key={id} style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: scoreColor(v) }}>
                      {v !== null ? v.toFixed(1) : '—'}
                    </td>
                  );
                })}
                <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800, fontSize: 13, color: scoreColor(avg), borderLeft: '1px solid rgba(255,255,255,.1)' }}>
                  {avg !== null ? avg.toFixed(2) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}