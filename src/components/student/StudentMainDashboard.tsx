'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LogOut, BookOpen, ClipboardCheck, Library, AlertCircle, Plus, X, Check, Clock, Search, Bell, Calendar, TrendingUp, GraduationCap, FileText, Video, ChevronRight, Brain, Layers, ChevronDown, Play, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import StudentAdditionalFeatures from './StudentAdditionalFeatures';
import MiniLecturePlayer from './MiniLecturePlayer';

interface ExamCard {
  id: string;
  title: string;
  subject: string;
  teacherId?: string;
  duration: number;
  deadline: string;
  status: 'open' | 'done' | 'upcoming';
  score?: number;
  teacherName?: string;
  closeAt?: string;
}

interface LinkedTeacher {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherCode?: string | null;
  subjects: string[];
  status?: 'pending' | 'accepted';
  joinedAt: string;
  classId?: string | null;
  className?: string | null;
  classNames?: string[];
  classDisplay?: string | null;
  classGrade?: number | null;
}

interface LecturePage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  classId?: string | null;
  author: { name: string; id: string };
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
  children?: LecturePage[];
}

type LectureTerm = 'MID_1' | 'FINAL_1' | 'MID_2' | 'FINAL_2';
const LECTURE_TERM_OPTIONS: { key: LectureTerm; label: string }[] = [
  { key: 'MID_1', label: 'Giữa kỳ I' },
  { key: 'FINAL_1', label: 'Cuối kỳ I' },
  { key: 'MID_2', label: 'Giữa kỳ II' },
  { key: 'FINAL_2', label: 'Cuối kỳ II' },
];
const getLectureTerm = (course: Pick<LecturePage, 'description'>): LectureTerm => {
  const m = course.description?.match(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]/);
  return (m?.[1] as LectureTerm) || 'MID_1';
};
const stripTermMark = (description?: string) => description?.replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/,'').trim() || '';

interface ClassCard {
  id: string;
  name: string;
  teacherName: string;
  subject: string;
  studentCount: number;
  color: string;
}

const STATUS_STYLE = {
  open:     { bg: '#EAF3DE', color: '#27500A', label: 'Đang mở' },
  done:     { bg: '#E6F1FB', color: '#0C447C', label: 'Đã nộp' },
  upcoming: { bg: '#FAEEDA', color: '#633806', label: 'Sắp mở' },
};

const CARD_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-emerald-500',
  'from-orange-500 to-red-500',
  'from-indigo-500 to-blue-500',
  'from-teal-500 to-green-500',
];

