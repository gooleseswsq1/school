"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, Circle, Award, RotateCcw,
  Eye, EyeOff, AlignLeft, ToggleLeft, ListChecks, CheckSquare,
  GraduationCap, User
} from "lucide-react";
import LaTeXRenderer from "@/components/latex/LaTeXRenderer";
import InlineContentRenderer from "@/components/latex/InlineContentRenderer";

export type QuizType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE" | "ESSAY";

interface QuestionOption { id: string; optionText: string; isCorrect: boolean; }
interface Question {
  id: string; questionText: string; questionType?: QuizType;
  options: QuestionOption[]; essayAnswer?: string; explanation?: string; order: number;
  images?: string[]; // base64 data URIs for block-level images
  inlineImages?: string[]; // base64 data URIs for inline formula images referenced by {{INLINE_IMG:N}} in text
}
interface Quiz { id: string; title?: string; questions: Question[]; }

interface QuizViewerProps {
  quiz: Quiz;
  readOnly?: boolean;
  isTeacher?: boolean;
  isOverlay?: boolean;
  overlayOpacity?: number;
  /** Called when student submits — passes whether ALL gradable questions were correct */
  onSubmitted?: (allCorrect: boolean) => void;
  /** Called when student clicks "Làm lại" (reset) — allows parent to re-enable gating */
  onReset?: () => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function getQuizType(q: Question): QuizType {
  if (q.questionType) {
    // Normalize to uppercase so DB values like "multiple", "single", "true_false" work
    const normalized = q.questionType.toUpperCase() as QuizType;
    if (normalized === "SINGLE" || normalized === "MULTIPLE" || normalized === "TRUE_FALSE" || normalized === "ESSAY") {
      return normalized;
    }
    // Legacy DB value "multiple" → MULTIPLE, etc.
    if (q.questionType.toLowerCase() === "multiple") return "MULTIPLE";
    if (q.questionType.toLowerCase() === "single")   return "SINGLE";
    if (q.questionType.toLowerCase().includes("false") || q.questionType.toLowerCase().includes("true")) return "TRUE_FALSE";
    if (q.questionType.toLowerCase() === "essay")    return "ESSAY";
  }
  if (!q.options?.length) return "ESSAY";
  if (q.options.length === 2) return "TRUE_FALSE";
  return q.options.filter((o) => o.isCorrect).length > 1 ? "MULTIPLE" : "SINGLE";
}

function TypeBadge({ type, glass }: { type: QuizType; glass?: boolean }) {
  // Use a string-keyed map so we can safely handle any casing coming from DB
  // (e.g. "multiple", "single", "true_false") without a runtime crash.
  const map: Record<string, { label: string; solid: string; glassy: string; icon: React.ReactNode }> = {
    SINGLE:     { label: "Trắc nghiệm",  solid: "bg-blue-50 text-blue-700 border-blue-200",            glassy: "bg-blue-500/20 text-blue-100 border-blue-400/30",        icon: <CheckSquare className="w-3 h-3" /> },
    MULTIPLE:   { label: "Nhiều đáp án", solid: "bg-indigo-50 text-indigo-700 border-indigo-200",      glassy: "bg-indigo-500/20 text-indigo-100 border-indigo-400/30",  icon: <ListChecks className="w-3 h-3" /> },
    TRUE_FALSE: { label: "Đúng / Sai",   solid: "bg-emerald-50 text-emerald-700 border-emerald-200",   glassy: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30", icon: <ToggleLeft className="w-3 h-3" /> },
    ESSAY:      { label: "Tự luận",      solid: "bg-amber-50 text-amber-700 border-amber-200",         glassy: "bg-amber-500/20 text-amber-100 border-amber-400/30",     icon: <AlignLeft className="w-3 h-3" /> },
  };
  // Normalize: try exact key → uppercase key → fallback to SINGLE
  const entry = map[type as string] ?? map[(type as string)?.toUpperCase?.()] ?? map["SINGLE"];
  const { label, solid, glassy, icon } = entry;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full border px-2 py-0.5 ${glass ? glassy : solid}`}>
      {icon} {label}
    </span>
  );
}

export default function QuizViewer({
  quiz, readOnly = true, isTeacher = false, isOverlay = false, overlayOpacity = 75, onSubmitted, onReset,
}: QuizViewerProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  if (!quiz?.questions?.length) {
    return <div className={`text-center py-10 text-sm font-medium ${isOverlay ? "text-white/60" : "text-slate-400"}`}>Chưa có câu hỏi nào.</div>;
  }

  // ── Glass style helpers ──────────────────────────────────────────
  const bgAlpha = ((100 - Math.max(0, Math.min(100, overlayOpacity))) / 100 * 0.65) + 0.12;
  const cardBg  = isOverlay ? `rgba(15, 23, 42, ${bgAlpha})` : undefined;
  const textPrimary   = isOverlay ? "text-white"      : "text-gray-900";
  const textSecondary = isOverlay ? "text-white/70"    : "text-slate-600";
  const inputBg = isOverlay
    ? "bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
    : "border-amber-200 bg-white text-gray-900 placeholder:text-slate-400 focus:border-amber-400";

  // ── Logic ────────────────────────────────────────────────────────
  const toggleOption = (qId: string, oId: string, type: QuizType) => {
    if (readOnly || showResults) return;
    setSelectedAnswers((prev) => {
      const cur = prev[qId] || [];
      if (type === "SINGLE" || type === "TRUE_FALSE") return { ...prev, [qId]: [oId] };
      return { ...prev, [qId]: cur.includes(oId) ? cur.filter((id) => id !== oId) : [...cur, oId] };
    });
  };

  const isQuestionCorrect = (q: Question) => {
    const type = getQuizType(q);
    // Essay questions are always considered "correct" for gating purposes
    if (type === "ESSAY") return true;
    const sel = selectedAnswers[q.id] || [];
    const correct = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    return sel.length === correct.length && sel.every((id) => correct.includes(id));
  };

  const totalGradable = quiz.questions.filter((q) => getQuizType(q) !== "ESSAY").length;
  const score = quiz.questions.filter((q) => isQuestionCorrect(q)).length;
  const scorePercent = totalGradable > 0 ? Math.round((score / totalGradable) * 100) : 0;

  const totalAnswered = quiz.questions.filter((q) => {
    const t = getQuizType(q);
    return t === "ESSAY" ? !!essayAnswers[q.id]?.trim() : (selectedAnswers[q.id] || []).length > 0;
  }).length;

  const handleReset = () => {
    setSelectedAnswers({});
    setEssayAnswers({});
    setShowResults(false);
    setRevealedKeys(new Set());
    // Notify parent so it can re-enable gating
    onReset?.();
  };

  const handleSubmit = () => {
    setShowResults(true);
    // Compute whether all gradable questions were answered correctly
    const gradable = quiz.questions.filter((q) => getQuizType(q) !== "ESSAY");
    const allCorrect = gradable.length === 0
      ? true  // no gradable questions → treat as correct (essay-only quiz)
      : gradable.every((q) => isQuestionCorrect(q));
    onSubmitted?.(allCorrect);
  };

  return (
    <div className="w-full space-y-3">

      {/* Role badge - compact */}
      {isTeacher && (
        <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5 border w-fit ${isOverlay ? "bg-amber-500/20 text-amber-200 border-amber-400/30" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
          <GraduationCap className="w-3 h-3" /> Giáo viên
        </div>
      )}

      {/* Score card - compact */}
      {showResults && totalGradable > 0 && (
        <div
          className={`rounded-xl p-3 flex items-center gap-3 border ${isOverlay ? "backdrop-blur-sm border-white/20" : scorePercent >= 70 ? "bg-green-50 border-green-200" : scorePercent >= 40 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}
          style={isOverlay ? { background: "rgba(255,255,255,0.12)" } : undefined}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 text-white ${scorePercent >= 70 ? "bg-green-500" : scorePercent >= 40 ? "bg-yellow-500" : "bg-red-400"}`}>
            {scorePercent}%
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Award className={`w-4 h-4 ${scorePercent >= 70 ? "text-green-400" : "text-slate-400"}`} />
              <span className={`font-bold text-sm ${textPrimary}`}>{score}/{totalGradable} câu đúng</span>
            </div>
            <p className={`text-xs ${textSecondary} truncate`}>
              {scorePercent >= 70 ? "Xuất sắc!" : scorePercent >= 40 ? "Khá tốt!" : "Cần cố gắng thêm!"}
            </p>
          </div>
        </div>
      )}

      {/* Questions - compact */}
      {quiz.questions.map((question, qIndex) => {
        const type = getQuizType(question);
        const isAnswered = type === "ESSAY" ? !!essayAnswers[question.id]?.trim() : (selectedAnswers[question.id] || []).length > 0;
        const isCorrectQ = showResults && isQuestionCorrect(question);
        const keyRevealed = isTeacher && revealedKeys.has(question.id);

        const cardCls = isOverlay
          ? "backdrop-blur-sm border border-white/20 overflow-hidden transition-all rounded-xl"
          : `rounded-xl border overflow-hidden transition-all ${
              isTeacher ? "border-amber-200 bg-white"
              : showResults ? (type === "ESSAY" ? "border-amber-200 bg-white" : isCorrectQ ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/20")
              : isAnswered ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-white"
            }`;

        return (
          <div key={question.id} className={cardCls} style={isOverlay ? { background: cardBg } : undefined}>
            {/* Header - compact */}
            <div className={`px-4 pt-4 pb-2 flex items-start justify-between gap-2 ${isOverlay ? "border-b border-white/10" : "border-b border-slate-100"}`}>
              <div className="flex items-start gap-2.5 flex-1">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isOverlay ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                  {qIndex + 1}
                </span>
                <div className="flex-1 space-y-1.5">
                  <TypeBadge type={type} glass={isOverlay} />
                  <p className={`text-base font-medium leading-relaxed ${textPrimary}`}>
                    <InlineContentRenderer content={question.questionText} inlineImages={question.inlineImages} />
                  </p>
                  {/* Render question images (from Word import) */}
                  {question.images && question.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {question.images.map((src, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={src}
                          alt={`Hình ${imgIdx + 1}`}
                          className="max-w-full h-auto rounded border border-gray-200 dark:border-gray-600"
                          style={{ maxHeight: '400px', objectFit: 'contain' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {showResults && type !== "ESSAY" && (
                    isCorrectQ ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>
              {isTeacher && type !== "ESSAY" && (
                <button
                  onClick={() => setRevealedKeys((prev) => { const s = new Set(prev); s.has(question.id) ? s.delete(question.id) : s.add(question.id); return s; })}
                  className={`flex items-center gap-1 text-xs font-medium transition ${isOverlay ? "text-amber-300 hover:text-amber-100" : "text-amber-600 hover:text-amber-800"}`}
                >
                  {keyRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {keyRevealed ? "Ẩn" : "Đáp án"}
                </button>
              )}
            </div>

            {/* Answers - compact */}
            <div className="px-4 pb-4 pt-2 space-y-1.5">

              {/* ESSAY */}
              {type === "ESSAY" && (
                <div className="space-y-3">
                  <textarea
                    value={essayAnswers[question.id] || ""}
                    onChange={(e) => { if (readOnly || showResults) return; setEssayAnswers((p) => ({ ...p, [question.id]: e.target.value })); }}
                    disabled={readOnly || showResults}
                    placeholder="Nhập câu trả lời của bạn tại đây..."
                    rows={4}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium resize-none focus:outline-none transition ${inputBg} ${readOnly || showResults ? "cursor-default opacity-70" : ""}`}
                  />
                  {(isTeacher || showResults) && question.essayAnswer && (
                    <div className={`p-4 rounded-xl space-y-1 border ${isOverlay ? "bg-amber-500/15 border-amber-400/30" : "bg-amber-50 border-amber-200"}`}>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${isOverlay ? "text-amber-300" : "text-amber-700"}`}>
                        <GraduationCap className="w-3.5 h-3.5" /> Đáp án gợi ý
                      </div>
                      <p className={`text-sm font-medium leading-relaxed ${isOverlay ? "text-amber-100" : "text-amber-800"}`}>{question.essayAnswer}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TRUE_FALSE - compact */}
              {type === "TRUE_FALSE" && (
                <div className="flex gap-2">
                  {question.options.map((opt, oIdx) => {
                    const isSelected = (selectedAnswers[question.id] || []).includes(opt.id);
                    const shouldReveal = showResults || keyRevealed;
                    const showCorrect = shouldReveal && opt.isCorrect;
                    const showWrong = shouldReveal && isSelected && !opt.isCorrect;
                    let cls = isOverlay ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-600";
                    if (isSelected && !shouldReveal) cls = isOverlay ? "border-indigo-400/60 bg-indigo-500/30 text-indigo-100 shadow-sm" : "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm";
                    if (showCorrect) cls = isOverlay ? "border-green-400/60 bg-green-500/25 text-green-100 shadow-sm" : "border-green-400 bg-green-50 text-green-800 shadow-sm";
                    if (showWrong)   cls = isOverlay ? "border-red-400/60 bg-red-500/25 text-red-100"             : "border-red-300 bg-red-50 text-red-700";
                    return (
                      <button key={opt.id} onClick={() => toggleOption(question.id, opt.id, type)} disabled={readOnly || showResults}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border font-bold text-sm transition ${cls} ${!readOnly && !showResults ? "cursor-pointer hover:shadow-sm" : "cursor-default"}`}
                      >
                        <span>{oIdx === 0 ? "✓" : "✗"}</span>
                        <span>{opt.optionText}</span>
                        {showCorrect && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        {showWrong   && <XCircle className="w-4 h-4 text-red-400" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* SINGLE / MULTIPLE - compact */}
              {(type === "SINGLE" || type === "MULTIPLE") && (
                <div className="space-y-1">
                  {type === "MULTIPLE" && !showResults && !keyRevealed && (
                    <p className={`text-xs font-medium ${isOverlay ? "text-indigo-300" : "text-indigo-500"}`}>✦ Có thể chọn nhiều đáp án</p>
                  )}
                  {question.options.map((opt, oIdx) => {
                    const isSelected = (selectedAnswers[question.id] || []).includes(opt.id);
                    const shouldReveal = showResults || keyRevealed;
                    const showCorrect = shouldReveal && opt.isCorrect;
                    const showWrong   = shouldReveal && isSelected && !opt.isCorrect;
                    let cls = isOverlay ? "border-white/15 bg-white/5" : "border-slate-200 bg-white";
                    if (isSelected && !shouldReveal) cls = isOverlay ? "border-indigo-400/60 bg-indigo-500/25 shadow-sm" : "border-indigo-500 bg-indigo-50 shadow-sm";
                    if (showCorrect) cls = isOverlay ? "border-green-400/60 bg-green-500/20 shadow-sm" : "border-green-400 bg-green-50 shadow-sm";
                    if (showWrong)   cls = isOverlay ? "border-red-400/60 bg-red-500/20"              : "border-red-300 bg-red-50";
                    if (shouldReveal && !isSelected && !opt.isCorrect) cls += isOverlay ? " opacity-40" : " opacity-60";

                    const letterCls = showCorrect ? "bg-green-500 text-white" : showWrong ? "bg-red-400 text-white" : isSelected ? "bg-indigo-600 text-white" : isOverlay ? "bg-white/20 text-white/70" : "bg-slate-100 text-slate-500";
                    const tCls = showCorrect ? (isOverlay ? "text-green-200" : "text-green-800") : showWrong ? (isOverlay ? "text-red-200" : "text-red-700") : textPrimary;

                    return (
                      <button key={opt.id} onClick={() => toggleOption(question.id, opt.id, type)} disabled={readOnly || showResults}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${cls} ${!readOnly && !showResults ? "hover:border-indigo-300 cursor-pointer" : "cursor-default"}`}
                      >
                        <span className={`w-7 h-7 flex-shrink-0 rounded-md flex items-center justify-center text-xs font-bold transition ${letterCls}`}>
                          {OPTION_LETTERS[oIdx] || oIdx + 1}
                        </span>
                        <span className={`flex-1 text-sm font-medium ${tCls}`}>
                          <InlineContentRenderer content={opt.optionText} inlineImages={question.inlineImages} />
                        </span>
                        <span className="flex-shrink-0">
                          {showCorrect ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                            : showWrong ? <XCircle className="w-4 h-4 text-red-400" />
                            : isSelected ? <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                            : <Circle className="w-3.5 h-3.5 text-slate-300" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Explanation */}
              {showResults && question.explanation && (
                <div className={`mt-3 flex items-start gap-2.5 rounded-xl p-3.5 border ${isOverlay ? "bg-blue-500/15 border-blue-400/30" : "bg-blue-50 border-blue-200"}`}>
                  <span className="text-blue-400 text-base flex-shrink-0">💡</span>
                  <p className={`text-sm font-medium leading-relaxed ${isOverlay ? "text-blue-200" : "text-blue-800"}`}>{question.explanation}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Submit / reset */}
      {!readOnly && !isTeacher && (
        <div className="flex gap-3 pt-2">
          {!showResults ? (
            <button
              onClick={handleSubmit}
              disabled={totalAnswered === 0}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${
                isOverlay
                  ? "bg-indigo-500/70 backdrop-blur-sm text-white hover:bg-indigo-500/90 border border-indigo-400/30 shadow-lg"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
              }`}
            >
              Kiểm tra đáp án
              {totalAnswered > 0 && totalAnswered < quiz.questions.length && (
                <span className="ml-2 text-xs opacity-75">({totalAnswered}/{quiz.questions.length} đã trả lời)</span>
              )}
            </button>
          ) : (
            <button
              onClick={handleReset}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition ${
                isOverlay ? "border border-white/25 text-white hover:bg-white/10 backdrop-blur-sm" : "border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              }`}
            >
              <RotateCcw className="w-4 h-4" /> Làm lại
            </button>
          )}
        </div>
      )}
    </div>
  );
}