"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Edit2, Upload as UploadIcon, Plus, Trash2,
  Clock, Lock, Unlock, Play, Zap, Search, CheckCircle2,
  PlusCircle, AlertTriangle, Video, Link2, Save
} from "lucide-react";
import {
  extractYouTubeId,
  extractVimeoId,
  generateVideoEmbedUrl,
  detectVideoPlatform,
} from "@/lib/video-utils";
import toast from "react-hot-toast";
import { createClient } from "@supabase/supabase-js";

/* ─── Types ──────────────────────────────────────────────────────── */

type QuizType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE" | "ESSAY";

export interface VideoInteraction {
  id: string;
  timestamp: number;
  quizId: string;
  quizTitle?: string;
  hint?: string;
  lockVideo?: boolean;
}

interface VideoBlockComponentData {
  videoUrl: string;
  videoType: "youtube" | "vimeo" | "upload";
  poster?: string;
  interactions?: VideoInteraction[];
}

interface VideoBlockProps {
  id: string;
  videoUrl?: string;
  videoType?: string;
  poster?: string;
  interactions?: VideoInteraction[] | string;
  onUpdate: (data: Partial<VideoBlockComponentData>) => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit?: () => void;
  onEditDone?: () => void;
  isEditing?: boolean;
}

interface QuizOption {
  id: string;
  title: string;
  questionCount?: number;
}

