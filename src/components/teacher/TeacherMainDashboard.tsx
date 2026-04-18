'use client';
/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LogOut, BookOpen, Library, ClipboardCheck,
  Check, Plus, Pencil, X, ChevronDown,
  GraduationCap, Layers, Bot, BarChart3, Users, Bell, Search,
  Activity, Flame, AlertTriangle, Clock, UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAuthUser } from '@/lib/auth-storage';
import { fetchWithAuthRetry } from '@/lib/fetchWithAuthRetry';
import ExamCreator, { type ClassInfo } from './Examcreator';
import TestManagementModule from './TestManagementModule';

/* ─── Types ─────────────────────────────────────────────────── */
interface User {
  id: string; name: string; role: string; email: string;
  schoolName?: string; schoolId?: string;
  subjects?: string; // JSON array
  teacherCode?: string;
}

interface DashStats {
  lectureCount: number;
  openExamCount: number;
  studentCount: number;
}

interface StudentRequest {
  linkId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  className?: string;
  status: 'pending' | 'accepted' | 'rejected';
  joinedAt: string;
  expiresAt?: string;
  activeDays?: number;
  streak?: number;
  lastSeenDaysAgo?: number;
}

interface AcceptedStudentRow extends StudentRequest {
  linkIds: string[];
  className: string;
}