/* ─── Modal thêm giáo viên ───────────────────────────────── */
function AddTeacherModal({ studentId, onClose, onSuccess }: {
  studentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode]           = useState('');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [teacherInfo, setTeacherInfo] = useState<{ name: string; subjects?: string; className?: string } | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [done, setDone]               = useState(false);

  useEffect(() => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) { setCheckStatus('idle'); setTeacherInfo(null); return; }
    setCheckStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/classes/check?code=${encodeURIComponent(trimmed)}`);
        const d = await r.json();
        if (d.valid) {
          setCheckStatus('valid');
          setTeacherInfo({ name: d.teacherName, subjects: d.subject, className: d.className });
        } else {
          setCheckStatus('invalid');
          setTeacherInfo(null);
        }
      } catch { setCheckStatus('idle'); }
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  const handleSubmit = async () => {
    if (checkStatus !== 'valid') return;
    setSubmitting(true); setError('');
    try {
      const payload = { studentId, classCode: code.trim().toUpperCase() };
      
      const res = await fetch('/api/student/link-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gửi yêu cầu thất bại');
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,.15)',
        animation: 'slideUp .2s ease both',
      }}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Thêm giáo viên</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Nhập mã lớp do giáo viên cung cấp</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#6b7280' }}>
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#166534' }}>Yêu cầu đã gửi!</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
              Chờ giáo viên chấp nhận trong vòng 24 giờ
            </div>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                id="add-teacher-code"
                name="teacherCode"
                style={{
                  width: '100%', padding: '10px 44px 10px 38px',
                  border: `1.5px solid ${checkStatus === 'valid' ? '#22c55e' : checkStatus === 'invalid' ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: 10, fontSize: 16, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  outline: 'none', fontFamily: 'monospace', color: '#111827',
                  boxSizing: 'border-box',
                }}
                placeholder="LOP-10A1-AB12C"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                autoFocus
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>
                {checkStatus === 'checking' && '⏳'}
                {checkStatus === 'valid' && '✅'}
                {checkStatus === 'invalid' && code.trim().length > 3 && '❌'}
              </span>
            </div>

            {checkStatus === 'valid' && teacherInfo && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>👨‍🏫</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>{teacherInfo.name}</div>
                  {teacherInfo.className && (
                    <div style={{ fontSize: 12, color: '#15803d' }}>Lớp: {teacherInfo.className}</div>
                  )}
                  {teacherInfo.subjects && (
                    <div style={{ fontSize: 12, color: '#15803d' }}>Môn: {teacherInfo.subjects}</div>
                  )}
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#22c55e', fontWeight: 600 }}>✓ Hợp lệ</span>
              </div>
            )}

            {checkStatus === 'invalid' && code.trim().length > 3 && (
              <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>
                Mã không tồn tại. Kiểm tra lại với giáo viên.
              </p>
            )}

            {error && (
              <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{error}</p>
            )}

            <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 16, lineHeight: 1.5 }}>
              Sau khi gửi, giáo viên sẽ thấy yêu cầu và chấp nhận hoặc từ chối trong 24 giờ.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1.5px solid #d1d5db', background: 'white', color: '#6b7280', cursor: 'pointer' }}>
                Huỷ
              </button>
              <button
                onClick={handleSubmit}
                disabled={checkStatus !== 'valid' || submitting}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  background: checkStatus === 'valid' ? '#1A56DB' : '#e5e7eb',
                  color: checkStatus === 'valid' ? 'white' : '#9ca3af',
                  border: 'none', cursor: checkStatus === 'valid' ? 'pointer' : 'not-allowed',
                }}>
                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── ClassCard Component ───────────────────────────────── */
function ClassCardItem({ classData, index }: { classData: ClassCard; index: number }) {
  const colorClass = CARD_COLORS[index % CARD_COLORS.length];
  
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClass} p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
            {classData.studentCount} học sinh
          </span>
        </div>
        
        <h3 className="text-lg font-bold mb-1">{classData.name}</h3>
        <p className="text-sm opacity-90 mb-2">{classData.subject}</p>
        <p className="text-xs opacity-75">GV: {classData.teacherName}</p>
      </div>
    </div>
  );
}

