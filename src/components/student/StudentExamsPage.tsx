'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ExamKind = 'ORAL' | 'QUIZ15' | 'PERIOD';
type ExamStatus = 'open' | 'done' | 'upcoming';

interface ExamItem {
  id: string;
  title: string;
  subject: string;
  duration: number;
  deadline: string;
  closeAt: string | null;
  status: ExamStatus;
  examKind: ExamKind;
  reviewUnlocksAt: string | null;
  score?: number;
  maxScore?: number;
  teacherName: string;
}

const KIND_LABEL: Record<ExamKind, string> = { ORAL: 'Miệng', QUIZ15: '15 phút', PERIOD: '1 tiết' };
const KIND_COEF: Record<ExamKind, number> = { ORAL: 1, QUIZ15: 1, PERIOD: 2 };
const KIND_COLOR: Record<ExamKind, string> = {
  ORAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  QUIZ15: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  PERIOD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};
const STATUS_COLOR: Record<ExamStatus, string> = {
  open: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  done: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  upcoming: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
};
const STATUS_LABEL: Record<ExamStatus, string> = { open: 'Đang mở', done: 'Đã nộp', upcoming: 'Sắp tới' };

function scoreColor(score10: number) {
  if (score10 >= 8) return 'text-green-600 dark:text-green-400';
  if (score10 >= 6.5) return 'text-sky-600 dark:text-sky-400';
  if (score10 >= 5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export default function StudentExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) { router.push('/login'); return; }
    const user = JSON.parse(raw);
    if (user.role !== 'STUDENT') { router.push('/'); return; }

    fetch(`/api/student/exams?studentId=${user.id}`)
      .then(r => r.ok ? r.json() : Promise.reject('err'))
      .then((data: ExamItem[]) => setExams(data))
      .catch(() => setError('Không tải được dữ liệu. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [router]);

  // --- Weighted average calculation ---
  const doneExams = exams.filter(e => e.status === 'done' && e.score !== undefined && e.maxScore);
  const scoreMap = doneExams.map(e => {
    const coef = KIND_COEF[e.examKind] ?? 1;
    const score10 = ((e.score ?? 0) / (e.maxScore ?? 1)) * 10;
    return { ...e, score10: Math.round(score10 * 100) / 100, coef };
  });
  const totalCoef = scoreMap.reduce((s, e) => s + e.coef, 0);
  const weightedSum = scoreMap.reduce((s, e) => s + e.score10 * e.coef, 0);
  const weightedAvg = totalCoef > 0 ? Math.round((weightedSum / totalCoef) * 100) / 100 : null;

  const now = new Date();

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">Đang tải bảng điểm...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-red-500 text-sm">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-6 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4 flex items-center gap-1"
      >
        ← Quay lại
      </button>

      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Kiểm tra &amp; Điểm số</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Tổng hợp bảng điểm có trọng số theo loại bài kiểm tra</p>

      {/* Weighted average card */}
      {weightedAvg !== null && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-6 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Điểm trung bình có hệ số</div>
          <div className={`text-5xl font-black mb-2 ${scoreColor(weightedAvg)}`}>{weightedAvg.toFixed(2)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Công thức: (Σ điểm × hệ số) / (Σ hệ số) · {doneExams.length} bài đã nộp
          </div>
          {/* bar breakdown */}
          <div className="mt-3 space-y-1.5">
            {scoreMap.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${KIND_COLOR[e.examKind]}`}>{KIND_LABEL[e.examKind]}</span>
                <span className="text-slate-600 dark:text-slate-300 truncate flex-1 min-w-0">{e.title}</span>
                <span className={`font-bold shrink-0 ${scoreColor(e.score10)}`}>{e.score10.toFixed(1)}</span>
                <span className="text-slate-400 shrink-0">×{e.coef}</span>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3 flex-wrap text-[10px] text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold">1 tiết = hệ số 2</span>
            <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-semibold">15 phút = hệ số 1</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-semibold">Miệng = hệ số 1</span>
          </div>
        </div>
      )}

      {exams.length === 0 && (
        <div className="text-center text-slate-400 dark:text-slate-500 py-16 text-sm">
          Chưa có bài kiểm tra nào
        </div>
      )}

      {/* Exam list */}
      <div className="space-y-3">
        {exams.map(exam => {
          const reviewUnlocked = exam.reviewUnlocksAt ? new Date(exam.reviewUnlocksAt) <= now : false;
          const score10 = exam.score !== undefined && exam.maxScore
            ? Math.round(((exam.score / exam.maxScore) * 10) * 100) / 100
            : null;

          return (
            <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{exam.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{exam.teacherName && `GV: ${exam.teacherName} · `}{exam.duration} phút</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${KIND_COLOR[exam.examKind]}`}>{KIND_LABEL[exam.examKind]}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[exam.status]}`}>{STATUS_LABEL[exam.status]}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400">{exam.deadline}</div>
                <div className="flex items-center gap-2">
                  {score10 !== null && (
                    <span className={`text-lg font-black ${scoreColor(score10)}`}>{score10.toFixed(1)}<span className="text-xs font-normal text-slate-400">/10</span></span>
                  )}
                  {exam.status === 'open' && (
                    <button
                      onClick={() => router.push(`/student/exam/${exam.id}`)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      Làm bài
                    </button>
                  )}
                  {exam.status === 'done' && (
                    <button
                      disabled={!reviewUnlocked}
                      onClick={() => reviewUnlocked && router.push(`/student/exam/${exam.id}/review`)}
                      title={!reviewUnlocked && exam.reviewUnlocksAt
                        ? `Mở xem lại sau: ${new Date(exam.reviewUnlocksAt).toLocaleDateString('vi-VN')}`
                        : 'Xem lại bài'}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        reviewUnlocked
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {reviewUnlocked ? 'Xem lại' : '🔒 Xem lại'}
                    </button>
                  )}
                </div>
              </div>

              {exam.status === 'done' && exam.reviewUnlocksAt && !reviewUnlocked && (
                <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                  Xem lại bài mở lúc: {new Date(exam.reviewUnlocksAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