/* ─── Class modal ───────────────────────────────────────────── */
function ClassModal({ onSave, onClose, initialName }: {
  onSave: (cls: Omit<ClassInfo, 'id'>) => void;
  onClose: () => void;
  initialName?: string;
}) {
  const [name, setName] = useState('');
  const year = new Date().getFullYear();
  
  // Reset name when modal opens
  useEffect(() => {
    setName(initialName || '');
  }, [initialName]);
  
  const hasValue = name.trim().length > 0;
  
  // Tạo mã lớp MỚI mỗi lần - dùng timestamp để đảm bảo unique
  const classCode = name.trim().length > 0 
    ? `LOP-${name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`
    : '';
  
  const save = () => { 
    if (!hasValue) return; 
    onSave({ name: name.trim(), year, code: classCode }); 
    setName(''); // Reset sau khi save
    onClose(); 
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,8,20,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0D1829', border: '1px solid rgba(96,200,255,.25)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontWeight: 700, color: '#E2EAF4', fontSize: 16 }}>{initialName ? 'Sửa tên lớp' : 'Thêm lớp phụ trách'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
            <X style={{ width: 16, height: 16, color: 'rgba(255,255,255,.4)' }} />
          </button>
        </div>
        <input autoFocus id="class-name" name="className"
          style={{ display: 'block', width: '100%', padding: '16px 0', borderRadius: 14, fontSize: 28, fontWeight: 800, letterSpacing: '0.18em', fontFamily: 'monospace', background: hasValue ? 'rgba(24,95,165,.25)' : 'rgba(255,255,255,.06)', color: '#FFFFFF', border: `2px solid ${hasValue ? '#60C8FF' : 'rgba(255,255,255,.15)'}`, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }}
          placeholder="10A1" value={name}
          onChange={e => setName(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && save()} />
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', textAlign: 'center', marginTop: 10, marginBottom: 24 }}>
          Năm học {year}–{year + 1}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer' }}>Huỷ</button>
          <button onClick={save} disabled={!hasValue} style={{ flex: 2, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, background: hasValue ? '#185FA5' : 'rgba(255,255,255,.06)', color: hasValue ? '#FFFFFF' : 'rgba(255,255,255,.25)', border: 'none', cursor: hasValue ? 'pointer' : 'not-allowed' }}>
            {initialName ? 'Cập nhật' : 'Thêm lớp'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Student Management View ────────────────────────────────── */
function StudentManagementView({ teacherId, onBack, activeClass }: { teacherId: string; onBack: () => void; activeClass: ClassInfo | null }) {
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchRequests = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? false;

    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    if (showLoading) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const classQuery = activeClass?.id ? `&classId=${encodeURIComponent(activeClass.id)}` : '';
      const res = await fetchWithAuthRetry(`/api/teacher/student-requests?teacherId=${teacherId}${classQuery}`);
      if (res.ok) {
        const data = await res.json();
        // API trả về { pending: [...], accepted: [...] }
        const allRequests = [
          ...(data.pending || []),
          ...(data.accepted || [])
        ];
        setRequests(allRequests);
      }
    } catch { /* ignore */ }

    if (showLoading) {
      setLoading(false);
    } else {
      setIsRefreshing(false);
    }
    isFetchingRef.current = false;
  }, [teacherId, activeClass?.id]);

  useEffect(() => {
    fetchRequests({ showLoading: true });
  }, [fetchRequests]);

  // Auto-polling nền: không bật loading toàn màn hình để tránh giật UI.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      fetchRequests();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleAction = async (linkId: string | string[], action: 'accept' | 'reject' | 'remove') => {
    const linkIds = Array.isArray(linkId) ? linkId : [linkId];
    const actionKey = linkIds.join(',');

    setActionId(actionKey);
    try {
      const requests = linkIds.map((id) =>
        fetchWithAuthRetry('/api/teacher/student-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkId: id, action }),
        })
      );

      const responses = await Promise.all(requests);
      if (responses.every((res) => res.ok)) fetchRequests({ showLoading: false });
    } catch { /* ignore */ }
    setActionId(null);
  };

  const pending  = requests.filter(r => r.status === 'pending');
  const accepted = requests.filter(r => r.status === 'accepted');
  const pendingFiltered = pending;
  const acceptedByStudent = new Map<string, AcceptedStudentRow>();

  for (const request of accepted) {
    const existing = acceptedByStudent.get(request.studentId);
    const nextClassNames = Array.from(new Set([
      ...(existing?.className ? existing.className.split('/') : []),
      ...(request.className ? [request.className] : []),
    ].filter(Boolean)));

    if (!existing) {
      acceptedByStudent.set(request.studentId, {
        ...request,
        linkIds: [request.linkId],
        className: nextClassNames.join('/'),
      });
      continue;
    }

    acceptedByStudent.set(request.studentId, {
      ...existing,
      linkIds: [...existing.linkIds, request.linkId],
      className: nextClassNames.join('/'),
      activeDays: Math.max(existing.activeDays ?? 0, request.activeDays ?? 0),
      streak: Math.max(existing.streak ?? 0, request.streak ?? 0),
      lastSeenDaysAgo: Math.min(existing.lastSeenDaysAgo ?? Number.MAX_SAFE_INTEGER, request.lastSeenDaysAgo ?? Number.MAX_SAFE_INTEGER),
    });
  }

  const acceptedFiltered = Array.from(acceptedByStudent.values()).map((item) => ({
    ...item,
    lastSeenDaysAgo: item.lastSeenDaysAgo === Number.MAX_SAFE_INTEGER ? undefined : item.lastSeenDaysAgo,
  }));

  return (
    <div style={{ animation: 'dashReveal .28s ease both' }}>
      <button onClick={onBack} style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}>
        ← Quay lại
      </button>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#E2EAF4', marginBottom: 6 }}>Quản lý học sinh</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 24 }}>
        Học sinh nhập mã lớp của bạn → yêu cầu xuất hiện ở đây → chấp nhận để liên kết
      </div>
      <div style={{ marginBottom: 16, fontSize: 11, color: '#60C8FF', fontWeight: 700 }}>
        Đang quản lý theo lớp: {activeClass?.name || 'Tất cả lớp'}
        {isRefreshing && <span style={{ marginLeft: 8, color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>· đang làm mới</span>}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,.2)', borderTopColor: '#60C8FF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && (<>
        {/* Yêu cầu đang chờ */}
        {pendingFiltered.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#60C8FF', letterSpacing: '0.08em' }}>YÊU CẦU ĐANG CHỜ</div>
              <div style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(251,191,36,.2)', color: '#fbbf24', fontSize: 11, fontWeight: 700 }}>
                {pendingFiltered.length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingFiltered.map(r => {
                const isExpiring = r.expiresAt && new Date(r.expiresAt) < new Date(Date.now() + 3 * 3600_000);
                const isMultiClass = requests.filter(x => x.studentId === r.studentId).length > 1;
                return (
                  <div key={r.linkId} style={{
                    background: 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(251,191,36,.2)',
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(96,200,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      🎒
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#E2EAF4' }}>
                        {r.studentName}
                        {isMultiClass && <span title="Đăng ký nhiều lớp" style={{ marginLeft: 6, fontSize: 13 }}>⭐</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
                        {r.studentEmail}
                        {r.className && ` · Lớp ${r.className}`}
                      </div>
                      {isExpiring && (
                        <div style={{ fontSize: 10, color: '#f87171', marginTop: 2 }}>⚠ Sắp hết hạn</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleAction(r.linkId, 'reject')}
                        disabled={actionId === r.linkId}
                        style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', cursor: 'pointer' }}>
                        Từ chối
                      </button>
                      <button
                        onClick={() => handleAction(r.linkId, 'accept')}
                        disabled={actionId === r.linkId}
                        style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#185FA5', color: 'white', border: 'none', cursor: 'pointer' }}>
                        {actionId === r.linkId ? '...' : 'Chấp nhận'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingFiltered.length === 0 && (
          <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px dashed rgba(255,255,255,.1)', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Không có yêu cầu nào đang chờ</div>
          </div>
        )}

        {/* Học sinh đã liên kết */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '0.08em', marginBottom: 12 }}>
            ĐÃ LIÊN KẾT ({acceptedFiltered.length})
          </div>
          {acceptedFiltered.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: 20 }}>
              Chưa có học sinh nào liên kết
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {acceptedFiltered.map((r) => {
                const isMultiClass = r.linkIds.length > 1;
                const actionKey = r.linkIds.join(',');
                return (
                <div key={r.linkId} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(96,200,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#60C8FF', flexShrink: 0 }}>
                    {r.studentName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#E2EAF4' }}>
                      {r.studentName}
                      {isMultiClass && <span title="Đăng ký nhiều lớp" style={{ marginLeft: 6, fontSize: 12 }}>⭐</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                      {r.studentEmail}
                      {r.className && ` · Lớp ${r.className}`}
                    </div>
                    {(r.activeDays !== undefined || r.streak !== undefined || r.lastSeenDaysAgo !== undefined) && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {r.activeDays !== undefined && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(96,200,255,.12)', color: '#60C8FF' }}>
                            📅 {r.activeDays} ngày HĐ
                          </span>
                        )}
                        {r.streak !== undefined && r.streak > 0 && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(251,176,64,.12)', color: '#FBB040' }}>
                            🔥 {r.streak} ngày LT
                          </span>
                        )}
                        {r.lastSeenDaysAgo !== undefined && r.lastSeenDaysAgo >= 3 && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(248,113,113,.12)', color: '#f87171' }}>
                            ⚠ Offline {r.lastSeenDaysAgo}ng
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check style={{ width: 12, height: 12 }} /> Liên kết
                    </div>
                    <button
                      onClick={() => handleAction(r.linkIds, 'remove')}
                      disabled={actionId === actionKey}
                      style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(248,113,113,.15)', color: '#f87171', border: '1px solid rgba(248,113,113,.3)', cursor: 'pointer' }}>
                      {actionId === actionKey ? '...' : 'Xóa'}
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}

/* ─── Teacher Library View ─────────────────────────────────── */
interface LibraryFile {
  id: string;
  title: string;
  description?: string;
  visibility: 'PUBLIC' | 'CLASS';
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize?: number;
  createdAt: string;
  teacher: { name: string };
  class?: { id: string; name: string } | null;
  _count: { comments: number };
}

interface LibraryComment {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string; role: string };
}

function TeacherLibraryView({ teacherId, onBack, classes, activeClass }: {
  teacherId: string;
  onBack: () => void;
  classes: ClassInfo[];
  activeClass: ClassInfo | null;
}) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [commentFileId, setCommentFileId] = useState<string | null>(null);
  const [comments, setComments] = useState<LibraryComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<'PUBLIC' | 'CLASS'>('PUBLIC');
  const [uploadClassId, setUploadClassId] = useState<string>('');
  const fileInputRef = useState<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; url: string; size: number } | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuthRetry(`/api/teacher/library?teacherId=${teacherId}`);
      if (res.ok) setFiles(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [teacherId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    let fileType = 'image';
    if (ext === 'pdf') fileType = 'pdf';
    else if (['doc', 'docx'].includes(ext)) fileType = 'word';
    else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) fileType = 'image';
    else { alert('Chỉ hỗ trợ PDF, Word, và ảnh (PNG/JPG)'); return; }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({ name: f.name, type: fileType, url: reader.result as string, size: f.size });
      setUploadTitle(prev => prev || f.name.replace(/\.[^.]+$/, ''));
    };
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      const res = await fetchWithAuthRetry('/api/teacher/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId, title: uploadTitle.trim(), description: uploadDesc.trim() || undefined,
          fileUrl: selectedFile.url, fileType: selectedFile.type,
          fileName: selectedFile.name, fileSize: selectedFile.size,
          visibility: uploadVisibility,
          classId: uploadVisibility === 'CLASS' ? (uploadClassId || activeClass?.id || null) : null,
        }),
      });
      if (res.ok) {
        setShowUpload(false);
        setUploadTitle('');
        setUploadDesc('');
        setSelectedFile(null);
        setUploadVisibility('PUBLIC');
        setUploadClassId('');
        fetchFiles();
      }
    } catch { /* ignore */ }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa tài liệu này?')) return;
    await fetchWithAuthRetry(`/api/teacher/library?id=${id}&teacherId=${teacherId}`, { method: 'DELETE' });
    setFiles(f => f.filter(x => x.id !== id));
  };

  const openComments = async (fileId: string) => {
    setCommentFileId(fileId);
    setCommentText('');
    const res = await fetchWithAuthRetry(`/api/teacher/library/comments?fileId=${fileId}`);
    if (res.ok) setComments(await res.json());
  };

  const submitComment = async () => {
    if (!commentFileId || !commentText.trim()) return;
    const res = await fetchWithAuthRetry('/api/teacher/library/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: commentFileId, authorId: teacherId, content: commentText }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments(prev => [...prev, c]);
      setCommentText('');
      setFiles(f => f.map(x => x.id === commentFileId ? { ...x, _count: { comments: x._count.comments + 1 } } : x));
    }
  };

  const typeIcon = (t: string) => t === 'pdf' ? '📄' : t === 'word' ? '📝' : '🖼️';
  const typeLabel = (t: string) => t === 'pdf' ? 'PDF' : t === 'word' ? 'Word' : 'Ảnh';

  return (
    <div style={{ animation: 'dashReveal .28s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={onBack} style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          ← Quay lại
        </button>
        <button onClick={() => setShowUpload(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(96,200,255,.15)', border: '1px solid rgba(96,200,255,.25)', color: '#60C8FF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          <Plus style={{ width: 13, height: 13 }} /> Tải lên tài liệu
        </button>
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, color: '#E2EAF4', marginBottom: 4 }}>Thư viện tài liệu</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 20 }}>
        Chia sẻ PDF, Word, ảnh theo 2 che do: cong khai hoac rieng theo lop
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0D1829', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#E2EAF4', marginBottom: 16 }}>Tải lên tài liệu</div>

            <label style={{ display: 'block', padding: '24px 16px', borderRadius: 10, border: '2px dashed rgba(96,200,255,.3)', textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: selectedFile ? 'rgba(96,200,255,.07)' : 'transparent' }}>
              <input id="library-file" name="libraryFile" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp" style={{ display: 'none' }} onChange={handleFileSelect} />
              {selectedFile ? (
                <div><div style={{ fontSize: 24 }}>{typeIcon(selectedFile.type)}</div><div style={{ fontSize: 12, color: '#60C8FF', marginTop: 4 }}>{selectedFile.name}</div></div>
              ) : (
                <div><div style={{ fontSize: 28 }}>📂</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>Chọn PDF, Word, hoặc ảnh</div></div>
              )}
            </label>

            <input id="library-upload-title" name="uploadTitle" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
              placeholder="Tên tài liệu *"
              style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', color: '#E2EAF4', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }} />
            <input id="library-upload-desc" name="uploadDesc" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
              placeholder="Mô tả (tùy chọn)"
              style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', color: '#E2EAF4', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }} />

            <label style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>Che do chia se</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setUploadVisibility('PUBLIC')}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,.15)',
                  background: uploadVisibility === 'PUBLIC' ? 'rgba(24,95,165,.35)' : 'rgba(255,255,255,.04)',
                  color: uploadVisibility === 'PUBLIC' ? '#60C8FF' : 'rgba(255,255,255,.6)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cong khai
              </button>
              <button
                type="button"
                onClick={() => setUploadVisibility('CLASS')}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,.15)',
                  background: uploadVisibility === 'CLASS' ? 'rgba(24,95,165,.35)' : 'rgba(255,255,255,.04)',
                  color: uploadVisibility === 'CLASS' ? '#60C8FF' : 'rgba(255,255,255,.6)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Rieng theo lop
              </button>
            </div>

            {uploadVisibility === 'CLASS' && (
              <select
                value={uploadClassId || activeClass?.id || ''}
                onChange={(e) => setUploadClassId(e.target.value)}
                style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', color: '#E2EAF4', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }}
              >
                <option value="">Tat ca hoc sinh lien ket voi giao vien</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>Lop {cls.name}</option>
                ))}
              </select>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowUpload(false); setSelectedFile(null); setUploadTitle(''); setUploadDesc(''); }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', fontSize: 13 }}>Huỷ</button>
              <button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadTitle.trim()}
                style={{ flex: 2, padding: '10px 0', borderRadius: 8, background: selectedFile && uploadTitle ? '#185FA5' : 'rgba(255,255,255,.06)', color: selectedFile && uploadTitle ? 'white' : 'rgba(255,255,255,.25)', border: 'none', cursor: selectedFile && uploadTitle ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}>
                {uploading ? 'Đang tải...' : 'Tải lên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment panel */}
      {commentFileId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#0D1829', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#E2EAF4' }}>Nhận xét</div>
              <button onClick={() => setCommentFileId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: 18 }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comments.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.35)', fontSize: 13, paddingTop: 20 }}>Chưa có nhận xét</div>}
              {comments.map(c => (
                <div key={c.id} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#60C8FF' }}>{c.author.name}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#E2EAF4' }}>{c.content}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', gap: 8 }}>
              <input id="library-comment" name="commentText" value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Viết nhận xét..."
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: '#E2EAF4', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={submitComment} style={{ padding: '8px 14px', borderRadius: 8, background: '#185FA5', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Gửi</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Đang tải...</div>}

      {!loading && files.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', borderRadius: 12, border: '1px dashed rgba(255,255,255,.15)', color: 'rgba(255,255,255,.35)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
          <div style={{ fontSize: 14 }}>Chưa có tài liệu nào</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Tải lên PDF, Word, hoặc ảnh để chia sẻ với học sinh</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {files.map(f => (
          <div key={f.id} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{typeIcon(f.fileType)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E2EAF4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>
                {typeLabel(f.fileType)} · {new Date(f.createdAt).toLocaleDateString('vi-VN')}
                {f.fileSize && ` · ${(f.fileSize / 1024).toFixed(0)} KB`}
              </div>
                <div style={{ fontSize: 10, color: f.visibility === 'PUBLIC' ? '#4ADEAA' : '#60C8FF', marginTop: 2 }}>
                  {f.visibility === 'PUBLIC' ? 'Cong khai toan bo hoc sinh' : `Rieng lop ${f.class?.name || 'lien ket giao vien'}`}
                </div>
            </div>
            <button onClick={() => openComments(f.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: 'rgba(96,200,255,.1)', border: '1px solid rgba(96,200,255,.2)', color: '#60C8FF', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
              💬 {f._count.comments}
            </button>
            <button onClick={() => handleDelete(f.id)}
              style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', color: '#f87171', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Teacher Lectures View (Hierarchical) ────────────────── */
interface LecturePage {
  id: string; slug: string; title: string; description?: string;
  isPublished: boolean; updatedAt: string; createdAt: string;
  parentId?: string | null;
  classId?: string | null;
  children?: LecturePage[];
  order?: number;
}

type LectureTerm = string;
const LECTURE_DEFAULT_TERM_OPTIONS: { key: LectureTerm; label: string; short: string }[] = [
  { key: 'MID_1', label: 'Giữa kỳ I', short: 'GK I' },
  { key: 'FINAL_1', label: 'Cuối kỳ I', short: 'CK I' },
  { key: 'MID_2', label: 'Giữa kỳ II', short: 'GK II' },
  { key: 'FINAL_2', label: 'Cuối kỳ II', short: 'CK II' },
];
const getLectureTerm = (course: Pick<LecturePage, 'description'>): LectureTerm => {
  const m = course.description?.match(/^\[TERM:([A-Z0-9_\-]+)\]/);
  return (m?.[1] as LectureTerm) || 'MID_1';
};
const stripTermMark = (description?: string) => description?.replace(/^\[TERM:[A-Z0-9_\-]+\]\s*/,'').trim() || '';
const CUSTOM_TERM_STORAGE_KEY = 'customLectureTerms';

const toTermKey = (raw: string) => {
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return normalized || `TERM_${Date.now().toString(36).toUpperCase()}`;
};

function TeacherLecturesView({ teacherId, onBack, onNewLecture, classes, activeClassId, onLectureDeleted }: {
  teacherId: string; onBack: () => void; onNewLecture: () => void;
  classes: ClassInfo[];
  activeClassId?: string | null;
  onLectureDeleted?: () => void;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<LecturePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [showNewLessonModal, setShowNewLessonModal] = useState<string | null>(null); // courseId
  const [selectedTerm, setSelectedTerm] = useState<LectureTerm>('MID_1');
  const [termLabels, setTermLabels] = useState<Record<string, string>>({});
  const [editingTerm, setEditingTerm] = useState<LectureTerm | null>(null);
  const [editTermValue, setEditTermValue] = useState('');
  const [customTerms, setCustomTerms] = useState<Array<{ key: LectureTerm; label: string; short: string }>>([]);
  const [addingTerm, setAddingTerm] = useState(false);
  const [newTermName, setNewTermName] = useState('');

  // Load custom term labels from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('customTermLabels');
      if (saved) setTermLabels(JSON.parse(saved));
      const savedCustomTerms = localStorage.getItem(CUSTOM_TERM_STORAGE_KEY);
      if (savedCustomTerms) {
        const parsed = JSON.parse(savedCustomTerms);
        if (Array.isArray(parsed)) {
          setCustomTerms(parsed.filter((x) => x?.key && x?.label));
        }
      }
    } catch {}
  }, []);

  const termOptions = [
    ...LECTURE_DEFAULT_TERM_OPTIONS,
    ...customTerms.filter((ct) => !LECTURE_DEFAULT_TERM_OPTIONS.some((d) => d.key === ct.key)),
  ];

  const saveTermLabel = (key: LectureTerm, label: string) => {
    const trimmed = label.trim();
    const next = { ...termLabels };
    if (trimmed && trimmed !== termOptions.find(o => o.key === key)?.label) {
      next[key] = trimmed;
    } else {
      delete next[key];
    }
    setTermLabels(next);
    localStorage.setItem('customTermLabels', JSON.stringify(next));
    setEditingTerm(null);
  };

  useEffect(() => {
    const fetchPages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pages?authorId=${teacherId}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPages(Array.isArray(data) ? data : data.pages || []);
        }
      } catch (error) {
        console.error("Error fetching pages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPages();
  }, [teacherId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa bài giảng này?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/pages/${id}?authorId=${teacherId}`, { method: 'DELETE' });
      setPages(p => p.filter(x => x.id !== id));
      if (expandedCourseId === id) setExpandedCourseId(null);
      onLectureDeleted?.();
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const handleCreateLesson = async (parentId: string, title: string) => {
    try {
      const slug = `lesson-${Date.now()}`;
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, parentId, authorId: teacherId }),
      });
      if (res.ok) {
        const newLesson = await res.json();
        // Navigate to editor
        router.push(`/teacher/editor/${newLesson.id}`);
      }
    } catch (err) {
      console.error('Error creating lesson:', err);
    }
    setShowNewLessonModal(null);
  };

  // Only root courses — always locked to header-selected class
  const rootCourses = pages.filter(p => !p.parentId);
  const classFiltered = activeClassId
    ? rootCourses.filter(p => p.classId === activeClassId)
    : rootCourses;
  
  const filtered = classFiltered.filter(p =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const termCourses = filtered.filter(course => getLectureTerm(course) === selectedTerm);

  const addCustomTerm = () => {
    const trimmed = newTermName.trim();
    if (!trimmed) return;
    const key = toTermKey(trimmed);
    if (termOptions.some((t) => t.key === key)) {
      setSelectedTerm(key);
      setAddingTerm(false);
      setNewTermName('');
      return;
    }
    const short = trimmed.length <= 6 ? trimmed.toUpperCase() : trimmed.slice(0, 6).toUpperCase();
    const next = [...customTerms, { key, label: trimmed, short }];
    setCustomTerms(next);
    localStorage.setItem(CUSTOM_TERM_STORAGE_KEY, JSON.stringify(next));
    setSelectedTerm(key);
    setAddingTerm(false);
    setNewTermName('');
  };

  return (
    <div style={{ animation: 'dashReveal .28s ease both' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <button onClick={onBack} style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          ← Quay lại
        </button>
          <button onClick={onNewLecture}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#0A3D2E', border: '1px solid rgba(74,222,128,.25)', color: '#4ADEAA', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus style={{ width: 14, height: 14 }} /> Tạo bài giảng mới
          </button>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,.3)' }} />
        <input
          type="text"
          placeholder="Tìm kiếm bài giảng..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#E2EAF4', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X style={{ width: 13, height: 13, color: 'rgba(255,255,255,.3)' }} />
          </button>
        )}
      </div>

      {/* Hiển thị lớp đang quản lý */}
      {activeClassId && (
        <div style={{ marginBottom:10, fontSize:12, color:'#60C8FF', fontWeight:700 }}>
          Lớp: {classes.find(c => c.id === activeClassId)?.name || 'Tất cả'}
        </div>
      )}

      {/* Term tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:2, alignItems:'center' }}>
        {termOptions.map(opt => {
          const isActive = selectedTerm === opt.key;
          const displayLabel = termLabels[opt.key] || opt.label;

          if (editingTerm === opt.key) {
            return (
              <div key={opt.key} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <input
                  autoFocus
                  value={editTermValue}
                  onChange={e => setEditTermValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTermLabel(opt.key, editTermValue); if (e.key === 'Escape') setEditingTerm(null); }}
                  style={{ padding:'5px 10px', borderRadius:999, border:'1px solid #60C8FF', background:'rgba(24,95,165,.35)', color:'#fff', fontSize:12, fontWeight:700, width:100, outline:'none' }}
                />
                <button onClick={() => saveTermLabel(opt.key, editTermValue)} style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <Check style={{ width:14, height:14, color:'#4ADEAA' }} />
                </button>
                <button onClick={() => setEditingTerm(null)} style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <X style={{ width:14, height:14, color:'rgba(255,255,255,.4)' }} />
                </button>
              </div>
            );
          }

          return (
            <div key={opt.key} style={{ display:'flex', alignItems:'center', gap:2 }}>
              <button
                onClick={() => setSelectedTerm(opt.key)}
                style={{ padding:'7px 12px', borderRadius:999, border:'1px solid rgba(96,200,255,.25)', background:isActive?'rgba(24,95,165,.35)':'rgba(255,255,255,.04)', color:isActive?'#60C8FF':'rgba(255,255,255,.55)', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                {displayLabel}
              </button>
              {isActive && (
                <button
                  onClick={() => { setEditTermValue(displayLabel); setEditingTerm(opt.key); }}
                  title="Đổi tên"
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2, opacity:0.5, transition:'opacity .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
                  <Pencil style={{ width:12, height:12, color:'#60C8FF' }} />
                </button>
              )}
            </div>
          );
        })}
        {addingTerm ? (
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <input
              autoFocus
              value={newTermName}
              onChange={(e) => setNewTermName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCustomTerm();
                if (e.key === 'Escape') { setAddingTerm(false); setNewTermName(''); }
              }}
              placeholder="Tên mục..."
              style={{ padding:'5px 10px', borderRadius:999, border:'1px solid #60C8FF', background:'rgba(24,95,165,.35)', color:'#fff', fontSize:12, fontWeight:700, width:110, outline:'none' }}
            />
            <button onClick={addCustomTerm} style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
              <Check style={{ width:14, height:14, color:'#4ADEAA' }} />
            </button>
            <button onClick={() => { setAddingTerm(false); setNewTermName(''); }} style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
              <X style={{ width:14, height:14, color:'rgba(255,255,255,.4)' }} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingTerm(true)}
            title="Thêm mục khác"
            style={{ padding:'7px 10px', borderRadius:999, border:'1px dashed rgba(96,200,255,.35)', background:'rgba(24,95,165,.12)', color:'#60C8FF', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:4 }}
          >
            <Plus style={{ width:12, height:12 }} /> Thêm mục
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Bài giảng', val: classFiltered.length, color: '#60C8FF' },
          { label: 'Tổng bài học', val: classFiltered.reduce((acc, c) => acc + (c.children?.length || 0), 0), color: '#4ADEAA' },
          { label: 'Đã xuất bản', val: classFiltered.filter(p => p.isPublished).length, color: '#FBB040' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: `1px solid ${s.color}22`, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#60C8FF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(255,255,255,.03)', borderRadius: 14, border: '1px dashed rgba(255,255,255,.1)' }}>
          {searchQuery ? (
            <>
              <Search style={{ width: 28, height: 28, color: 'rgba(255,255,255,.2)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Không tìm thấy "<strong style={{ color: '#E2EAF4' }}>{searchQuery}</strong>"</div>
              <button onClick={() => setSearchQuery('')} style={{ marginTop: 10, fontSize: 12, color: '#60C8FF', background: 'none', border: 'none', cursor: 'pointer' }}>Xóa tìm kiếm</button>
            </>
          ) : (
            <>
              <BookOpen style={{ width: 28, height: 28, color: 'rgba(255,255,255,.2)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>Chưa có bài giảng nào</div>
              <button onClick={onNewLecture}
                style={{ padding: '8px 18px', borderRadius: 10, background: '#0A3D2E', border: '1px solid rgba(74,222,128,.25)', color: '#4ADEAA', fontSize: 12, fontWeight: 600, cursor: 'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                <Plus style={{ width: 13, height: 13 }} /> Tạo bài giảng đầu tiên
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#60C8FF', letterSpacing:'0.04em' }}>{termLabels[selectedTerm] || termOptions.find(t => t.key === selectedTerm)?.label}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.45)' }}>{termCourses.length} bài giảng</div>
          </div>
          {termCourses.length === 0 ? (
            <div style={{ padding:'10px 12px', borderRadius:10, border:'1px dashed rgba(255,255,255,.1)', color:'rgba(255,255,255,.35)', fontSize:11 }}>
              Chưa có bài giảng trong mục đã chọn.
            </div>
          ) : termCourses.map(course => {
                const isExpanded = expandedCourseId === course.id;
                const lessonCount = course.children?.length || 0;
                const cleanDescription = stripTermMark(course.description);
                return (
                  <div key={course.id} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
                    <div
                      onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: course.isPublished ? 'rgba(10,61,46,.8)' : 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Layers style={{ width: 17, height: 17, color: course.isPublished ? '#4ADEAA' : 'rgba(255,255,255,.35)' }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#E2EAF4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, flexShrink: 0, fontWeight: 600, background: course.isPublished ? 'rgba(74,222,128,.15)' : 'rgba(255,255,255,.07)', color: course.isPublished ? '#4ADEAA' : 'rgba(255,255,255,.4)' }}>
                            {course.isPublished ? 'Đã xuất bản' : 'Nháp'}
                          </span>
                          {lessonCount > 0 && (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, flexShrink: 0, fontWeight: 600, background: 'rgba(96,200,255,.15)', color: '#60C8FF' }}>
                              {lessonCount} bài học
                            </span>
                          )}
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, flexShrink: 0, fontWeight: 600, background: 'rgba(251,176,64,.14)', color: '#FBB040' }}>
                            {termOptions.find(t => t.key === selectedTerm)?.short}
                          </span>
                        </div>
                        {cleanDescription && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanDescription}</div>
                        )}
                      </div>

                      <ChevronDown style={{
                        width: 16, height: 16,
                        color: 'rgba(255,255,255,.4)',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform .2s'
                      }} />
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                        <div style={{ display: 'flex', gap: 6, padding: '12px 0', flexWrap: 'wrap' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/teacher/editor/${course.id}`); }}
                            style={{ padding: '6px 12px', borderRadius: 8, background: '#185FA5', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Pencil style={{ width: 11, height: 11 }} /> Sửa bài giảng
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowNewLessonModal(course.id); }}
                            style={{ padding: '6px 12px', borderRadius: 8, background: '#0A3D2E', border: '1px solid rgba(74,222,128,.25)', color: '#4ADEAA', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Plus style={{ width: 11, height: 11 }} /> Thêm bài học
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(course.id); }}
                            disabled={deleting === course.id}
                            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.4)', border: '1px solid rgba(255,255,255,.1)', fontSize: 11, cursor: 'pointer' }}>
                            {deleting === course.id ? '...' : <X style={{ width: 11, height: 11 }} />}
                          </button>
                        </div>

                        {course.children && course.children.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {course.children.map((lesson, idx) => (
                              <div
                                key={lesson.id}
                                onClick={() => router.push(`/teacher/editor/${lesson.id}`)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '10px 12px', borderRadius: 10,
                                  background: 'rgba(255,255,255,.03)',
                                  border: '1px solid rgba(255,255,255,.06)',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', flexShrink: 0 }}>
                                  {idx + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#E2EAF4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
                                </div>
                                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: lesson.isPublished ? 'rgba(74,222,128,.12)' : 'rgba(255,255,255,.06)', color: lesson.isPublished ? '#4ADEAA' : 'rgba(255,255,255,.3)', flexShrink: 0 }}>
                                  {lesson.isPublished ? '✓' : 'Nháp'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
                            Chưa có bài học nào. Bấm "Thêm bài học" để tạo.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      )}

      {/* New Lesson Modal */}
      {showNewLessonModal && (
        <LessonNameModal
          courseTitle={pages.find(p => p.id === showNewLessonModal)?.title || ''}
          onConfirm={(title) => handleCreateLesson(showNewLessonModal, title)}
          onClose={() => setShowNewLessonModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Lesson Name Modal ─────────────────────────────────── */
function LessonNameModal({ courseTitle, onConfirm, onClose }: { 
  courseTitle: string;
  onConfirm: (title: string) => void; 
  onClose: () => void 
}) {
  const [title, setTitle] = useState('');
  const hasValue = title.trim().length > 0;
  const confirm = () => { if (!hasValue) return; onConfirm(title.trim()); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,8,20,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0D1829', border: '1px solid rgba(96,200,255,.25)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(10,61,46,.8)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen style={{ width: 16, height: 16, color: '#4ade80' }} />
            </div>
            <span style={{ fontWeight: 700, color: '#E2EAF4', fontSize: 15 }}>Thêm bài học mới</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
            <X style={{ width: 16, height: 16, color: 'rgba(255,255,255,.4)' }} />
          </button>
        </div>
        <div style={{ marginBottom: 16, padding: 10, borderRadius: 10, background: 'rgba(255,255,255,.04)', fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
          Thuộc khóa học: <strong style={{ color: '#60C8FF' }}>{courseTitle}</strong>
        </div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 8 }}>Tên bài học</label>
        <input
          autoFocus
          style={{ display: 'block', width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: hasValue ? 'rgba(24,95,165,.15)' : 'rgba(255,255,255,.06)', color: '#E2EAF4', border: `1.5px solid ${hasValue ? '#60C8FF' : 'rgba(255,255,255,.15)'}`, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 20 }}
          placeholder="vd: Bài 1 — Đại cương"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirm()}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer' }}>Huỷ</button>
          <button onClick={confirm} disabled={!hasValue} style={{ flex: 2, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, background: hasValue ? '#0A3D2E' : 'rgba(255,255,255,.06)', color: hasValue ? '#7EFFB2' : 'rgba(255,255,255,.25)', border: hasValue ? '1px solid rgba(74,222,128,.3)' : 'none', cursor: hasValue ? 'pointer' : 'not-allowed' }}>
            Vào editor →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Lecture Name Modal ─────────────────────────────────── */
function LectureNameModal({ onConfirm, onClose, subjectOptions, defaultSubject }: {
  onConfirm: (title: string, term: LectureTerm, subject?: string) => void;
  onClose: () => void;
  subjectOptions: string[];
  defaultSubject?: string;
}) {
  const [title, setTitle] = useState('');
  const [term, setTerm] = useState<LectureTerm>('MID_1');
  const [subject, setSubject] = useState(defaultSubject || '');
  const [customTerms, setCustomTerms] = useState<Array<{ key: LectureTerm; label: string; short: string }>>([]);
  const hasValue = title.trim().length > 0;
  useEffect(() => {
    try {
      const savedCustomTerms = localStorage.getItem(CUSTOM_TERM_STORAGE_KEY);
      if (savedCustomTerms) {
        const parsed = JSON.parse(savedCustomTerms);
        if (Array.isArray(parsed)) setCustomTerms(parsed.filter((x) => x?.key && x?.label));
      }
    } catch {}
  }, []);

  const termOptions = [
    ...LECTURE_DEFAULT_TERM_OPTIONS,
    ...customTerms.filter((ct) => !LECTURE_DEFAULT_TERM_OPTIONS.some((d) => d.key === ct.key)),
  ];

  const confirm = () => { if (!hasValue) return; onConfirm(title.trim(), term, subject.trim() || undefined); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,8,20,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0D1829', border: '1px solid rgba(96,200,255,.25)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(10,61,46,.8)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen style={{ width: 16, height: 16, color: '#4ade80' }} />
            </div>
            <span style={{ fontWeight: 700, color: '#E2EAF4', fontSize: 15 }}>Bài giảng mới</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
            <X style={{ width: 16, height: 16, color: 'rgba(255,255,255,.4)' }} />
          </button>
        </div>
        <div style={{ marginBottom: 20, padding: 14, borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#0A3D2E,#1a5c44)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen style={{ width: 18, height: 18, color: 'rgba(255,255,255,.6)' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: hasValue ? '#E2EAF4' : 'rgba(255,255,255,.2)', marginBottom: 2 }}>{hasValue ? title : 'Tên bài giảng...'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>Nháp · Video · Tài liệu · Quiz</div>
          </div>
        </div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 8 }}>Đặt tên bài giảng</label>
        <input
          autoFocus
          style={{ display: 'block', width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: hasValue ? 'rgba(24,95,165,.15)' : 'rgba(255,255,255,.06)', color: '#E2EAF4', border: `1.5px solid ${hasValue ? '#60C8FF' : 'rgba(255,255,255,.15)'}`, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 20 }}
          placeholder="vd: Chương 3 — Động lực học chất điểm"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirm()}
        />
        <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 8 }}>Phân mục học kỳ</label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom: 20 }}>
          {termOptions.map(opt => (
            <button key={opt.key} type="button" onClick={() => setTerm(opt.key)}
              style={{ padding:'8px 10px', borderRadius:10, border:'1px solid rgba(255,255,255,.12)', background:term===opt.key?'rgba(24,95,165,.25)':'rgba(255,255,255,.04)', color:term===opt.key?'#60C8FF':'rgba(255,255,255,.65)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {opt.label}
            </button>
          ))}
        </div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 8 }}>Mon hoc</label>
        {subjectOptions.length > 0 ? (
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,.06)', color: '#E2EAF4', border: '1.5px solid rgba(255,255,255,.15)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 20 }}
          >
            <option value="">Chua phan mon</option>
            {subjectOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        ) : (
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Nhap mon hoc (tuy chon)"
            style={{ display: 'block', width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,.06)', color: '#E2EAF4', border: '1.5px solid rgba(255,255,255,.15)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 20 }}
          />
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer' }}>Huỷ</button>
          <button onClick={confirm} disabled={!hasValue} style={{ flex: 2, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, background: hasValue ? '#0A3D2E' : 'rgba(255,255,255,.06)', color: hasValue ? '#7EFFB2' : 'rgba(255,255,255,.25)', border: hasValue ? '1px solid rgba(74,222,128,.3)' : 'none', cursor: hasValue ? 'pointer' : 'not-allowed' }}>
            Vào editor →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Teacher Schedule View ──────────────────────────────────── */
function TeacherScheduleView({ teacherId, activeClass, onBack }: {
  teacherId: string;
  activeClass: ClassInfo | null;
  onBack: () => void;
}) {
  const [schedules, setSchedules] = useState<{ id: string; title: string; type: string; subject: string | null; date: string; duration: number; meetingUrl?: string | null; class?: { id: string; name: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'lecture', subject: '', date: '', time: '08:00', duration: '45', meetingUrl: '' });

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const classParam = activeClass ? `&classId=${activeClass.id}` : '';
      const res = await fetchWithAuthRetry(`/api/teacher/schedule?teacherId=${teacherId}${classParam}`);
      if (res.ok) setSchedules(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchSchedules(); }, [teacherId, activeClass?.id]);

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    const dateTime = new Date(`${form.date}T${form.time || '08:00'}`);
    try {
      const res = await fetchWithAuthRetry('/api/teacher/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          title: form.title,
          type: form.type,
          subject: form.subject || null,
          date: dateTime.toISOString(),
          duration: parseInt(form.duration) || 45,
          classId: activeClass?.id || null,
          meetingUrl: form.meetingUrl || null,
        }),
      });
      if (res.ok) {
        setForm({ title: '', type: 'lecture', subject: '', date: '', time: '08:00', duration: '45', meetingUrl: '' });
        setShowForm(false);
        fetchSchedules();
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetchWithAuthRetry('/api/teacher/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchSchedules();
    } catch { /* ignore */ }
  };

  const typeLabel = (t: string) => t === 'lecture' ? 'Bài giảng' : t === 'exam' ? 'Kiểm tra' : 'Bài tập';
  const typeColor = (t: string) => t === 'lecture' ? '#60C8FF' : t === 'exam' ? '#FF6B6B' : '#FBB040';

  return (
    <div style={{ animation: 'dashReveal .28s ease both' }}>
      <button onClick={onBack} style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}>
        ← Quay lại
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock style={{ width: 18, height: 18, color: '#60C8FF' }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#E2EAF4' }}>Lịch học</span>
          {activeClass && (
            <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: 'rgba(96,200,255,.15)', color: '#60C8FF', fontWeight: 600 }}>
              {activeClass.name}
            </span>
          )}
        </div>
        <button onClick={() => setShowForm(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: showForm ? 'rgba(255,107,107,.15)' : 'rgba(96,200,255,.15)', border: `1px solid ${showForm ? 'rgba(255,107,107,.3)' : 'rgba(96,200,255,.3)'}`, color: showForm ? '#FF6B6B' : '#60C8FF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {showForm ? <X style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
          {showForm ? 'Đóng' : 'Tạo lịch'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: '#0D1829', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input
              type="text" placeholder="Tên lịch" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ gridColumn: '1/3', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#E2EAF4', fontSize: 13 }}
            />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#E2EAF4', fontSize: 13 }}>
              <option value="lecture">Bài giảng</option>
              <option value="exam">Kiểm tra</option>
              <option value="assignment">Bài tập</option>
            </select>
            <input
              type="text" placeholder="Môn học" value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#E2EAF4', fontSize: 13 }}
            />
            <input
              type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#E2EAF4', fontSize: 13 }}
            />
            <input
              type="time" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#E2EAF4', fontSize: 13 }}
            />
            <input
              type="number" placeholder="Thời lượng (phút)" value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              style={{ gridColumn: '1/3', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#E2EAF4', fontSize: 13 }}
            />
            <input
              type="url" placeholder="Link lớp học (Zoom, Meet...)" value={form.meetingUrl}
              onChange={e => setForm(f => ({ ...f, meetingUrl: e.target.value }))}
              style={{ gridColumn: '1/3', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#E2EAF4', fontSize: 13 }}
            />
          </div>
          <button onClick={handleCreate} disabled={!form.title || !form.date}
            style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: form.title && form.date ? 'pointer' : 'not-allowed', background: form.title && form.date ? '#0A3D2E' : 'rgba(255,255,255,.06)', color: form.title && form.date ? '#7EFFB2' : 'rgba(255,255,255,.25)' }}>
            Tạo lịch
          </button>
        </div>
      )}

      {/* Schedule list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.35)' }}>
          Đang tải...
        </div>
      ) : schedules.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.35)' }}>
          <Clock style={{ width: 40, height: 40, color: 'rgba(255,255,255,.1)', margin: '0 auto 12px' }} />
          <div>Chưa có lịch học nào{activeClass ? ` cho lớp ${activeClass.name}` : ''}.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Bấm "Tạo lịch" để thêm lịch học đầu tiên.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {schedules.map(s => {
            const d = new Date(s.date);
            return (
              <div key={s.id} style={{ background: '#0D1829', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: typeColor(s.type) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 16 }}>{s.type === 'lecture' ? '📖' : s.type === 'exam' ? '📝' : '📋'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E2EAF4', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                    {s.subject && `${s.subject} · `}
                    <span style={{ color: typeColor(s.type), fontWeight: 600 }}>{typeLabel(s.type)}</span>
                    {' · '}
                    {d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    {' · '}
                    {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {s.duration > 0 && ` · ${s.duration} phút`}
                  </div>
                  {s.meetingUrl && (
                    <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#60C8FF', textDecoration: 'underline', marginTop: 2, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🔗 {s.meetingUrl}
                    </a>
                  )}
                </div>
                <button onClick={() => handleDelete(s.id)}
                  style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.2)', color: '#FF6B6B', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                  Xóa
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main dashboard ─────────────────────────────────────────── */
export default function TeacherMainDashboard() {
  const router = useRouter();
  const [user, setUser]           = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView]           = useState<'home' | 'exam' | 'tests' | 'students' | 'lectures' | 'lecture-list' | 'library' | 'schedule'>('home');
  const [examPanel, setExamPanel] = useState<'create' | 'manage'>('create');
  const [classes, setClasses]         = useState<ClassInfo[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [showClassDrop, setShowClassDrop] = useState(false);
  const [showAddClass, setShowAddClass]   = useState(false);
  const [editClassId, setEditClassId]     = useState<string | null>(null);
  const [showFirstSetup, setShowFirstSetup] = useState(false);
  const [stats, setStats]                 = useState<DashStats>({ lectureCount: 0, openExamCount: 0, studentCount: 0 });
  const [pendingCount, setPendingCount]   = useState(0);
  const [showNotifDrop, setShowNotifDrop] = useState(false);
  const [showLectureModal, setShowLectureModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchStats = async (teacherId: string, className: string, classId?: string) => {
    try {
      const params = new URLSearchParams({ teacherId, className });
      if (classId) params.set('classId', classId);
      const res = await fetchWithAuthRetry(`/api/teacher/submissions/stats?${params}`);
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  };

  const fetchPendingCount = useCallback(async (teacherId: string) => {
    try {
      const res = await fetchWithAuthRetry(`/api/teacher/student-requests?teacherId=${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        // API trả về { pending: [...], accepted: [...] }
        setPendingCount((data.pending || []).length);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) { router.push('/auth/login'); return; }
    const u: User = JSON.parse(raw);
    if (u.role !== 'TEACHER' && u.role !== 'ADMIN') { router.push('/student'); return; }
    setUser(u);

    // Fetch classes from DB as source of truth, fallback to localStorage
    const loadClasses = async () => {
      try {
        const res = await fetch(`/api/classes?teacherId=${u.id}`);
        if (res.ok) {
          const dbClasses: ClassInfo[] = await res.json();
          if (dbClasses.length > 0) {
            setClasses(dbClasses);
            localStorage.setItem(`classes_${u.id}`, JSON.stringify(dbClasses));
            const savedActive = localStorage.getItem(`activeClass_${u.id}`) || null;
            const activeId = savedActive || dbClasses[0].id;
            setActiveClassId(activeId);
            const activeClass = dbClasses.find(c => c.id === activeId) || dbClasses[0];
            fetchStats(u.id, activeClass.name, activeClass.id);
            return;
          }
        }
      } catch { /* fallback to localStorage */ }

      // Fallback to localStorage if DB fetch fails or empty
      const saved: ClassInfo[] = JSON.parse(localStorage.getItem(`classes_${u.id}`) || '[]');
      const savedActive = localStorage.getItem(`activeClass_${u.id}`) || null;
      setClasses(saved);
      if (saved.length === 0) setShowFirstSetup(true);
      else {
        const activeId = savedActive || saved[0].id;
        setActiveClassId(activeId);
        const activeClass = saved.find(c => c.id === activeId) || saved[0];
        fetchStats(u.id, activeClass.name, activeClass.id);
      }
    };

    loadClasses();
    fetchPendingCount(u.id);
    setIsLoading(false);
  }, [router, fetchPendingCount]);

  const activeClass = classes.find(c => c.id === activeClassId) || null;

  // Helpers cho class management
  const saveClasses = (newClasses: ClassInfo[]) => {
    setClasses(newClasses);
    if (user) localStorage.setItem(`classes_${user.id}`, JSON.stringify(newClasses));
  };
  const handleAddClass = async (cls: Omit<ClassInfo, 'id'>) => {
    // Save class to database first
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cls.name,
          code: cls.code,
          year: cls.year,
          schoolId: user?.schoolId,
          teacherId: user?.id,
        }),
      });
      
      if (res.ok) {
        const savedClass = await res.json();
        // Use server-returned data (especially the server-generated code)
        const newCls: ClassInfo = { id: savedClass.id, name: savedClass.name, year: savedClass.year || cls.year, code: savedClass.code || cls.code };
        const updated = [...classes, newCls];
        saveClasses(updated);
        setActiveClassId(newCls.id);
        if (user) localStorage.setItem(`activeClass_${user.id}`, newCls.id);
        setShowFirstSetup(false);
        if (user) {
          fetchStats(user.id, newCls.name, newCls.id);
        }
      } else {
        console.error('Failed to save class to database');
        // Fallback to local storage only
        const newCls = { ...cls, id: Date.now().toString() };
        const updated = [...classes, newCls];
        saveClasses(updated);
        setActiveClassId(newCls.id);
        if (user) localStorage.setItem(`activeClass_${user.id}`, newCls.id);
        setShowFirstSetup(false);
        if (user) {
          fetchStats(user.id, newCls.name, newCls.id);
        }
      }
    } catch (error) {
      console.error('Error saving class:', error);
      // Fallback to local storage only
      const newCls = { ...cls, id: Date.now().toString() };
      const updated = [...classes, newCls];
      saveClasses(updated);
      setActiveClassId(newCls.id);
      if (user) localStorage.setItem(`activeClass_${user.id}`, newCls.id);
      setShowFirstSetup(false);
      if (user) {
        fetchStats(user.id, newCls.name, newCls.id);
      }
    }
  };
  const handleEditClass = (id: string, cls: Omit<ClassInfo, 'id'>) => {
    const updated = classes.map(c => c.id === id ? { ...c, ...cls } : c);
    saveClasses(updated);
    if (id === activeClassId && user) {
      fetchStats(user.id, cls.name, id);
    }
    setEditClassId(null);
  };
  const handleLogout = () => {
    clearAuthUser();
    router.push('/auth/login');
  };

  // Lấy môn học từ profile giáo viên để auto-fill
  const teacherSubjects = (() => {
    if (!user?.subjects) return [];
    try { return JSON.parse(user.subjects) as string[]; } catch { return user.subjects ? [user.subjects] : []; }
  })();

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070E1A' }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,.15)', borderTopColor: '#60C8FF', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#070E1A', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes dashReveal { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,.03)', borderBottom: '1px solid rgba(255,255,255,.07)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', height: 52 }}>
          <span style={{ fontWeight: 800, color: '#60C8FF', fontSize: 15, letterSpacing: '-0.02em' }}>Penta</span>
          <span style={{ fontWeight: 800, color: '#E2EAF4', fontSize: 15, letterSpacing: '-0.02em', marginLeft: 2 }}>School</span>

          {/* Class selector */}
          {classes.length > 0 && (
            <div style={{ position: 'relative', marginLeft: 20 }}>
              <button
                onClick={() => setShowClassDrop(!showClassDrop)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#E2EAF4', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {activeClass?.name || 'Chọn lớp'}
                <ChevronDown style={{ width: 13, height: 13, opacity: .5, transform: showClassDrop ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
              {showClassDrop && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, minWidth: 180, background: '#0D1829', border: '1px solid rgba(96,200,255,.2)', borderRadius: 10, overflow: 'hidden', zIndex: 60, boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
                  {classes.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center' }}>
                      <button onClick={() => {
                        setActiveClassId(c.id);
                        setShowClassDrop(false);
                        setView('home');
                        if (user) {
                          localStorage.setItem(`activeClass_${user.id}`, c.id);
                          fetchStats(user.id, c.name, c.id);
                        }
                      }}
                        style={{ flex: 1, textAlign: 'left', padding: '10px 14px', fontSize: 13, background: c.id === activeClassId ? 'rgba(24,95,165,.4)' : 'transparent', color: '#E2EAF4', border: 'none', cursor: 'pointer', fontWeight: c.id === activeClassId ? 700 : 400 }}>
                        Lớp {c.name}
                      </button>
                      <button onClick={() => { setEditClassId(c.id); setShowClassDrop(false); }}
                        style={{ padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', opacity: .4 }}>
                        <Pencil style={{ width: 12, height: 12, color: '#E2EAF4' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Mã lớp hiện tại */}
          {activeClass?.code && (
            <div
              title="Bấm để copy mã lớp"
              onClick={() => {
                const code = activeClass.code!;
                try {
                  if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(code);
                  } else {
                    const ta = document.createElement('textarea');
                    ta.value = code;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                  }
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                } catch { /* ignore */ }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, padding: '4px 12px', background: copiedCode ? 'rgba(34,197,94,.35)' : 'rgba(34,197,94,.18)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 8, cursor: 'pointer', transition: 'background .2s' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>{copiedCode ? '✓ ĐÃ COPY' : 'MÃ LỚP'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', letterSpacing: '0.12em', fontFamily: 'monospace' }}>{activeClass.code}</span>
            </div>
          )}
          {/* Notification bell dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifDrop(v => !v)}
              style={{ position: 'relative', padding: 8, borderRadius: 8, background: pendingCount > 0 ? 'rgba(251,191,36,.15)' : 'none', border: pendingCount > 0 ? '1px solid rgba(251,191,36,.3)' : 'none', cursor: 'pointer', marginRight: 4 }}>
              <Bell style={{ width: 18, height: 18, color: pendingCount > 0 ? '#fbbf24' : 'rgba(255,255,255,.5)' }} />
              {pendingCount > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 8, minWidth: 16, height: 16, borderRadius: 8, background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {pendingCount}
                </span>
              )}
            </button>
            {showNotifDrop && (
              <>
                <div onClick={() => setShowNotifDrop(false)} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
                <div style={{ position: 'absolute', top: '110%', right: 0, width: 280, background: '#0D1829', border: '1px solid rgba(96,200,255,.2)', borderRadius: 12, zIndex: 60, boxShadow: '0 8px 32px rgba(0,0,0,.5)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.07)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '0.08em' }}>THÔNG BÁO</div>
                  {/* 1 - Pending student requests */}
                  <button onClick={() => { setShowNotifDrop(false); setView('students'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: pendingCount > 0 ? 'rgba(251,191,36,.07)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                    <span style={{ fontSize: 18 }}>🟡</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#E2EAF4', fontWeight: pendingCount > 0 ? 600 : 400 }}>
                        {pendingCount > 0 ? `${pendingCount} yêu cầu chờ chấp nhận` : 'Không có yêu cầu mới'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>Quản lý học sinh</div>
                    </div>
                    {pendingCount > 0 && <span style={{ background: '#fbbf24', color: '#0D1829', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{pendingCount}</span>}
                  </button>
                  {/* 2 - Exams closing within 24h */}
                  <button onClick={() => { setShowNotifDrop(false); setView('exam'); setExamPanel('manage'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                    <span style={{ fontSize: 18 }}>🔴</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#E2EAF4' }}>
                        {stats.openExamCount > 0 ? `${stats.openExamCount} đề thi đang mở` : 'Không có đề thi sắp kết thúc'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>Kiểm tra sắp đến hạn</div>
                    </div>
                  </button>
                  {/* 3 - Students not logged in 3 days */}
                  <button onClick={() => { setShowNotifDrop(false); setView('students'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 18 }}>🟠</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#E2EAF4' }}>Học sinh chưa đăng nhập 3+ ngày</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>Xem danh sách học sinh</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={handleLogout} style={{ padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut style={{ width: 16, height: 16, color: 'rgba(255,255,255,.4)' }} />
          </button>
        </div>
      </nav>

      {/* Content */}
      {showFirstSetup ? (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 16px', textAlign: 'center', animation: 'dashReveal .3s ease both' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#E2EAF4', marginBottom: 8 }}>Chào mừng, {user?.name}!</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 28 }}>Thêm lớp học đầu tiên để bắt đầu quản lý bài giảng và đề thi</p>
          {teacherSubjects.length > 0 && (
            <div style={{ display: 'inline-flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              {teacherSubjects.map(s => (
                <span key={s} style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(96,200,255,.15)', color: '#60C8FF', fontSize: 12, fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          )}
          <button onClick={() => setShowAddClass(true)}
            style={{ padding: '12px 28px', borderRadius: 12, background: '#185FA5', color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Plus style={{ width: 16, height: 16 }} /> Thêm lớp đầu tiên
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ animation: 'dashReveal .28s ease both' }}>

{/* Header - Tên và thống kê ngang hàng */}
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginBottom: 2 }}>
        {teacherSubjects.length > 0 ? teacherSubjects.join(' · ') : 'Giáo viên'}
      </div>
      <button onClick={() => setView('home')} style={{ fontSize: 20, fontWeight: 700, color: '#E2EAF4', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>{user?.name}</button>
    </div>
    {/* Thống kê nhỏ gọn ngang hàng tên */}
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(96,200,255,.15)', border: '1px solid rgba(96,200,255,.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#60C8FF' }}>{stats.lectureCount || 0}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)' }}>Bài giảng</div>
      </div>
      <div style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4ADEAA' }}>{stats.studentCount || 0}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)' }}>Học sinh</div>
      </div>
    </div>
  </div>
  <button onClick={() => setShowAddClass(true)}
    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)', fontSize: 12, cursor: 'pointer' }}>
    <Plus style={{ width: 10, height: 10 }} /> Thêm lớp
  </button>
</div>

            {/* HOME */}
            {view === 'home' && (
              <div style={{ animation: 'dashReveal .28s ease both' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Bài giảng', val: stats.lectureCount ?? 0 },
                    { label: 'Đề thi đang mở', val: stats.openExamCount ?? 0 },
                    { label: 'Học sinh liên kết', val: stats.studentCount ?? 0 },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: '#E2EAF4' }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* Pending request notification */}
                {pendingCount > 0 && (
                  <button onClick={() => setView('students')}
                    style={{ width: '100%', textAlign: 'left', marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Bell style={{ width: 16, height: 16, color: '#fbbf24', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>
                        {pendingCount} học sinh đang chờ xác nhận liên kết
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
                        Yêu cầu tự hết hạn sau 24 giờ — bấm để xem
                      </div>
                    </div>
                    <ChevronDown style={{ width: 14, height: 14, color: 'rgba(255,255,255,.3)', transform: 'rotate(-90deg)' }} />
                  </button>
                )}

            {/* Menu chính - Đơn giản hóa */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
              <button onClick={() => setView('lectures')} style={{ background: '#0A3D2E', padding: 20, borderRadius: 16, textAlign: 'left', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 4 }}>Bài giảng</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Tạo và quản lý bài giảng</div>
                </div>
              </button>

              <button onClick={() => { setView('exam'); setExamPanel('create'); }}
                style={{ background: '#0C3B6E', padding: 20, borderRadius: 16, textAlign: 'left', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardCheck style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 4 }}>Kiểm tra</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Tạo thủ công/tự động · Quản lý đề</div>
                </div>
              </button>

              <button onClick={() => setView('students')}
                style={{ background: '#1A3A0A', padding: 20, borderRadius: 16, textAlign: 'left', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 4 }}>Học sinh</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Quản lý liên kết</div>
                </div>
                {pendingCount > 0 && (
                  <div style={{ position: 'absolute', top: 12, right: 12, minWidth: 20, height: 20, borderRadius: 10, background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                    {pendingCount}
                  </div>
                )}
              </button>

              <button onClick={() => { setView('exam'); setExamPanel('manage'); }}
                style={{ background: '#3D0C0C', padding: 20, borderRadius: 16, textAlign: 'left', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart3 style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 4 }}>Kết quả</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Xem điểm số</div>
                </div>
              </button>

              <button onClick={() => setView('library')}
                style={{ background: '#1A1A3A', padding: 20, borderRadius: 16, textAlign: 'left', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Library style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 4 }}>Thư viện</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Chia sẻ tài liệu</div>
                </div>
              </button>

              <button onClick={() => setView('schedule')}
                style={{ background: '#2A1A3A', padding: 20, borderRadius: 16, textAlign: 'left', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 4 }}>Lịch học</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Tạo lịch cho lớp</div>
                </div>
              </button>
            </div>
              </div>
            )}

            {view === 'exam' && (
              <div style={{ animation: 'dashReveal .28s ease both' }}>
                <button onClick={() => setView('home')} style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}>
                  ← Quay lại
                </button>

                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <button
                    onClick={() => setExamPanel('create')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      background: examPanel === 'create' ? '#60C8FF' : 'rgba(255,255,255,.07)',
                      color: examPanel === 'create' ? '#000' : 'rgba(255,255,255,.65)',
                    }}
                  >
                    Tạo bài kiểm tra
                  </button>
                  <button
                    onClick={() => setExamPanel('manage')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      background: examPanel === 'manage' ? '#60C8FF' : 'rgba(255,255,255,.07)',
                      color: examPanel === 'manage' ? '#000' : 'rgba(255,255,255,.65)',
                    }}
                  >
                    Quản lý bài kiểm tra
                  </button>
                </div>

                {examPanel === 'create' ? (
                  <ExamCreator
                    activeClass={activeClass}
                    onBack={() => setView('home')}
                    defaultSubject={teacherSubjects[0]}
                  />
                ) : (
                  <TestManagementModule activeClass={activeClass} teacherId={user?.id || ''} />
                )}
              </div>
            )}

            {view === 'lectures' && user && (
              <TeacherLecturesView
                teacherId={user.id}
                onBack={() => setView('home')}
                onNewLecture={() => setShowLectureModal(true)}
                classes={classes}
                activeClassId={activeClass?.id}
                onLectureDeleted={() => setStats(prev => ({ ...prev, lectureCount: Math.max(0, prev.lectureCount - 1) }))}
              />
            )}

            {view === 'tests' && (
              <div style={{ animation: 'dashReveal .28s ease both' }}>
                <button onClick={() => setView('home')} style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}>
                  ← Quay lại
                </button>
                <div style={{ marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                  Mẹo: mục này đã được gộp vào tab Quản lý bài kiểm tra trong màn hình Kiểm tra.
                </div>
                <TestManagementModule activeClass={activeClass} teacherId={user?.id || ''} />
              </div>
            )}

            {view === 'students' && user && (
              <StudentManagementView
                teacherId={user.id}
                activeClass={activeClass}
                onBack={() => { setView('home'); fetchPendingCount(user.id); }}
              />
            )}

            {view === 'library' && user && (
              <TeacherLibraryView
                teacherId={user.id}
                onBack={() => setView('home')}
                classes={classes}
                activeClass={activeClass}
              />
            )}

            {view === 'schedule' && user && (
              <TeacherScheduleView
                teacherId={user.id}
                activeClass={activeClass}
                onBack={() => setView('home')}
              />
            )}
          </div>
        </div>
      )}

      {showAddClass && <ClassModal onSave={handleAddClass} onClose={() => setShowAddClass(false)} />}
      {editClassId && (
        <ClassModal
          initialName={classes.find(c => c.id === editClassId)?.name}
          onSave={data => handleEditClass(editClassId, data)}
          onClose={() => setEditClassId(null)}
        />
      )}
      {showLectureModal && (
        <LectureNameModal
          onConfirm={async (title, term, subject) => {
            setShowLectureModal(false);
            // Tạo khóa học mới và thêm vào danh sách
            try {
              const slug = `course-${Date.now()}`;
              const res = await fetch('/api/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  title, 
                  slug, 
                  description: `[TERM:${term}]`,
                  subject,
                  authorId: user?.id,
                  classId: activeClass?.id || null,
                  isPublished: false 
                }),
              });
              if (res.ok) {
                const newPage = await res.json();
                router.push(`/teacher/editor/${newPage.id}`);
              }
            } catch (err) {
              console.error('Error creating course:', err);
            }
          }}
          subjectOptions={teacherSubjects}
          defaultSubject={teacherSubjects[0]}
          onClose={() => setShowLectureModal(false)}
        />
      )}
    </div>
  );
}