/* ─── Main dashboard ─────────────────────────────────────── */
export default function StudentMainDashboard() {
  const { user, isLoading, logout } = useAuth({ requiredRole: 'STUDENT' });
  const [exams, setExams]                   = useState<ExamCard[]>([]);
  const [examsLoading, setExamsLoading]     = useState(false);
  const [linkedTeachers, setLinkedTeachers] = useState<LinkedTeacher[]>([]);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [pages, setPages]                   = useState<LecturePage[]>([]);
  const [pagesLoading, setPagesLoading]     = useState(false);
  const [activeTab, setActiveTab]           = useState<'overview' | 'lectures' | 'exams' | 'progress'>('overview');
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeCourse, setActiveCourse]     = useState<LecturePage | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [selectedLectureTerm, setSelectedLectureTerm] = useState<LectureTerm>('MID_1');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const u = user as any;
  const className  = u?.className || '';
  const schoolName = u?.schoolName || u?.school?.name || '';

  const fetchLinkedTeachers = useCallback(async () => {
    if (!user?.id) return;
    try {
        const res = await fetch(`/api/student/link-teacher?studentId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        // API giờ trả về { accepted: [...], pending: [...] }
        const allLinks = [
          ...((data.accepted || []) as any[]),
          ...((data.pending || []) as any[]),
        ];
        // Fallback cho API cũ trả về array trực tiếp
        const list = Array.isArray(data) ? data : allLinks;
        const normalized: LinkedTeacher[] = list.map((item: any) => ({
          id: item.id,
          teacherId: item.teacherId || item.id,
          teacherName: item.teacherName || item.name || 'Giáo viên',
          teacherCode: item.teacherCode || null,
          subjects: Array.isArray(item.subjects) ? item.subjects : [],
          status: item.status || 'accepted',
          joinedAt: item.joinedAt,
          classId: item.classId || null,
          className: item.className || null,
          classNames: Array.isArray(item.classNames)
            ? item.classNames
            : item.className
              ? [item.className]
              : [],
          classDisplay: item.classDisplay || item.className || null,
          classGrade: item.classGrade || null,
        }));

        setLinkedTeachers(prev => {
          // Phát hiện pending → accepted để hiện toast
          const prevPending = prev.filter(t => t.status === 'pending');
          for (const pp of prevPending) {
            const now = normalized.find(t => t.id === pp.id);
            if (now && now.status === 'accepted') {
              toast.success(`🎉 Giáo viên ${now.teacherName} đã chấp nhận yêu cầu!`);
            }
          }
          return normalized;
        });
      }
    } catch { /* ignore */ }
  }, [user?.id, className]);

  const fetchExams = useCallback(async () => {
    if (!user?.id) return;
    setExamsLoading(true);
    try {
      const res = await fetch(`/api/student/exams?studentId=${user.id}`);
      if (res.ok) {
        const data: ExamCard[] = await res.json();
        setExams(data);
      }
    } catch { /* ignore */ }
    setExamsLoading(false);
  }, [user?.id]);

  const fetchPages = useCallback(async () => {
    if (!user?.id) return;
    setPagesLoading(true);
    try {
      // Fetch pages from linked teachers only
      const res = await fetch(`/api/pages/student-linked?studentId=${user.id}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list: LecturePage[] = Array.isArray(data) ? data : data.pages || [];
        setPages(list);
        // Derive authors and set first selected by default
        const uniqueAuthors = Array.from(
          new Map(list.filter(p => p.author).map(p => [p.author.id, p.author])).values()
        ) as { id: string; name: string }[];
        if (uniqueAuthors.length > 0) {
          setSelectedAuthorId(prev => prev ?? uniqueAuthors[0].id);
        }
      }
    } catch { /* ignore */ }
    setPagesLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    fetchLinkedTeachers();
    fetchExams();
    fetchPages();
  }, [user, fetchLinkedTeachers, fetchExams, fetchPages]);

  // Auto-polling: refresh teacher links mỗi 10s khi có pending request
  useEffect(() => {
    const hasPending = linkedTeachers.some(t => t.status === 'pending');
    if (!hasPending || !user?.id) return;
    const interval = setInterval(() => {
      fetchLinkedTeachers();
    }, 10000);
    return () => clearInterval(interval);
  }, [linkedTeachers, user?.id, fetchLinkedTeachers]);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchLinkedTeachers(), fetchExams(), fetchPages()]);
    setIsRefreshing(false);
  }, [fetchLinkedTeachers, fetchExams, fetchPages]);

  const menuItems = [
    { icon: <BookOpen className="w-6 h-6" />, title: 'Bài giảng', desc: 'Xem bài học & video', href: '/student/pages', color: '#185FA5' },
    { icon: <ClipboardCheck className="w-6 h-6" />, title: 'Kiểm tra / Điểm', desc: 'Làm bài & xem kết quả', href: '/student/exams', color: '#854F0B' },
    { icon: <Library className="w-6 h-6" />, title: 'Thư viện', desc: 'Tài liệu & file học tập', href: '/student/library', color: '#0A3D2E' },
    { icon: <Brain className="w-6 h-6" />, title: 'Flashcard', desc: 'Ôn tập với thẻ ghi nhớ', href: '/student/flashcards', color: '#7C3AED' },
  ];

  const acceptedTeachers = linkedTeachers.filter(t => t.status !== 'pending');
  const pendingTeachers  = linkedTeachers.filter(t => t.status === 'pending');

  const acceptedTeacherCards = useMemo(() => {
    const map = new Map<string, LinkedTeacher>();

    for (const teacher of acceptedTeachers) {
      const existing = map.get(teacher.teacherId);
      if (!existing) {
        map.set(teacher.teacherId, {
          ...teacher,
          classNames: [...(teacher.classNames || (teacher.className ? [teacher.className] : []))],
          classDisplay: teacher.classDisplay || teacher.className || null,
        });
        continue;
      }

      const mergedClassNames = Array.from(new Set([
        ...(existing.classNames || []),
        ...(teacher.classNames || []),
        ...(teacher.className ? [teacher.className] : []),
      ]));

      const mergedSubjects = Array.from(new Set([...(existing.subjects || []), ...(teacher.subjects || [])]));

      map.set(teacher.teacherId, {
        ...existing,
        id: existing.id,
        joinedAt: existing.joinedAt > teacher.joinedAt ? existing.joinedAt : teacher.joinedAt,
        classNames: mergedClassNames,
        classDisplay: mergedClassNames.join('/'),
        subjects: mergedSubjects,
      });
    }

    return Array.from(map.values());
  }, [acceptedTeachers]);

  useEffect(() => {
    if (selectedAuthorId !== null) return;
    if (acceptedTeachers.length > 0) {
      setSelectedAuthorId(acceptedTeachers[0].teacherId);
    }
  }, [acceptedTeachers, selectedAuthorId]);

  const teacherTabs = useMemo(() => {
    const map = new Map<string, string>();
    acceptedTeachers.forEach(t => map.set(t.teacherId, t.teacherName));
    pages.forEach(p => {
      if (p.author?.id && p.author?.name) map.set(p.author.id, p.author.name);
    });
    exams.forEach(e => {
      if (e.teacherId && e.teacherName) map.set(e.teacherId, e.teacherName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [acceptedTeachers, pages, exams]);

  // ── Real notifications derived from fetched data ──────────────
  const [seenExamIds, setSeenExamIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('student-seen-exam-ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  const notifications = useMemo(() => {
    const items: { id: string; title: string; message: string; type: 'info' | 'warning' | 'success' | 'reminder'; timestamp: string; isRead: boolean; teacherId?: string }[] = [];
    // Teacher accepted notification
    acceptedTeachers.forEach(t => {
      items.push({
        id: `teacher-${t.id}`,
        title: 'Giáo viên đã chấp nhận',
        message: `${t.teacherName} đã chấp nhận yêu cầu liên kết của bạn`,
        type: 'success',
        timestamp: t.joinedAt,
        isRead: true,
        teacherId: t.teacherId,
      });
    });
    // Pending teacher notifications
    pendingTeachers.forEach(t => {
      items.push({
        id: `pending-${t.id}`,
        title: 'Chờ xác nhận',
        message: `${t.teacherName} chưa chấp nhận yêu cầu của bạn`,
        type: 'reminder',
        timestamp: t.joinedAt,
        isRead: true,
        teacherId: t.teacherId,
      });
    });
    // Open exam notifications
    exams.filter(e => e.status === 'open').forEach(e => {
      items.push({
        id: `exam-open-${e.id}`,
        title: 'Bài kiểm tra mới',
        message: `${e.title}${e.teacherName ? ` — ${e.teacherName}` : ''}`,
        type: 'info',
        timestamp: e.closeAt || new Date().toISOString(),
        isRead: seenExamIds.has(e.id),
        teacherId: e.teacherId,
      });
    });
    // Deadline warning: open exams closing within 24 h
    exams.filter(e => e.status === 'open' && e.closeAt).forEach(e => {
      const diff = new Date(e.closeAt!).getTime() - Date.now();
      if (diff > 0 && diff < 86_400_000) {
        items.push({
          id: `exam-deadline-${e.id}`,
          title: 'Sắp hết hạn',
          message: `Bài kiểm tra "${e.title}" sẽ đóng trong vòng 24 giờ`,
          type: 'warning',
          timestamp: e.closeAt!,
          isRead: seenExamIds.has(`deadline-${e.id}`),
          teacherId: e.teacherId,
        });
      }
    });
    // Sort newest first
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [acceptedTeachers, pendingTeachers, exams, seenExamIds]);

  const visibleNotifications = selectedAuthorId
    ? notifications.filter(n => !n.teacherId || n.teacherId === selectedAuthorId)
    : notifications;

  const notificationUnreadCount = visibleNotifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = useCallback(() => {
    const newSeen = new Set(seenExamIds);
    exams
      .filter(e => e.status === 'open' && (!selectedAuthorId || e.teacherId === selectedAuthorId))
      .forEach(e => { newSeen.add(e.id); newSeen.add(`deadline-${e.id}`); });
    setSeenExamIds(newSeen);
    try { localStorage.setItem('student-seen-exam-ids', JSON.stringify([...newSeen])); } catch {}
  }, [exams, seenExamIds, selectedAuthorId]);

  // Filter pages based on search
  const filteredPages = pages.filter(page => 
    !searchQuery || 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.author?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter exams - show all, not just 2 recent ones
  const filteredExams = exams.filter(exam => {
    const matchTeacher = !selectedAuthorId || exam.teacherId === selectedAuthorId;
    const matchSearch =
      !searchQuery ||
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.teacherName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTeacher && matchSearch;
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/student" className="font-bold text-blue-700 dark:text-blue-400 text-lg">
            Penta School
          </Link>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="student-main-search-navbar"
                name="studentSearchNavbar"
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm w-48 focus:w-64 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(v => !v)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell size={18} className="text-gray-500" />
                {notificationUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationUnreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Thông báo</p>
                      {notificationUnreadCount > 0 && (
                        <button
                          onClick={() => {
                            handleMarkAllRead();
                            setShowNotifDropdown(false);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {visibleNotifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          Chưa có thông báo mới
                        </div>
                      ) : (
                        visibleNotifications.slice(0, 8).map((n) => (
                          <div key={n.id} className="px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-slate-800">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5">
                                {n.type === 'success' ? <Check size={14} className="text-green-500" /> : <Clock size={14} className="text-amber-500" />}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{n.title}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{n.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* +Thêm GV button */}
            <button
              onClick={() => setShowAddTeacher(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors border border-blue-200 dark:border-blue-800"
            >
              <Plus size={14} /> Thêm GV
            </button>

            {/* User info - Clickable to go to dashboard */}
            <button
              onClick={() => { setActiveTab('overview'); setShowMiniPlayer(false); setActiveLessonId(null); setActiveCourse(null); }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">
                  {className ? `Lớp ${className}` : 'Học sinh'}
                  {schoolName ? ` · ${schoolName}` : ''}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {user?.name?.charAt(0) || 'S'}
                </span>
              </div>
            </button>

            <button onClick={logout} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8" style={{ animation: 'fadeUp .3s ease both' }}>

        {/* Welcome with Quick Stats */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Welcome Text */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Chào {user?.name} 👋
              </h1>
              {className || acceptedTeachers.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {className && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      Lớp {className}
                    </span>
                  )}
                  {schoolName && <span className="text-gray-500 dark:text-gray-400">{schoolName}</span>}
                  {acceptedTeachers.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      <Check className="w-3.5 h-3.5" />
                      {acceptedTeachers.length} giáo viên đã kết nối
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Chưa kết nối với giáo viên nào. Nhập mã lớp bên dưới để bắt đầu.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Stats - Compact */}
            <div className="flex flex-wrap items-center gap-4 mt-3 lg:mt-0 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                <BookOpen size={16} className="text-blue-500" />
                {pages.length} Bài giảng
              </div>
              <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                <ClipboardCheck size={16} className="text-green-500" />
                {exams.length} Bài kiểm tra
              </div>
              <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                <Check size={16} className="text-purple-500" />
                {exams.filter(e => e.status === 'done').length} Hoàn thành
              </div>
              <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                <GraduationCap size={16} className="text-orange-500" />
                {acceptedTeachers.length} Giáo viên
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Đơn giản hóa */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Tổng quan', icon: <TrendingUp size={16} /> },
            { id: 'lectures', label: 'Bài giảng', icon: <BookOpen size={16} /> },
            { id: 'exams', label: 'Kiểm tra', icon: <ClipboardCheck size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 border border-gray-200 dark:border-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <button
            onClick={refreshAll}
            disabled={isRefreshing}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 border border-gray-200 dark:border-slate-700 disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Omitted large notification cards */}

            {/* Tools */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Công cụ học tập</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {menuItems.map((m) => (
                  <Link key={m.href} href={m.href}
                    className="flex flex-col gap-3 p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: m.color + '18' }}>
                      <div style={{ color: m.color }}>{m.icon}</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors">
                        {m.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 leading-snug">{m.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
            <StudentAdditionalFeatures
              studentId={user?.id}
              notifications={visibleNotifications}
              onMarkAllRead={handleMarkAllRead}
            />
          </div>
        )}

        {activeTab === 'lectures' && (
          <div className="space-y-5">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="student-main-search-lectures"
                name="studentSearchLectures"
                type="text"
                placeholder="Tìm kiếm bài giảng..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>

            {/* Author tabs */}
            {!searchQuery && (() => {
              return teacherTabs.length > 1 ? (
                <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 overflow-x-auto pb-px">
                  <button
                    onClick={() => setSelectedAuthorId(null)}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${selectedAuthorId === null ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                  >
                    Tất cả
                  </button>
                  {teacherTabs.map(t => (
                    <button key={t.id} onClick={() => setSelectedAuthorId(t.id)}
                      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${selectedAuthorId === t.id ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Course tree */}
            {pagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : (() => {
              const filtered = pages.filter(p => {
                const matchAuthor = selectedAuthorId === null || p.author?.id === selectedAuthorId;
                const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()) || p.author?.name.toLowerCase().includes(searchQuery.toLowerCase());
                return matchAuthor && matchSearch;
              });
              if (filtered.length === 0) return (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {searchQuery ? 'Không tìm thấy bài giảng' : 'Chưa có bài giảng'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Giáo viên chưa xuất bản bài giảng nào'}
                  </p>
                </div>
              );
              return (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {LECTURE_TERM_OPTIONS.map(term => (
                      <button
                        key={term.key}
                        onClick={() => setSelectedLectureTerm(term.key)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors ${selectedLectureTerm === term.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-400'}`}
                      >
                        {term.label}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const termCourses = filtered.filter(course => getLectureTerm(course) === selectedLectureTerm);
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400">{LECTURE_TERM_OPTIONS.find(t => t.key === selectedLectureTerm)?.label}</h4>
                          <span className="text-xs text-gray-400">{termCourses.length} bài giảng</span>
                        </div>
                        {termCourses.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 px-4 py-3 text-xs text-gray-400">
                            Chưa có bài giảng trong mục này.
                          </div>
                        ) : termCourses.map((course) => {
                          const isExp = expandedCourseId === course.id;
                          const lessonCount = course.children?.length || 0;
                          const cleanDescription = stripTermMark(course.description);
                          return (
                            <div key={course.id} className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                              <div
                                onClick={() => setExpandedCourseId(isExp ? null : course.id)}
                                className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                  <Layers size={22} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{course.title}</h3>
                                    {lessonCount > 0 && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                                        {lessonCount} bài học
                                      </span>
                                    )}
                                  </div>
                                  {cleanDescription && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{cleanDescription}</p>}
                                  <p className="text-xs text-gray-400 mt-0.5">GV: {course.author?.name} · {new Date(course.updatedAt).toLocaleDateString('vi-VN')}</p>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExp ? 'rotate-180' : ''}`} />
                              </div>
                              {isExp && (
                                <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800/50">
                                  <div className="flex flex-col gap-2">
                                    <div
                                      onClick={() => { setActiveCourse(course); setActiveLessonId(course.id); setShowMiniPlayer(true); }}
                                      className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-300">
                                        Gốc
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{course.title}</div>
                                        <div className="text-xs text-gray-400">Nội dung chính của bài giảng</div>
                                      </div>
                                      <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex items-center gap-1">
                                        <Play size={12} /> Học ngay
                                      </span>
                                    </div>

                                    {course.children && course.children.length > 0 ? (
                                      course.children.map((lesson, idx) => (
                                        <div
                                          key={lesson.id}
                                          onClick={() => { setActiveCourse(course); setActiveLessonId(lesson.id); setShowMiniPlayer(true); }}
                                          className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group"
                                        >
                                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-gray-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                            {idx + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{lesson.title}</div>
                                          </div>
                                          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex items-center gap-1">
                                            <Play size={12} /> Học ngay
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-center py-2 text-sm text-gray-400">Khóa học chưa có bài học con</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="space-y-6">
            {!searchQuery && teacherTabs.length > 1 && (
              <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 overflow-x-auto pb-px">
                <button
                  onClick={() => setSelectedAuthorId(null)}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${selectedAuthorId === null ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                  Tất cả giáo viên
                </button>
                {teacherTabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedAuthorId(t.id)}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${selectedAuthorId === t.id ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {/* Exams List */}
            {examsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'Không tìm thấy bài kiểm tra' : 'Chưa có bài kiểm tra'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Giáo viên chưa phát hành bài kiểm tra nào'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExams.map((exam) => {
                  const st = STATUS_STYLE[exam.status];
                  return (
                    <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white truncate">{exam.title}</h3>
                            <span className="text-sm font-medium px-3 py-1 rounded-full flex-shrink-0"
                              style={{ background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                            <span>{exam.subject}</span>
                            <span>·</span>
                            <span>{exam.duration} phút</span>
                            {exam.teacherName && <><span>·</span><span>{exam.teacherName}</span></>}
                            <span>·</span>
                            <span>{exam.status === 'done' ? `Điểm: ${exam.score ?? '—'}` : exam.deadline}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {exam.status === 'open' ? (
                            <Link href={`/student/exam/${exam.id}`}
                              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                              Làm bài
                            </Link>
                          ) : exam.status === 'done' ? (
                            <Link href={`/student/result/${exam.id}`}
                              className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors">
                              Xem kết quả
                            </Link>
                          ) : (
                            <span className="px-5 py-2.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-400 text-sm">
                              Chưa mở
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Progress Overview */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tiến độ học tập</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {exams.filter(e => e.status === 'done').length}
                  </div>
                  <div className="text-sm text-gray-500">Bài kiểm tra đã hoàn thành</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {exams.filter(e => e.status === 'done' && e.score && e.score >= 5).length}
                  </div>
                  <div className="text-sm text-gray-500">Bài đạt yêu cầu (≥5 điểm)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {pages.length > 0 ? Math.round((exams.filter(e => e.status === 'done').length / Math.max(pages.length, 1)) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-500">Tỷ lệ hoàn thành</div>
                </div>
              </div>
            </div>

            {/* Recent Scores */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Điểm số gần đây</h3>
              {exams.filter(e => e.status === 'done').length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Chưa có bài kiểm tra nào được hoàn thành
                </p>
              ) : (
                <div className="space-y-3">
                  {exams.filter(e => e.status === 'done').slice(0, 5).map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{exam.title}</h4>
                        <p className="text-sm text-gray-500">{exam.subject}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${exam.score && exam.score >= 5 ? 'text-green-600' : 'text-red-600'}`}>
                          {exam.score ?? '—'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {exam.score && exam.score >= 5 ? 'Đạt' : 'Chưa đạt'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Study Tips */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-3">💡 Mẹo học tập</h3>
              <ul className="space-y-2 text-sm opacity-90">
                <li>• Xem lại bài giảng trước khi làm bài kiểm tra</li>
                <li>• Làm bài kiểm tra khi tập trung và không bị phân tâm</li>
                <li>• Ôn tập những câu hỏi đã sai trong các bài trước</li>
                <li>• Đặt mục tiêu học tập hàng tuần</li>
              </ul>
            </div>
          </div>
        )}

        {/* Giáo viên đã liên kết */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Giáo viên của bạn
            </h2>
            <button
              onClick={() => setShowAddTeacher(true)}
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              <Plus size={14} /> Thêm
            </button>
          </div>

          {linkedTeachers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-8 text-center">
              <p className="text-gray-400 dark:text-gray-500 mb-3">Chưa liên kết với giáo viên nào</p>
              <button
                onClick={() => setShowAddTeacher(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} /> Thêm giáo viên
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {acceptedTeacherCards.map(t => {
                const subjects = (t.subjects || []).join(', ');
                const isSelectedTeacher = selectedAuthorId === t.teacherId;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setSelectedAuthorId(t.teacherId)}
                    className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-colors text-left ${
                      isSelectedTeacher
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300">
                      {t.teacherName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.teacherName}</div>
                      {t.classDisplay && <div className="text-xs text-blue-500">Lớp {t.classDisplay}</div>}
                      {subjects && <div className="text-xs text-gray-400">{subjects}</div>}
                    </div>
                    <Check size={16} className="text-green-500 ml-2" />
                  </button>
                );
              })}
              {pendingTeachers.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <Clock size={16} className="text-amber-500" />
                  <div>
                    <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t.teacherName}</div>
                    <div className="text-xs text-amber-600 dark:text-amber-400">Đang chờ chấp nhận</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal thêm giáo viên */}
      {showAddTeacher && user && (
        <AddTeacherModal
          studentId={user.id}
          onClose={() => setShowAddTeacher(false)}
          onSuccess={() => { fetchLinkedTeachers(); fetchExams(); }}
        />
      )}

      {/* Mini Lecture Player */}
      {showMiniPlayer && activeCourse && (
        <MiniLecturePlayer
          course={activeCourse as any}
          initialLessonId={activeLessonId || undefined}
          studentId={user?.id || ''}
          studentName={user?.name || ''}
          onClose={() => setShowMiniPlayer(false)}
        />
      )}
    </div>
  );
}
