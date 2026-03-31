"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface IComment {
  id: string;
  blockId: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  replyTo?: {
    id: string;
    content: string;
    author: { name: string };
  } | null;
  replies?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string };
  }>;
}

interface UseCommentsOptions {
  blockId: string;
  authorId: string;
  /** Auto-refresh interval in ms. Default: 12000 (12s). Set 0 to disable. */
  pollingInterval?: number;
}

interface UseCommentsReturn {
  comments: IComment[];
  loading: boolean;
  isSubmitting: boolean;
  error: string | null;
  addComment: (content: string, replyToCommentId?: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<void>;
  refresh: () => Promise<void>;
  formatTime: (dateString: string) => string;
  formatExpiration: (expiresAt: string) => string;
}

export function useComments({
  blockId,
  authorId,
  pollingInterval = 12000,
}: UseCommentsOptions): UseCommentsReturn {
  const [comments, setComments] = useState<IComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track latest comments count to detect new comments during polling
  const lastCountRef = useRef<number>(-1);
  const isMountedRef = useRef(true);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch comments ────────────────────────────────────────────────
  const fetchComments = useCallback(
    async (isInitial = false) => {
      if (!blockId) return;
      if (isInitial) setLoading(true);

      try {
        const res = await fetch(`/api/comments?blockId=${encodeURIComponent(blockId)}`, {
          // Prevent browser caching so polling always gets fresh data
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const fetched: IComment[] = data.data ?? [];

        if (!isMountedRef.current) return;

        setComments(fetched);
        setError(null);

        // Notify if new comments arrived via polling (not initial load)
        if (!isInitial && lastCountRef.current !== -1 && fetched.length > lastCountRef.current) {
          // Could fire a toast here if desired:
          // toast.success(`${fetched.length - lastCountRef.current} bình luận mới`);
        }
        lastCountRef.current = fetched.length;
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : "Không thể tải bình luận";
        if (isInitial) setError(msg);
        // On polling errors, silently ignore to avoid spamming the UI
      } finally {
        if (isMountedRef.current && isInitial) setLoading(false);
      }
    },
    [blockId]
  );

  // ─── Mount / unmount ──────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    lastCountRef.current = -1;

    fetchComments(true);

    // Set up polling
    if (pollingInterval > 0) {
      pollingTimerRef.current = setInterval(() => {
        fetchComments(false);
      }, pollingInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [blockId, pollingInterval, fetchComments]);

  // ─── Add comment ──────────────────────────────────────────────────
  const addComment = useCallback(
    async (content: string, replyToCommentId?: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed || !authorId?.trim()) return false;

      setIsSubmitting(true);
      try {
        const body: Record<string, string> = {
          blockId,
          authorId,
          content: trimmed,
        };
        if (replyToCommentId) body.replyToCommentId = replyToCommentId;

        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Gửi thất bại");
        }

        const data = await res.json();
        const newComment: IComment = data.data;

        // Optimistic update — prepend so it appears at top immediately
        setComments((prev) => [newComment, ...prev]);
        lastCountRef.current = (lastCountRef.current ?? 0) + 1;
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Không thể gửi bình luận";
        setError(msg);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [blockId, authorId]
  );

  // ─── Delete comment ───────────────────────────────────────────────
  const deleteComment = useCallback(async (commentId: string) => {
    // Optimistic removal
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    lastCountRef.current = Math.max(0, (lastCountRef.current ?? 1) - 1);

    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại");
    } catch {
      // Rollback on failure by re-fetching
      fetchComments(false);
    }
  }, [fetchComments]);

  // ─── Manual refresh ───────────────────────────────────────────────
  const refresh = useCallback(() => fetchComments(false), [fetchComments]);

  // ─── Formatters ───────────────────────────────────────────────────
  const formatTime = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  }, []);

  const formatExpiration = useCallback((expiresAt: string): string => {
    const exp = new Date(expiresAt);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();

    if (diffMs <= 0) return "Đã hết hạn";

    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Hết hạn < 1 giờ";
    if (diffHours < 24) return `Hết hạn sau ${diffHours}h`;
    return `Hết hạn sau ${diffDays} ngày`;
  }, []);

  return {
    comments,
    loading,
    isSubmitting,
    error,
    addComment,
    deleteComment,
    refresh,
    formatTime,
    formatExpiration,
  };
}
