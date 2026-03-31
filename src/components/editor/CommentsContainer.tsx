"use client";

import React, { useState, useEffect, useRef } from "react";
import { useComments, IComment } from "@/hooks/useComments";
import { Send, Trash2, Clock, MessageCircle, RefreshCw, Reply, X } from "lucide-react";
import { clsx } from "clsx";

interface CommentsContainerProps {
  blockId: string;
  authorId: string;
  currentUserRole?: string;
  className?: string;
}

const CommentsContainer: React.FC<CommentsContainerProps> = ({
  blockId,
  authorId,
  currentUserRole = "STUDENT",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(null);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!authorId?.trim();

  const {
    comments,
    loading,
    isSubmitting,
    error,
    addComment,
    deleteComment,
    refresh,
    formatTime,
    formatExpiration,
  } = useComments({ blockId, authorId });

  // Badge: unseen comments when panel is closed
  const unseenCount = isOpen ? 0 : Math.max(0, comments.length - lastSeenCount);

  // Mark seen when opening panel
  useEffect(() => {
    if (isOpen) setLastSeenCount(comments.length);
  }, [isOpen, comments.length]);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!isLoggedIn || !newCommentText.trim()) return;
    const ok = await addComment(newCommentText, replyTarget?.id);
    if (ok) {
      setNewCommentText("");
      setReplyTarget(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") setReplyTarget(null);
  };

  return (
    <div ref={panelRef} className={clsx("relative", className)}>
      {/* ── Toggle Button ─────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={clsx(
          "relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200",
          "bg-white dark:bg-gray-800 shadow-sm hover:shadow-md",
          isOpen
            ? "border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-900"
            : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
        )}
        aria-label="Bình luận"
      >
        <MessageCircle
          size={18}
          className={isOpen ? "text-indigo-600" : "text-gray-500 dark:text-gray-400"}
        />
        <span className={clsx("text-sm font-medium", isOpen ? "text-indigo-600" : "text-gray-600 dark:text-gray-300")}>
          Bình luận
        </span>
        {comments.length > 0 && (
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
            {comments.length}
          </span>
        )}
        {/* Unseen badge */}
        {unseenCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {/* ── Comments Panel ────────────────────────────────────── */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[22rem] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[120] flex flex-col overflow-hidden"
          style={{ maxHeight: "min(28rem, 80vh)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold text-sm text-gray-800 dark:text-white">
                Bình luận
              </span>
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                {comments.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Live indicator */}
              <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Tự động cập nhật
              </span>
              <button
                onClick={refresh}
                className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors ml-1"
                title="Làm mới"
              >
                <RefreshCw size={13} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400 border-b border-red-100 dark:border-red-900/30">
              ⚠️ {error}
            </div>
          )}

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Đang tải...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <MessageCircle size={28} strokeWidth={1.5} />
                <span className="text-sm">Chưa có bình luận</span>
                <span className="text-xs text-gray-300 dark:text-gray-600">Hãy là người đầu tiên!</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    authorId={authorId}
                    currentUserRole={currentUserRole}
                    onDelete={deleteComment}
                    onReply={(id, name) => {
                      setReplyTarget({ id, authorName: name });
                      // Focus textarea
                      setTimeout(() => {
                        const ta = document.getElementById("comment-textarea");
                        ta?.focus();
                      }, 50);
                    }}
                    formatTime={formatTime}
                    formatExpiration={formatExpiration}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-3">
            {!isLoggedIn ? (
              <p className="text-center text-xs text-gray-400 py-2">
                Vui lòng đăng nhập để bình luận
              </p>
            ) : (
              <div className="space-y-2">
                {/* Reply target banner */}
                {replyTarget && (
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800">
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                      <Reply size={11} />
                      Trả lời <strong>{replyTarget.authorName}</strong>
                    </span>
                    <button onClick={() => setReplyTarget(null)}>
                      <X size={13} className="text-indigo-400 hover:text-indigo-600" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    id="comment-textarea"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={replyTarget ? "Viết trả lời..." : "Viết bình luận... (Ctrl+Enter)"}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 transition-shadow"
                    rows={2}
                    maxLength={5000}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !newCommentText.trim()}
                    className={clsx(
                      "self-end p-2.5 rounded-xl transition-all",
                      isSubmitting || !newCommentText.trim()
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md active:scale-95"
                    )}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
                <div className="text-right text-[10px] text-gray-300 dark:text-gray-600">
                  {newCommentText.length}/5000
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Comment Item ───────────────────────────────────────────────────────

interface CommentItemProps {
  comment: IComment;
  authorId: string;
  currentUserRole?: string;
  onDelete: (id: string) => void;
  onReply: (id: string, authorName: string) => void;
  formatTime: (d: string) => string;
  formatExpiration: (d: string) => string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  authorId,
  currentUserRole = "STUDENT",
  onDelete,
  onReply,
  formatTime,
  formatExpiration,
}) => {
  const isOwn = authorId === comment.author.id;
  const canDelete = isOwn || currentUserRole === "TEACHER";
  const isTeacher = comment.author.role === "TEACHER";

  return (
    <div className="px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group">
      {/* Reply-to preview */}
      {comment.replyTo && (
        <div className="mb-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
            <span className="font-medium">{comment.replyTo.author.name}: </span>
            {comment.replyTo.content.slice(0, 60)}
            {comment.replyTo.content.length > 60 ? "…" : ""}
          </p>
        </div>
      )}

      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div
          className={clsx(
            "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white",
            isTeacher ? "bg-amber-500" : "bg-indigo-500"
          )}
        >
          {comment.author.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-gray-800 dark:text-white">
              {comment.author.name}
            </span>
            <span
              className={clsx(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                isTeacher
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
              )}
            >
              {isTeacher ? "Giáo viên" : "Học sinh"}
            </span>
            {isOwn && (
              <span className="text-[9px] text-gray-400 dark:text-gray-600">(bạn)</span>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap leading-relaxed">
            {comment.content}
          </p>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-400">{formatTime(comment.createdAt)}</span>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Clock size={9} />
              {formatExpiration(comment.expiresAt)}
            </span>

            {/* Reply button */}
            <button
              onClick={() => onReply(comment.id, comment.author.name)}
              className="text-[10px] text-indigo-400 hover:text-indigo-600 dark:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            >
              <Reply size={10} /> Trả lời
            </button>
          </div>
        </div>

        {/* Delete */}
        {canDelete && (
          <button
            onClick={() => onDelete(comment.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex-shrink-0"
            title="Xóa"
          >
            <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CommentsContainer;