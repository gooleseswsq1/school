"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Volume2, Play, Pause,
  Lightbulb, CheckCircle, ArrowRight, XCircle, RotateCcw,
} from "lucide-react";
import dynamic from "next/dynamic";
import QuizViewer from "./QuizViewer";

const CanvasEditorPro = dynamic(
  () => import("../CanvasEditorPro").then((mod) => ({ default: mod.CanvasEditorPro })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
        Đang tải...
      </div>
    ),
  }
);

import type { CanvasEditorProHandle } from "../CanvasEditorPro";

interface Slide {
  id: string;
  canvasData?: any;
  audioUrl?: string;
  backgroundColor?: string;
  quiz?: { id?: string; title?: string; questions?: any[]; [key: string]: any };
}

interface CanvaSlideViewerProps {
  slidesData?: any;
  blockId: string;
}

// ── Color utilities ──────────────────────────────────────────────────────────

/** Returns true when a hex color is "light" (needs dark text on top) */
function isColorLight(hex?: string): boolean {
  if (!hex) return false;
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived-luminance formula
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/** Returns an rgba string from hex with given alpha */
function hexAlpha(hex?: string, alpha = 0.08): string {
  if (!hex) return "transparent";
  const c = hex.replace("#", "");
  if (c.length < 6) return "transparent";
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CanvaSlideViewer({ slidesData = [], blockId }: CanvaSlideViewerProps) {
  const [slides, setSlides]       = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idx, setIdx]             = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoNextAfterAudio, setAutoNextAfterAudio] = useState(true);

  // "slide" = canvas view  |  "quiz" = quiz screen (replaces canvas)
  const [phase, setPhase] = useState<"slide" | "quiz">("slide");

  // Track answers independently from correctness
  const [submitted, setSubmitted] = useState<Set<string>>(new Set()); // pressed "Kiểm tra"
  const [correct,   setCorrect]   = useState<Set<string>>(new Set()); // got everything right

  // Increment to force QuizViewer remount on retry (fresh internal state)
  const [quizKey, setQuizKey] = useState(0);

  // Countdown to quiz (shown briefly on slide before auto-flipping)
  const [quizCountdown, setQuizCountdown] = useState<number | null>(null);

  const audioRef  = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<CanvasEditorProHandle>(null);

  // ── Parse slides ─────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = typeof slidesData === "string" ? JSON.parse(slidesData) : slidesData;
      const parsedSlides = Array.isArray(raw) ? raw : (Array.isArray(raw?.slides) ? raw.slides : []);
      setSlides(parsedSlides.length > 0 ? parsedSlides : []);
      if (raw && !Array.isArray(raw) && typeof raw.autoNextAfterAudio === "boolean") {
        setAutoNextAfterAudio(raw.autoNextAfterAudio);
      } else {
        setAutoNextAfterAudio(true);
      }
    } catch {
      setSlides([]);
      setAutoNextAfterAudio(true);
    }
    setIsLoading(false);
  }, [slidesData]);

  // ── On slide change: reset phase, run animations, schedule quiz if needed ─
  useEffect(() => {
    setPhase("slide");
    setQuizCountdown(null);

    // Run canvas entry animations shortly after render
    const animTimer = setTimeout(() => canvasRef.current?.runAnimations?.(), 400);

    const slide = slides[idx];
    if (!slide?.quiz || correct.has(slide.id)) {
      // No quiz, or already answered correctly — just enjoy the slide
      return () => clearTimeout(animTimer);
    }

    // Has unanswered quiz:
    // Show a 3-2-1 countdown on the slide, then flip to quiz phase
    const t1 = setTimeout(() => setQuizCountdown(3), 800);
    const t2 = setTimeout(() => setQuizCountdown(2), 1800);
    const t3 = setTimeout(() => setQuizCountdown(1), 2800);
    const t4 = setTimeout(() => {
      setQuizCountdown(null);
      setPhase("quiz");
    }, 3600);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
    // NOTE: `correct` intentionally omitted from deps — only re-run when slide index changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, slides.length]);

  // ── Auto-play audio on slide change ──────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !slides[idx]?.audioUrl) return;
    audio.src = slides[idx].audioUrl!;
    audio.play().catch(() => {});
    const onEnd = () => {
      setIsPlaying(false);
      if (!autoNextAfterAudio) return;

      const currentSlide = slides[idx];
      const shouldBlockByQuiz = !!currentSlide?.quiz && !correct.has(currentSlide.id);
      if (!shouldBlockByQuiz && idx < slides.length - 1) {
        setIdx((i) => i + 1);
      }
    };
    audio.addEventListener("ended", onEnd);
    return () => audio.removeEventListener("ended", onEnd);
  }, [idx, slides, correct, autoNextAfterAudio]);

  // ── Derived values ────────────────────────────────────────────────────────
  const slide      = slides[idx];
  const hasQuiz    = !!slide?.quiz;
  const isSubmitted = slide ? submitted.has(slide.id) : false;
  const isCorrect   = slide ? correct.has(slide.id)   : false;

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (hasQuiz && !isCorrect) {
      // Cancel any pending countdown and jump straight to quiz
      setQuizCountdown(null);
      setPhase("quiz");
      return;
    }
    if (idx < slides.length - 1) setIdx((i) => i + 1);
  }, [hasQuiz, isCorrect, idx, slides.length]);

  const goPrev = useCallback(() => {
    if (idx > 0) setIdx((i) => i - 1);
  }, [idx]);

  // ── Quiz event handlers ───────────────────────────────────────────────────
  const onQuizSubmitted = useCallback(
    (allCorrect: boolean) => {
      if (!slide) return;
      setSubmitted((prev) => new Set([...prev, slide.id]));
      if (allCorrect) setCorrect((prev) => new Set([...prev, slide.id]));
    },
    [slide]
  );

  const onQuizReset = useCallback(() => {
    if (!slide) return;
    // Remove from submitted so the next attempt can update state again
    setSubmitted((prev) => {
      const next = new Set(prev);
      next.delete(slide.id);
      return next;
    });
    // Bump key to fully remount QuizViewer with fresh internal state
    setQuizKey((k) => k + 1);
  }, [slide]);

  const onContinue = useCallback(() => {
    setPhase("slide");
    if (idx < slides.length - 1) setIdx((i) => i + 1);
  }, [idx, slides.length]);

  // ── Slide background → quiz card theming ─────────────────────────────────
  const bgHex       = slide?.backgroundColor;
  const light       = isColorLight(bgHex);
  const headerStyle = bgHex ? { background: bgHex } : undefined;
  // Fallback gradient when no custom color
  const headerCls   = bgHex
    ? (light ? "text-gray-900" : "text-white")
    : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white";
  // Card body: very subtle tint of the slide bg
  const bodyStyle   = bgHex ? { background: hexAlpha(bgHex, 0.06) } : undefined;
  // Border uses a semi-transparent version of the slide color
  const borderStyle = bgHex ? { borderColor: hexAlpha(bgHex, 0.35) } : undefined;

  // ── Thumbnail bar ─────────────────────────────────────────────────────────
  const ThumbnailBar = () => (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300">
      {slides.map((s, i) => {
        const sCorrect   = correct.has(s.id);
        const sSubmitted = submitted.has(s.id);
        // Dot: green = correct, orange = submitted but wrong, violet = has quiz (unattempted)
        const dotCls = s.quiz
          ? sCorrect   ? "bg-green-500"
          : sSubmitted ? "bg-orange-400"
          :               "bg-violet-500 animate-pulse"
          : "";
        return (
          <button
            key={s.id}
            onClick={() => { setIdx(i); setPhase("slide"); }}
            className={`relative flex-shrink-0 w-20 h-12 rounded-lg border-2 transition-all ${
              i === idx
                ? "border-blue-600 bg-blue-50 shadow-md scale-105"
                : "border-gray-300 bg-gray-100 hover:border-blue-400"
            }`}
            title={`Slide ${i + 1}${s.quiz ? (sCorrect ? " · ✓ Đã đúng" : sSubmitted ? " · Chưa đúng" : " · Có quiz") : ""}`}
          >
            <span className="flex items-center justify-center w-full h-full text-xs font-semibold text-gray-700">
              {i + 1}
              {s.quiz && sCorrect && <CheckCircle size={9} className="ml-1 text-green-500" />}
            </span>
            {s.quiz && (
              <span className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${dotCls}`} />
            )}
          </button>
        );
      })}
    </div>
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  if (isLoading || slides.length === 0) {
    return (
      <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border border-gray-300 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-600 font-medium">Chưa có slide nào</p>
        <p className="text-sm text-gray-500">Giáo viên chưa tạo bài trình chiếu</p>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     QUIZ PHASE — full-screen quiz replaces canvas
  ══════════════════════════════════════════════════════════════ */
  if (phase === "quiz" && slide?.quiz) {
    return (
      <div className="w-full">
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Bài Trình Chiếu
        </h3>

        {/* Quiz card — themed from slide backgroundColor */}
        <div
          className="w-full rounded-2xl border-2 overflow-hidden shadow-xl"
          style={{ ...bodyStyle, ...borderStyle }}
        >
          {/* ── Header ── */}
          <div
            className={`px-6 py-4 flex items-center justify-between ${headerCls}`}
            style={headerStyle}
          >
            <div className="flex items-center gap-3">
              <Lightbulb size={22} className="flex-shrink-0" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                  Slide {idx + 1} / {slides.length} · Kiểm tra nhanh
                </p>
                <h4 className="font-bold text-base mt-0.5 leading-tight">
                  {slide.quiz.title || "Trả lời để tiếp tục"}
                </h4>
              </div>
            </div>

            {/* Status badge */}
            {isCorrect ? (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${light ? "bg-black/10 text-gray-800" : "bg-white/25 text-white"}`}>
                <CheckCircle size={14} /> Đúng rồi!
              </span>
            ) : isSubmitted ? (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${light ? "bg-black/10 text-gray-800" : "bg-white/25 text-white"}`}>
                <XCircle size={14} /> Chưa đúng hết
              </span>
            ) : null}
          </div>

          {/* ── Quiz content (always white background for readability) ── */}
          <div className="p-6 bg-white">
            <QuizViewer
              key={quizKey}
              quiz={slide.quiz as any}
              readOnly={false}
              onSubmitted={onQuizSubmitted}
              onReset={onQuizReset}
            />
          </div>

          {/* ── Wrong-answer feedback + retry ── */}
          {isSubmitted && !isCorrect && (
            <div className="px-6 pb-5 pt-1 bg-white border-t border-gray-100">
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <XCircle size={20} className="text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-700">Chưa đúng tất cả!</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Xem lại các câu sai và thử lại để tiếp tục sang slide kế tiếp.
                  </p>
                </div>
                <button
                  onClick={onQuizReset}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-lg transition flex-shrink-0 shadow-sm"
                >
                  <RotateCcw size={13} /> Thử lại
                </button>
              </div>
            </div>
          )}

          {/* ── Correct → continue button ── */}
          {isCorrect && (
            <div className="px-6 pb-6 pt-2 bg-white border-t border-gray-100">
              <button
                onClick={onContinue}
                className={`w-full flex items-center justify-center gap-2 py-3.5 font-bold rounded-xl transition-all shadow-md text-sm text-white active:scale-95 ${!bgHex ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                style={headerStyle}
              >
                {idx < slides.length - 1 ? (
                  <><ArrowRight size={18} /> Tiếp tục slide tiếp theo</>
                ) : (
                  <><CheckCircle size={18} /> Hoàn thành bài học 🎉</>
                )}
              </button>
            </div>
          )}
        </div>

        <ThumbnailBar />

        <p className="mt-3 text-xs text-violet-600 font-semibold">
          💡 Trả lời <strong>đúng tất cả</strong> câu hỏi để sang slide tiếp theo.
        </p>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     SLIDE PHASE — normal canvas view
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Bài Trình Chiếu
      </h3>

      {/* Canvas wrapper */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-gray-300 dark:border-gray-700 flex items-center justify-center group">
        <div className="w-full h-full">
          {slide && typeof window !== "undefined" && (
            <CanvasEditorPro
              ref={canvasRef}
              slideId={slide.id}
              slideData={slide}
              readOnly={true}
              zoom={1}
              onRightPanelToggle={undefined}
              isPresentationMode={false}
            />
          )}
        </div>

        {/* Quiz countdown overlay — counts down before auto-flipping to quiz */}
        {quizCountdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 bg-black/60 backdrop-blur-sm px-6 py-4 rounded-2xl">
              <Lightbulb size={24} className="text-violet-400 animate-pulse" />
              <p className="text-white text-sm font-semibold">Quiz sắp bắt đầu…</p>
              <span className="text-5xl font-black text-violet-300 tabular-nums leading-none">
                {quizCountdown}
              </span>
            </div>
          </div>
        )}

        {/* Nav arrows — appear on hover */}
        <div className="absolute inset-0 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity px-4 pointer-events-none">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="pointer-events-auto w-12 h-12 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goNext}
            className="pointer-events-auto w-12 h-12 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg flex items-center justify-center transition"
            title={hasQuiz && !isCorrect ? "Cần trả lời đúng quiz trước" : "Slide tiếp theo"}
          >
            {/* Lock icon hint when quiz is blocking */}
            {hasQuiz && !isCorrect
              ? <span className="text-lg">🔒</span>
              : <ChevronRight size={24} />
            }
          </button>
        </div>

        {/* Bottom-right: counter + audio badge */}
        <div className="absolute bottom-4 right-4 flex items-center gap-3 bg-black/70 text-white px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm">
          <span className="text-sm font-medium">{idx + 1} / {slides.length}</span>
          {slide?.audioUrl && (
            <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
              <Volume2 size={13} /> Âm thanh
            </span>
          )}
        </div>

        {/* Bottom-left: play + quiz button */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying(true);
              canvasRef.current?.runAnimations?.();
              if (slide?.audioUrl && audioRef.current) {
                audioRef.current.play().catch(() => {});
              } else {
                setTimeout(() => setIsPlaying(false), 3000);
              }
            }}
            disabled={isPlaying}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white rounded-lg transition font-medium shadow-lg text-sm"
          >
            {isPlaying
              ? <><Pause size={15} /> Đang phát…</>
              : <><Play size={15} /> {slide?.audioUrl ? "Phát" : "Hiệu ứng"}</>
            }
          </button>

          {/* Quiz button — always visible when slide has quiz */}
          {hasQuiz && (
            <button
              onClick={() => {
                // Cancel any auto-countdown and flip immediately
                setQuizCountdown(null);
                setPhase("quiz");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium shadow-lg text-sm text-white ${
                isCorrect
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-violet-600 hover:bg-violet-700 ring-2 ring-violet-300 ring-offset-1 ring-offset-transparent"
              }`}
              title={isCorrect ? "Xem lại quiz" : "Làm quiz để sang slide tiếp theo"}
            >
              <Lightbulb size={15} />
              {isCorrect ? "Quiz ✓" : "Làm Quiz"}
            </button>
          )}
        </div>
      </div>

      <ThumbnailBar />

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>Dùng mũi tên hoặc thumbnail để điều hướng.</span>
        {slide?.audioUrl && <span className="text-green-600 font-medium">🔊 Âm thanh tự phát khi chuyển slide.</span>}
        {hasQuiz && !isCorrect && (
          <span className="text-violet-600 font-semibold">
            🔒 Phải trả lời <strong>đúng</strong> quiz để sang slide kế tiếp.
          </span>
        )}
        {hasQuiz && isCorrect && (
          <span className="text-green-600 font-semibold">✅ Quiz hoàn thành!</span>
        )}
      </div>

      {/* Thumbnail legend */}
      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" /> Có quiz (chưa làm)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Đã làm (chưa đúng)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Đúng rồi ✓</span>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}