interface InteractionResult {
  timestamp: number;
  quizId: string;
  quizTitle: string;
  hint: string;
  lockVideo: boolean;
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

const hmsToSeconds = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;

const secondsToHMS = (total: number) => ({
  h: Math.floor(total / 3600),
  m: Math.floor((total % 3600) / 60),
  s: total % 60,
});

const formatTime = (total: number): string => {
  const { h, m, s } = secondsToHMS(total);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const parseInteractions = (raw: VideoInteraction[] | string | undefined): VideoInteraction[] => {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FORCE_LOCAL_UPLOADS = (() => {
  const v = process.env.NEXT_PUBLIC_FORCE_LOCAL_UPLOADS;
  if (!v) return false;
  const normalized = v.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
})();

async function uploadVideoDirectToSupabase(file: File): Promise<string | null> {
  if (FORCE_LOCAL_UPLOADS) return null;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const signRes = await fetch("/api/storage/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "videos", fileName: file.name }),
  });

  if (!signRes.ok) {
    const e = await signRes.json().catch(() => ({}));
    throw new Error(e?.error || "Không tạo được signed upload URL");
  }

  const signed = await signRes.json();
  
  // Check if we have a valid token
  if (!signed.token) {
    throw new Error("Không nhận được upload token từ server");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "Upload video lên Supabase thất bại");
  }

  // Use the public URL from signed response, or construct it
  return signed.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${signed.bucket}/${signed.path}`;
}

function isStorageSizeLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || "");
  return /maximum allowed size|exceeded the maximum allowed size|too large|payload too large/i.test(msg);
}

/* ═══════════════════════════════════════════════════════════════════
   VideoBlockComponent
═══════════════════════════════════════════════════════════════════ */

export default function VideoBlockComponent({
  id,
  videoUrl,
  videoType,
  poster,
  interactions = [],
  onUpdate,
  onDelete,
  onEdit,
  onEditDone,
  isEditing = false,
}: VideoBlockProps) {
  const [isEdit, setIsEdit] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { setIsEdit(isEditing); }, [isEditing]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const parsedInteractions = parseInteractions(interactions);

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      toast("Nhấn lại để xác nhận xóa", { icon: "⚠️", duration: 3000 });
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setIsSaving(true);
    try { await onDelete(); toast.success("Xóa video thành công"); }
    catch { toast.error("Lỗi khi xóa video"); }
    finally { setIsSaving(false); }
  };

  const closeEdit = () => {
    setIsEdit(false);
    onEditDone?.();
  };

  const handleSave = async (data: Partial<VideoBlockComponentData>) => {
    setIsSaving(true);
    try {
      await onUpdate(data);
      closeEdit();
      toast.success("Lưu thành công");
    } catch { toast.error("Lỗi khi lưu video"); }
    finally { setIsSaving(false); }
  };

  if (!videoUrl || !videoType) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
          <Video className="w-8 h-8 text-slate-300" />
        </div>
        <p className="font-semibold text-slate-700">Chưa có video</p>
        <p className="text-sm text-slate-400">Thêm video từ YouTube, Vimeo hoặc upload file</p>
        {isEdit ? (
          <VideoEditModal
            blockId={id}
            initialUrl="" initialPoster="" initialInteractions={[]}
            onSave={handleSave} onCancel={closeEdit} isSaving={isSaving} inline
          />
        ) : (
          <button onClick={() => { setIsEdit(true); onEdit?.(); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
            <Plus className="w-4 h-4" /> Thêm Video
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group/video">
      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-lg">
        {videoType === "upload" ? (
          <video src={videoUrl} controls poster={poster} className="w-full h-full" />
        ) : (
          <iframe src={videoUrl} className="w-full h-full" frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        )}
        {parsedInteractions.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />{parsedInteractions.length} điểm quiz
          </div>
        )}
      </div>

      {parsedInteractions.length > 0 && (
        <div className="bg-slate-800 rounded-b-xl px-4 py-2 flex items-center gap-2 -mt-1 overflow-x-auto">
          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {[...parsedInteractions].sort((a, b) => a.timestamp - b.timestamp).map((inter) => (
            <div key={inter.id}
              className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-2.5 py-1 text-xs font-medium text-yellow-300">
              <Play className="w-3 h-3" />
              <span>{formatTime(inter.timestamp)}</span>
              <span className="opacity-50">·</span>
              <span className="max-w-[120px] truncate">{inter.quizTitle || "Quiz"}</span>
              {inter.lockVideo && <Lock className="w-3 h-3 text-orange-400" />}
            </div>
          ))}
        </div>
      )}

      {isEdit && (
        <VideoEditModal
          blockId={id}
          initialUrl={videoUrl} initialPoster={poster || ""} initialInteractions={parsedInteractions}
          onSave={handleSave} onCancel={closeEdit} isSaving={isSaving}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VideoEditModal
═══════════════════════════════════════════════════════════════════ */

interface VideoEditModalProps {
  blockId: string;
  initialUrl: string;
  initialPoster: string;
  initialInteractions: VideoInteraction[];
  onSave: (data: Partial<VideoBlockComponentData>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  inline?: boolean;
}

function VideoEditModal({
  blockId, initialUrl, initialPoster, initialInteractions,
  onSave, onCancel, isSaving, inline = false,
}: VideoEditModalProps) {
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [posterUrl, setPosterUrl] = useState(initialPoster);
  const [inputMode, setInputMode] = useState<"url" | "file">("url");
  const [interactions, setInteractions] = useState<VideoInteraction[]>(initialInteractions);
  const [availableQuizzes, setAvailableQuizzes] = useState<QuizOption[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  // null = form hidden, "new" = adding, VideoInteraction = editing
  const [activeInteraction, setActiveInteraction] = useState<VideoInteraction | "new" | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingQuizzes(true);
    fetch("/api/quiz")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const quizzes: QuizOption[] = [];
        const seen = new Set<string>();
        const add = (q: any) => {
          if (q?.id && !seen.has(q.id)) {
            seen.add(q.id);
            quizzes.push({ id: q.id, title: q.title || `Quiz ${q.id.slice(0, 6)}`, questionCount: q.questions?.length });
          }
        };
        if (Array.isArray(data)) data.forEach((item: any) => { add(item); item.quizzes?.forEach(add); });
        setAvailableQuizzes(quizzes);
      })
      .catch(() => {})
      .finally(() => setLoadingQuizzes(false));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("video/")) { toast.error("Vui lòng chọn file video"); return; }

    const maxVideoMb = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB || 50);
    if (file.size > maxVideoMb * 1024 * 1024) {
      toast.error(`Video vượt quá giới hạn ${maxVideoMb}MB. Vui lòng nén file hoặc tăng giới hạn bucket storage.`);
      return;
    }

    const loadingId = toast.loading("Đang upload video...");
    try {
      let url: string | null = null;

      // Preferred path: direct upload to Supabase via signed URL (avoids Vercel body limits)
      try {
        url = await uploadVideoDirectToSupabase(file);
      } catch (directErr) {
        if (isStorageSizeLimitError(directErr)) {
          throw new Error("Video vượt quá giới hạn dung lượng của Storage. Hãy tăng file size limit trên Supabase bucket hoặc giảm dung lượng video.");
        }
        console.warn("Direct upload failed, fallback to /api/videos:", directErr);
      }

      // Fallback path: upload through API route (works for small files/local dev)
      if (!url) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/videos", { method: "POST", body: fd });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e?.error || "Upload video thất bại");
        }
        const data = await res.json();
        url = data.url as string;
      }

      setInputUrl(url); setInputMode("file");
      setUploadedFileName(file.name);
      toast.dismiss(loadingId);
      toast.success("Upload thành công");
    } catch (err: any) {
      toast.dismiss(loadingId);
      toast.error(err?.message || "Upload thất bại");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) { toast.error("Vui lòng nhập URL hoặc upload video"); return; }
    let urlToSave = inputUrl, typeToSave: any = "upload";
    if (inputMode === "url") {
      const platform = detectVideoPlatform(inputUrl);
      if (!platform) { toast.error("URL không hợp lệ"); return; }
      if (platform === "youtube") { const i = extractYouTubeId(inputUrl); if (i) urlToSave = generateVideoEmbedUrl(i, "youtube"); }
      else if (platform === "vimeo") { const i = extractVimeoId(inputUrl); if (i) urlToSave = generateVideoEmbedUrl(i, "vimeo"); }
      typeToSave = platform;
    }
    await onSave({ videoUrl: urlToSave, videoType: typeToSave, poster: posterUrl || undefined, interactions });
  };

  const handleInteractionSaved = (result: InteractionResult, editingId?: string) => {
    if (editingId) {
      setInteractions(prev => prev.map(i => i.id === editingId ? { ...i, ...result } : i));
      toast.success("Đã cập nhật điểm dừng");
    } else {
      setInteractions(prev => [...prev, { id: `inter-${Date.now()}`, ...result }]);
      toast.success("Đã thêm điểm dừng ✓");
    }
    setActiveInteraction(null);
  };

  const handleQuizCreated = (quiz: any) => {
    const opt: QuizOption = { id: quiz.id, title: quiz.title || "Quiz mới", questionCount: quiz.questions?.length };
    setAvailableQuizzes(prev => (prev.some(q => q.id === opt.id) ? prev : [opt, ...prev]));
  };

  const sortedInteractions = [...interactions].sort((a, b) => a.timestamp - b.timestamp);

  const body = (
    <div className={`space-y-5 ${inline ? "p-4 bg-blue-50 border border-blue-200 rounded-xl mt-4 text-left" : "p-6 overflow-y-auto max-h-[68vh]"}`}>

      {/* Video source */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nguồn Video</p>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {(["url", "file"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setInputMode(m)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition
                ${inputMode === m ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {m === "url" ? <Link2 className="w-4 h-4" /> : <UploadIcon className="w-4 h-4" />}
              {m === "url" ? "Link URL" : "Upload File"}
            </button>
          ))}
        </div>
        {inputMode === "url" ? (
          <input type="text" placeholder="Dán link YouTube, Vimeo hoặc .mp4..."
            value={inputUrl} onChange={(e) => setInputUrl(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 bg-white" />
        ) : (
          <label className={`flex items-center justify-center gap-3 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer bg-white ${uploadedFileName ? 'border-green-300 bg-green-50/70' : 'border-indigo-200 hover:bg-indigo-50'}`}>
            <UploadIcon className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-medium text-slate-600">{inputUrl ? "✓ Đã tải video thành công — click để đổi" : "Chọn file video"}</span>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
          </label>
        )}
        {uploadedFileName && (
          <p className="text-xs text-green-700 font-medium">Đã tải lên: {uploadedFileName}</p>
        )}
        <input type="text" placeholder="URL thumbnail (tùy chọn)"
          value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)}
          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 bg-white" />
      </div>

      {/* Interactions */}
      <div className="space-y-3 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm Dừng Quiz</p>
            <p className="text-xs text-slate-400 mt-0.5">Video tự tạm dừng và hiển thị câu hỏi</p>
          </div>
          {activeInteraction === null && (
            <button type="button" onClick={() => setActiveInteraction("new")}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition">
              <Plus className="w-3.5 h-3.5" /> Thêm điểm dừng
            </button>
          )}
        </div>

        {activeInteraction !== null && (
          <InteractionFormPanel
            blockId={blockId}
            key={activeInteraction === "new" ? "new" : (activeInteraction as VideoInteraction).id}
            initial={activeInteraction === "new" ? undefined : activeInteraction as VideoInteraction}
            availableQuizzes={availableQuizzes}
            loadingQuizzes={loadingQuizzes}
            onSaved={(result) => handleInteractionSaved(
              result,
              activeInteraction === "new" ? undefined : (activeInteraction as VideoInteraction).id
            )}
            onQuizCreated={handleQuizCreated}
            onClose={() => setActiveInteraction(null)}
          />
        )}

        {sortedInteractions.length > 0 ? (
          <div className="space-y-2">
            {sortedInteractions.map((inter) => (
              <div key={inter.id}
                className="flex items-center gap-3 p-3.5 bg-white border-2 border-slate-200 rounded-xl group/item hover:border-indigo-200 transition">
                <div className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono">
                  <Play className="w-3 h-3" />{formatTime(inter.timestamp)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {inter.quizTitle || availableQuizzes.find(q => q.id === inter.quizId)?.title || "Quiz"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {inter.lockVideo
                      ? <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 rounded-full px-2 py-0.5"><Lock className="w-3 h-3" /> Khóa</span>
                      : <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded-full px-2 py-0.5"><Unlock className="w-3 h-3" /> Không khóa</span>
                    }
                    {inter.hint && <span className="text-xs text-slate-400 truncate max-w-[140px]">💡 {inter.hint}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition">
                  <button type="button" onClick={() => setActiveInteraction(inter)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => setInteractions(prev => prev.filter(i => i.id !== inter.id))}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          activeInteraction === null && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <Zap className="w-5 h-5 text-slate-300 flex-shrink-0" />
              <p className="text-sm text-slate-400">Chưa có điểm dừng nào.</p>
            </div>
          )
        )}
      </div>
    </div>
  );

  const footer = (
    <div className={`flex gap-3 ${inline ? "mt-4" : "px-6 py-4 bg-slate-50 border-t border-slate-200"}`}>
      <button type="button" onClick={onCancel}
        className="px-5 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-xl hover:bg-white transition">Hủy</button>
      <button type="submit" disabled={isSaving || !inputUrl}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition shadow-md shadow-indigo-200">
        <Save className="w-4 h-4" />{isSaving ? "Đang lưu..." : "Lưu Video"}
      </button>
    </div>
  );

  if (inline) {
    return <form onSubmit={handleSubmit}>{body}{footer}</form>;
  }
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Chỉnh sửa Video</h3>
          <button type="button" onClick={onCancel} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/20"><X className="w-5 h-5" /></button>
        </div>
        {body}{footer}
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   InteractionFormPanel
   ✅ 100% self-contained — all state lives here
   ✅ Time = 3 number inputs (giờ / phút / giây)
   ✅ Inline red error messages under each invalid field
   ✅ Save button ALWAYS enabled, validation runs on click
═══════════════════════════════════════════════════════════════════ */

interface InteractionFormPanelProps {
  blockId: string;
  initial?: VideoInteraction;
  availableQuizzes: QuizOption[];
  loadingQuizzes: boolean;
  onSaved: (result: InteractionResult) => void;
  onQuizCreated: (quiz: any) => void;
  onClose: () => void;
}

function InteractionFormPanel({
  blockId, initial, availableQuizzes, loadingQuizzes, onSaved, onQuizCreated, onClose,
}: InteractionFormPanelProps) {
  const init = initial ? secondsToHMS(initial.timestamp) : { h: 0, m: 0, s: 0 };

  const [hours, setHours] = useState(init.h);
  const [minutes, setMinutes] = useState(init.m);
  const [seconds, setSeconds] = useState(init.s);
  const [selectedQuizId, setSelectedQuizId] = useState(initial?.quizId ?? "");
  const [hint, setHint] = useState(initial?.hint ?? "");
  const [lockVideo, setLockVideo] = useState(initial?.lockVideo ?? true);
  const [quizPickerMode, setQuizPickerMode] = useState<"select" | "create">("select");
  const [quizSearch, setQuizSearch] = useState("");
  const [errors, setErrors] = useState<{ time?: string; quiz?: string }>({});
  const [localQuizzes, setLocalQuizzes] = useState<QuizOption[]>(availableQuizzes);

  // Sync when parent loads quizzes
  useEffect(() => { setLocalQuizzes(availableQuizzes); }, [availableQuizzes]);

  const isEditing = !!initial;
  const totalSeconds = hmsToSeconds(hours, minutes, seconds);

  const handleSave = () => {
    const errs: { time?: string; quiz?: string } = {};
    if (totalSeconds === 0) errs.time = "Thời điểm không thể là 0:00 — hãy nhập phút hoặc giây";
    if (!selectedQuizId) errs.quiz = "Chưa chọn quiz — hãy chọn một quiz hoặc tạo mới";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const quizTitle = localQuizzes.find(q => q.id === selectedQuizId)?.title ?? "Quiz";
    onSaved({ timestamp: totalSeconds, quizId: selectedQuizId, quizTitle, hint, lockVideo });
  };

  const handleQuizCreated = (quiz: any) => {
    const opt: QuizOption = { id: quiz.id, title: quiz.title || "Quiz mới", questionCount: quiz.questions?.length };
    setLocalQuizzes(prev => [opt, ...prev]);
    setSelectedQuizId(quiz.id);
    setQuizPickerMode("select");
    setErrors(e => ({ ...e, quiz: undefined }));
    onQuizCreated(quiz);
    toast.success(`✓ Quiz "${opt.title}" đã tạo & liên kết!`);
  };

  const filteredQuizzes = localQuizzes.filter(q =>
    q.title.toLowerCase().includes(quizSearch.toLowerCase())
  );

  return (
    <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-600">
        <span className="text-white font-bold text-sm">
          {isEditing ? "✏️ Chỉnh sửa điểm dừng" : "➕ Thêm điểm dừng Quiz"}
        </span>
        <button type="button" onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/20">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Time picker: 3 number inputs ── */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Thời điểm dừng video
          </label>

          <div className="flex items-end gap-2">
            {[
              { label: "giờ", value: hours, max: 23, set: setHours },
              { label: "phút", value: minutes, max: 59, set: setMinutes },
              { label: "giây", value: seconds, max: 59, set: setSeconds },
            ].map(({ label, value, max, set }, idx) => (
              <div key={label} className="flex items-end gap-1">
                {idx > 0 && <span className="text-2xl font-bold text-indigo-400 mb-2.5">:</span>}
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={max}
                    value={value === 0 ? "" : value}
                    placeholder="0"
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(max, parseInt(e.target.value) || 0));
                      set(v);
                      setErrors(er => ({ ...er, time: undefined }));
                    }}
                    className={`w-16 text-center px-2 py-2.5 border-2 rounded-xl text-xl font-bold font-mono text-gray-900 focus:outline-none transition bg-white
                      ${errors.time ? "border-red-400 focus:border-red-500" : "border-indigo-200 focus:border-indigo-500"}`}
                  />
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                </div>
              </div>
            ))}

            {/* Preview */}
            <div className="ml-3 flex flex-col items-center gap-1 pb-0.5">
              <div className={`px-3 py-2.5 rounded-xl font-mono font-bold text-sm ${totalSeconds > 0 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                {formatTime(totalSeconds)}
              </div>
              <span className="text-xs text-slate-400">xem trước</span>
            </div>
          </div>

          {errors.time && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {errors.time}
            </div>
          )}
        </div>

        {/* ── Quiz picker ── */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Bộ câu hỏi
          </label>

          <div className="flex bg-white border-2 border-indigo-200 rounded-xl p-1 gap-1">
            <button type="button" onClick={() => setQuizPickerMode("select")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition
                ${quizPickerMode === "select" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <Search className="w-3.5 h-3.5" /> Chọn có sẵn
            </button>
            <button type="button" onClick={() => setQuizPickerMode("create")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition
                ${quizPickerMode === "create" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <PlusCircle className="w-3.5 h-3.5" /> Tạo mới
            </button>
          </div>

          {quizPickerMode === "select" && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="Tìm quiz..." value={quizSearch}
                  onChange={(e) => setQuizSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 bg-white rounded-xl text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
              </div>

              {loadingQuizzes ? (
                <div className="text-center py-5">
                  <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Đang tải danh sách quiz...</p>
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="text-center py-5 space-y-2">
                  <AlertTriangle className="w-7 h-7 text-slate-200 mx-auto" />
                  <p className="text-xs text-slate-400">{quizSearch ? `Không tìm thấy "${quizSearch}"` : "Chưa có quiz nào"}</p>
                  <button type="button" onClick={() => setQuizPickerMode("create")}
                    className="text-xs text-indigo-600 font-bold hover:text-indigo-800">→ Tạo quiz mới ngay</button>
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1 rounded-xl border border-slate-200 bg-white p-1">
                  {filteredQuizzes.map((quiz, index) => {
                    const sel = selectedQuizId === quiz.id;
                    return (
                      <button key={`${quiz.id}-${index}`} type="button"
                        onClick={() => { setSelectedQuizId(quiz.id); setErrors(e => ({ ...e, quiz: undefined })); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition
                          ${sel ? "bg-indigo-600 text-white" : "hover:bg-indigo-50"}`}>
                        <div className={`w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center
                          ${sel ? "border-white" : "border-slate-300"}`}>
                          {sel && <CheckCircle2 className="w-4 h-4 text-white fill-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${sel ? "text-white" : "text-gray-900"}`}>{quiz.title}</p>
                          {quiz.questionCount !== undefined && (
                            <p className={`text-xs ${sel ? "text-white/70" : "text-slate-400"}`}>{quiz.questionCount} câu hỏi</p>
                          )}
                        </div>
                        {sel && <span className="text-xs text-white font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedQuizId && (
                <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-xs text-green-800 font-semibold">
                    Đã liên kết: {localQuizzes.find(q => q.id === selectedQuizId)?.title}
                  </p>
                </div>
              )}
            </div>
          )}

          {quizPickerMode === "create" && (
            <div className="rounded-xl overflow-hidden border-2 border-indigo-200">
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-100 border-b border-indigo-200">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-700">Tạo quiz mới → tự động liên kết</span>
              </div>
              <InlineQuizCreator blockId={blockId} onCreated={handleQuizCreated} onCancel={() => setQuizPickerMode("select")} />
            </div>
          )}

          {errors.quiz && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {errors.quiz}
            </div>
          )}
        </div>

        {/* ── Lock toggle ── */}
        <button type="button" onClick={() => setLockVideo(v => !v)}
          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition text-left
            ${lockVideo ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
            ${lockVideo ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}>
            {lockVideo ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </div>
          <div>
            <p className={`text-sm font-semibold ${lockVideo ? "text-orange-800" : "text-slate-700"}`}>
              {lockVideo ? "Khóa video đến khi trả lời đúng" : "Video tiếp tục sau khi đóng quiz"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Nhấn để thay đổi</p>
          </div>
        </button>

        {/* ── Hint ── */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gợi ý khi sai (tùy chọn)</label>
          <input type="text" placeholder="VD: Xem lại đoạn 1:00–2:00"
            value={hint} onChange={(e) => setHint(e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-slate-200 bg-white rounded-xl text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
        </div>

        {/* ── Save ── */}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-xl hover:bg-white transition">
            Hủy
          </button>
          {/* ✅ Always enabled — validation runs onClick and shows inline errors */}
          <button type="button" onClick={handleSave}
            className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
            {isEditing ? "✓ Cập nhật điểm dừng" : "✓ Lưu điểm dừng"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   InlineQuizCreator
═══════════════════════════════════════════════════════════════════ */

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];
const TYPE_LABELS: Record<QuizType, string> = {
  SINGLE: "Trắc nghiệm", MULTIPLE: "Nhiều đáp án", TRUE_FALSE: "Đúng/Sai", ESSAY: "Tự luận",
};

function getDefaultOpts(type: QuizType): { optionText: string; isCorrect: boolean }[] {
  if (type === "TRUE_FALSE") return [{ optionText: "Đúng", isCorrect: true }, { optionText: "Sai", isCorrect: false }];
  if (type === "ESSAY") return [];
  return Array.from({ length: 4 }, () => ({ optionText: "", isCorrect: false }));
}

interface SimpleQuestion {
  questionText: string;
  questionType: QuizType;
  options: { optionText: string; isCorrect: boolean }[];
}

function InlineQuizCreator({ blockId, onCreated, onCancel }: { blockId: string; onCreated: (q: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<SimpleQuestion[]>([]);
  const [currentType, setCurrentType] = useState<QuizType>("SINGLE");
  const [isSaving, setIsSaving] = useState(false);

  const addQ = () => setQuestions(p => [...p, { questionText: "", questionType: currentType, options: getDefaultOpts(currentType) }]);

  const updateQText = (i: number, text: string) =>
    setQuestions(p => { const n = [...p]; n[i] = { ...n[i], questionText: text }; return n; });

  const updateOpt = (qi: number, oi: number, field: "optionText" | "isCorrect", val: any) =>
    setQuestions(p => {
      const n = [...p];
      const opts = [...n[qi].options];
      if (field === "isCorrect" && val && n[qi].questionType === "SINGLE") opts.forEach((_, i) => { opts[i] = { ...opts[i], isCorrect: false }; });
      opts[oi] = { ...opts[oi], [field]: val };
      n[qi] = { ...n[qi], options: opts };
      return n;
    });

  const save = async () => {
    if (!questions.length) { toast.error("Thêm ít nhất 1 câu hỏi"); return; }
    if (questions.some(q => !q.questionText.trim())) { toast.error("Nhập nội dung tất cả câu hỏi"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, title: title.trim() || "Quiz video", questions }),
      });
      if (!res.ok) throw new Error();
      onCreated(await res.json());
    } catch { toast.error("Lỗi khi tạo quiz"); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="p-4 space-y-3 bg-white">
      <input type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Tên quiz..."
        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />

      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(TYPE_LABELS) as QuizType[]).map(t => (
          <button key={t} type="button" onClick={() => setCurrentType(t)}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border-2 transition
              ${currentType === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
            {TYPE_LABELS[t]}
          </button>
        ))}
        <button type="button" onClick={addQ}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ml-auto">
          <Plus className="w-3.5 h-3.5" /> + Thêm câu
        </button>
      </div>

      {questions.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Chọn loại câu hỏi rồi nhấn "+ Thêm câu"
        </p>
      ) : (
        <div className="space-y-3 max-h-52 overflow-y-auto">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center justify-center flex-shrink-0">{qi + 1}</span>
                <input type="text" value={q.questionText} onChange={e => updateQText(qi, e.target.value)}
                  placeholder="Nội dung câu hỏi..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 bg-white" />
                <button type="button" onClick={() => setQuestions(p => p.filter((_, i) => i !== qi))}
                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
              {q.questionType !== "ESSAY" && (
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition
                      ${opt.isCorrect ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"}`}>
                      <button type="button" onClick={() => updateOpt(qi, oi, "isCorrect", !opt.isCorrect)}
                        className={`w-6 h-6 flex-shrink-0 rounded flex items-center justify-center text-xs font-bold border-2 transition
                          ${opt.isCorrect ? "bg-green-500 border-green-500 text-white" : "border-slate-300 text-slate-400 hover:border-green-400"}`}>
                        {opt.isCorrect ? "✓" : OPTION_LETTERS[oi] ?? oi + 1}
                      </button>
                      {q.questionType === "TRUE_FALSE" ? (
                        <span className="text-sm font-medium text-gray-900">{opt.optionText}</span>
                      ) : (
                        <input type="text" value={opt.optionText} onChange={e => updateOpt(qi, oi, "optionText", e.target.value)}
                          placeholder={`Đáp án ${OPTION_LETTERS[oi] ?? oi + 1}...`}
                          className="flex-1 text-sm font-medium text-gray-900 placeholder:text-slate-400 bg-transparent focus:outline-none" />
                      )}
                    </div>
                  ))}
                  {q.questionType !== "TRUE_FALSE" && q.options.length < 5 && (
                    <button type="button" onClick={() => updateOpt(qi, q.options.length, "optionText", "")}
                      className="text-xs text-indigo-600 font-medium hover:text-indigo-800 pl-1">+ Thêm đáp án</button>
                  )}
                </div>
              )}
              {q.questionType === "ESSAY" && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">Học sinh tự nhập câu trả lời</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-medium rounded-xl hover:bg-slate-50">← Quay lại</button>
        <button type="button" onClick={save} disabled={isSaving || !questions.length}
          className="flex-1 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 shadow shadow-green-200">
          {isSaving ? "Đang tạo..." : "✓ Tạo quiz & liên kết ngay"}
        </button>
      </div>
    </div>
  );
}