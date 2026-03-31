'use client';

import { useState, useEffect } from 'react';

interface LibraryFile {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize?: number;
  createdAt: string;
  teacher: { name: string };
  _count: { comments: number };
}

interface LibraryComment {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string; role: string };
}

export default function StudentLibraryViewer() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentFileId, setCommentFileId] = useState<string | null>(null);
  const [comments, setComments] = useState<LibraryComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) return;
    const u = JSON.parse(raw);
    setUserId(u.id);
    fetch(`/api/teacher/library?studentId=${u.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(setFiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openComments = async (fileId: string) => {
    setCommentFileId(fileId);
    setCommentText('');
    const res = await fetch(`/api/teacher/library/comments?fileId=${fileId}`);
    if (res.ok) setComments(await res.json());
  };

  const submitComment = async () => {
    if (!commentFileId || !commentText.trim() || !userId) return;
    const res = await fetch('/api/teacher/library/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: commentFileId, authorId: userId, content: commentText }),
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
  const filesByTeacher = files.reduce<Record<string, LibraryFile[]>>((acc, file) => {
    const teacherName = file.teacher?.name || 'Giáo viên';
    if (!acc[teacherName]) acc[teacherName] = [];
    acc[teacherName].push(file);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-xl mx-auto px-4 py-5">

        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Thư viện tài liệu</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Tài liệu từ giáo viên của bạn</p>
        </div>

        {/* Comment panel */}
        {commentFileId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[70vh] flex flex-col rounded-t-2xl border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                <span className="font-bold text-gray-900 dark:text-white text-sm">Nhận xét</span>
                <button onClick={() => setCommentFileId(null)} className="text-gray-400 text-xl leading-none">×</button>
              </div>
              <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-2">
                {comments.length === 0 && (
                  <p className="text-center text-gray-400 text-sm pt-5">Chưa có nhận xét</p>
                )}
                {comments.map(c => (
                  <div key={c.id} className="bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{c.author.name}</span>
                      <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-slate-200">{c.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitComment()}
                  placeholder="Viết nhận xét..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white outline-none" />
                <button onClick={submitComment} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg">Gửi</button>
              </div>
            </div>
          </div>
        )}

        {loading && <p className="text-center text-gray-400 pt-10 text-sm">Đang tải...</p>}

        {!loading && files.length === 0 && (
          <div className="text-center pt-10">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-gray-600 dark:text-slate-400 font-semibold">Chưa có tài liệu</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Giáo viên của bạn chưa chia sẻ tài liệu nào</p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {Object.entries(filesByTeacher).map(([teacherName, teacherFiles]) => (
            <section key={teacherName} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{teacherName}</h2>
                <span className="text-xs text-gray-500 dark:text-slate-400">{teacherFiles.length} tài liệu</span>
              </div>

              <div className="flex flex-col gap-3">
                {teacherFiles.map(f => (
                  <div key={f.id} className="bg-white dark:bg-slate-900 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-slate-800">
                    <a href={f.fileUrl} download={f.fileName} target="_blank" rel="noreferrer" className="text-3xl shrink-0 no-underline">
                      {typeIcon(f.fileType)}
                    </a>
                    <div className="flex-1 min-w-0">
                      <a href={f.fileUrl} download={f.fileName} target="_blank" rel="noreferrer"
                        className="text-sm font-semibold text-gray-900 dark:text-white no-underline block truncate hover:underline">
                        {f.title}
                      </a>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        {typeLabel(f.fileType)} · {new Date(f.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                      {f.description && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{f.description}</p>
                      )}
                    </div>
                    <button onClick={() => openComments(f.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs shrink-0">
                      💬 {f._count.comments}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
