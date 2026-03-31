"use client";

import { useState, useEffect, useRef } from "react";
import {
  ThumbsUp,
  MessageSquare,
  MoreVertical,
  Send,
  Pin,
  Trash2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  User,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

/* ─── Types ──────────────────────────────────────────────────────── */

interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
  role: "teacher" | "student";
}

interface CommentReply {
  id: string;
  author: CommentAuthor;
  content: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
}

interface Comment {
  id: string;
  author: CommentAuthor;
  content: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
  isPinned: boolean;
  replies: CommentReply[];
  repliesExpanded?: boolean;
}

interface CommentSectionProps {
  pageId: string;
  studentId?: string;
  studentName?: string;
  /** If truthy, the current viewer is a teacher */
  isTeacher?: boolean;
  teacherId?: string;
  teacherName?: string;
}

// Helper to convert API comment to UI comment
function convertApiCommentToUI(apiComment: any, currentAuthorId: string): Comment {
  return {
    id: apiComment.id,
    author: {
      id: apiComment.author.id,
      name: apiComment.author.name,
      role: apiComment.author.role || "student",
    },
    content: apiComment.content,
    createdAt: apiComment.createdAt,
    likes: 0, // Will be implemented later for reactions
    likedByMe: false,
    isPinned: false, // Will be implemented later for admin features
    replies: [],
    repliesExpanded: false,
  };
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function Avatar({ author, size = 9 }: { author: CommentAuthor; size?: number }) {
  const colorMap: Record<string, string> = {
    teacher: "bg-amber-100 text-amber-700",
    student: "bg-indigo-100 text-indigo-700",
  };
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${colorMap[author.role]}`}
    >
      {author.avatar ? (
        <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full object-cover" />
      ) : (
        author.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "teacher" | "student" }) {
  if (role === "teacher") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
        <GraduationCap className="w-3 h-3" />
        Giáo viên
      </span>
    );
  }
  return null;
}

/* ─── Main Component ─────────────────────────────────────────────── */

export default function CommentSection({
  pageId,
  studentId,
  studentName = "Học sinh",
  isTeacher = false,
  teacherId,
  teacherName,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use page ID as block ID for storing page-level comments
  const blockId = `page-${pageId}`;

  const currentAuthor: CommentAuthor = isTeacher
    ? { id: teacherId || "me", name: teacherName || "Giáo viên", role: "teacher" }
    : { id: studentId || "me", name: studentName, role: "student" };

  // Fetch comments on mount
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/comments?blockId=${blockId}`);
        if (!response.ok) throw new Error("Failed to fetch comments");
        const data = await response.json();
        const convertedComments = (data.data || []).map((comment: any) =>
          convertApiCommentToUI(comment, currentAuthor.id)
        );
        setComments(convertedComments);
      } catch (error) {
        console.error("Error fetching comments:", error);
        toast.error("Không thể tải bình luận");
      } finally {
        setIsLoading(false);
      }
    };

    if (blockId) fetchComments();
  }, [blockId, currentAuthor.id]);

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (sortBy === "popular") return b.likes - a.likes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    const authorId = studentId || teacherId;
    if (!authorId) {
      toast.error("Không có ID người dùng");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId,
          authorId,
          content: newComment.trim(),
        }),
      });

      if (!response.ok) {
        let errorMessage = "Không thể gửi bình luận";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const uiComment = convertApiCommentToUI(data.data, authorId);
      setComments((prev) => [uiComment, ...prev]);
      setNewComment("");
      toast.success("Bình luận đã được gửi!");
    } catch (error) {
      console.error("Error adding comment:", error);
      const errorMsg = error instanceof Error ? error.message : "Không thể gửi bình luận";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    // Reply functionality to be implemented later
    toast.error("Tính năng trả lời sẽ được cập nhật sớm");
    return;
  };

  const toggleLike = (commentId: string, replyId?: string) => {
    // Like functionality to be implemented later
    toast.success("Tính năng này sẽ được cập nhật sớm");
  };

  const togglePin = (commentId: string) => {
    if (!isTeacher) return;
    // Pin functionality to be implemented later
    toast.success("Tính năng này sẽ được cập nhật sớm");
  };

  const deleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Đã xóa bình luận");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Không thể xóa bình luận");
    }
  };

  const toggleReplies = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, repliesExpanded: !c.repliesExpanded } : c
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Thảo luận</h2>
          <span className="text-sm text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5 font-medium">
            {comments.length}
          </span>
        </div>
        {/* Sort */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <SortButton active={sortBy === "newest"} label="Mới nhất" onClick={() => setSortBy("newest")} />
          <SortButton active={sortBy === "popular"} label="Phổ biến" onClick={() => setSortBy("popular")} />
        </div>
      </div>

      {/* ── Compose box ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-start gap-3">
          <Avatar author={currentAuthor} size={9} />
          <div className="flex-1 space-y-3">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSubmitComment)}
                placeholder="Đặt câu hỏi hoặc chia sẻ suy nghĩ của bạn... (Ctrl+Enter để gửi)"
                rows={3}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-slate-400 text-slate-800"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Hỏi về bài học, đặt câu hỏi cho thầy/cô hoặc thảo luận với bạn bè
              </span>
              <button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Đang gửi..." : "Gửi"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Comments list ── */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm mt-3">Đang tải bình luận...</p>
        </div>
      ) : !sortedComments.length ? (
        <div className="text-center py-16 text-slate-400 space-y-2">
          <Sparkles className="w-10 h-10 mx-auto text-slate-200" />
          <p className="font-medium">Chưa có bình luận nào</p>
          <p className="text-sm">Hãy là người đầu tiên đặt câu hỏi!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              isTeacher={isTeacher}
              currentAuthorId={currentAuthor.id}
              replyingTo={replyingTo}
              replyText={replyText}
              openMenuId={openMenuId}
              onSetReplyingTo={setReplyingTo}
              onReplyTextChange={setReplyText}
              onReply={handleReply}
              onToggleLike={toggleLike}
              onTogglePin={togglePin}
              onDelete={deleteComment}
              onToggleReplies={toggleReplies}
              onSetOpenMenu={setOpenMenuId}
              onKeyDown={handleKeyDown}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Comment Card ───────────────────────────────────────────────── */

function CommentCard({
  comment,
  isTeacher,
  currentAuthorId,
  replyingTo,
  replyText,
  openMenuId,
  onSetReplyingTo,
  onReplyTextChange,
  onReply,
  onToggleLike,
  onTogglePin,
  onDelete,
  onToggleReplies,
  onSetOpenMenu,
  onKeyDown,
}: {
  comment: Comment;
  isTeacher: boolean;
  currentAuthorId: string;
  replyingTo: string | null;
  replyText: string;
  openMenuId: string | null;
  onSetReplyingTo: (id: string | null) => void;
  onReplyTextChange: (v: string) => void;
  onReply: (id: string) => void;
  onToggleLike: (cId: string, rId?: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleReplies: (id: string) => void;
  onSetOpenMenu: (id: string | null) => void;
  onKeyDown: (e: React.KeyboardEvent, fn: () => void) => void;
}) {
  const canDelete = isTeacher || comment.author.id === currentAuthorId;
  const isReplying = replyingTo === comment.id;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition
        ${comment.isPinned ? "border-amber-200 bg-amber-50/40" : "border-slate-200"}`}
    >
      {/* Pinned banner */}
      {comment.isPinned && (
        <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 font-medium">
          <Pin className="w-3 h-3" />
          Được ghim bởi giáo viên
        </div>
      )}

      <div className="p-5">
        {/* Author row */}
        <div className="flex items-start gap-3">
          <Avatar author={comment.author} size={9} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-800">
                {comment.author.name}
              </span>
              <RoleBadge role={comment.author.role} />
              <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
            </div>

            {/* Content */}
            <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-3">
              {/* Like */}
              <button
                onClick={() => onToggleLike(comment.id)}
                className={`flex items-center gap-1.5 text-xs font-medium transition rounded-lg px-2.5 py-1.5
                  ${comment.likedByMe
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                  }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{comment.likes > 0 ? comment.likes : ""} Hữu ích</span>
              </button>

              {/* Reply */}
              <button
                onClick={() => {
                  onSetReplyingTo(isReplying ? null : comment.id);
                  onReplyTextChange("");
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition rounded-lg px-2.5 py-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Trả lời
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Context menu */}
              {(canDelete || isTeacher) && (
                <div className="relative">
                  <button
                    onClick={() => onSetOpenMenu(openMenuId === comment.id ? null : comment.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === comment.id && (
                    <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 w-44 z-20">
                      {isTeacher && (
                        <button
                          onClick={() => { onTogglePin(comment.id); onSetOpenMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition"
                        >
                          <Pin className="w-4 h-4" />
                          {comment.isPinned ? "Bỏ ghim" : "Ghim bình luận"}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => { onDelete(comment.id); onSetOpenMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                          Xóa bình luận
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reply input */}
        {isReplying && (
          <div className="mt-4 ml-12 flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <textarea
                value={replyText}
                autoFocus
                onChange={(e) => onReplyTextChange(e.target.value)}
                onKeyDown={(e) => onKeyDown(e, () => onReply(comment.id))}
                placeholder="Viết câu trả lời... (Ctrl+Enter để gửi)"
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-indigo-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition placeholder:text-slate-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onReply(comment.id)}
                  disabled={!replyText.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition"
                >
                  <Send className="w-3 h-3" />
                  Gửi
                </button>
                <button
                  onClick={() => onSetReplyingTo(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies.length > 0 && (
          <div className="mt-4 ml-12 space-y-1">
            <button
              onClick={() => onToggleReplies(comment.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              {comment.repliesExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {comment.repliesExpanded
                ? "Ẩn bớt"
                : `${comment.replies.length} câu trả lời`}
            </button>

            {comment.repliesExpanded && (
              <div className="space-y-3 pt-2">
                {comment.replies.map((reply) => (
                  <ReplyCard
                    key={reply.id}
                    reply={reply}
                    onLike={() => onToggleLike(comment.id, reply.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReplyCard({
  reply,
  onLike,
}: {
  reply: CommentReply;
  onLike: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-xl
        ${reply.author.role === "teacher"
          ? "bg-amber-50 border border-amber-100"
          : "bg-slate-50 border border-slate-100"
        }`}
    >
      <Avatar author={reply.author} size={7} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-xs text-slate-800">{reply.author.name}</span>
          <RoleBadge role={reply.author.role} />
          <span className="text-xs text-slate-400">{timeAgo(reply.createdAt)}</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{reply.content}</p>
        <button
          onClick={onLike}
          className={`flex items-center gap-1 mt-2 text-xs font-medium transition
            ${reply.likedByMe ? "text-indigo-600" : "text-slate-400 hover:text-indigo-600"}`}
        >
          <ThumbsUp className="w-3 h-3" />
          {reply.likes > 0 && reply.likes}
        </button>
      </div>
    </div>
  );
}

function SortButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition
        ${active ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
    >
      {label}
    </button>
  );
}
