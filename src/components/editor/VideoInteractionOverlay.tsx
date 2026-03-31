"use client";

import { useState } from "react";
import { CheckCircle, XCircle, RotateCcw, ArrowRight, Lightbulb, AlertTriangle, Eye } from "lucide-react";
import LaTeXRenderer from "@/components/latex/LaTeXRenderer";

interface Question {
  id: string;
  questionText: string;
  options: Array<{
    id: string;
    optionText: string;
    isCorrect: boolean;
  }>;
  order: number;
}

interface Quiz {
  id: string;
  title?: string;
  questions: Question[];
}

interface VideoInteractionOverlayProps {
  quiz?: Quiz;
  quizData?: Quiz;
  hint?: string;
  onAnswered: (isCorrect: boolean) => void;
  onClose: () => void;
  lockVideo: boolean;
}

export default function VideoInteractionOverlay({
  quiz: quizProp,
  quizData,
  hint,
  onAnswered,
  onClose,
  lockVideo,
}: VideoInteractionOverlayProps) {
  const quiz = quizData ?? quizProp;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // FIX: Track how many wrong attempts so we can offer "reveal answers" after retrying
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);

  if (!quiz || !quiz.questions?.length) {
    return (
      <Backdrop>
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-yellow-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Câu hỏi không khả dụng</h3>
          <p className="text-sm text-slate-500">
            Bộ câu hỏi tại điểm này chưa được cấu hình đầy đủ.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
          >
            Tiếp tục xem video
          </button>
        </div>
      </Backdrop>
    );
  }

  const questions = quiz.questions;
  const totalQuestions = questions.length;
  const isSingleQuestion = totalQuestions === 1;

  const toggleAnswer = (questionId: string, optionId: string) => {
    if (submitted) return;
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      return {
        ...prev,
        [questionId]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  };

  const checkQuestionCorrect = (q: Question): boolean => {
    const selected = selectedAnswers[q.id] || [];
    const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    return (
      selected.length === correctIds.length &&
      selected.every((id) => correctIds.includes(id))
    );
  };

  const handleSubmit = () => {
    const allCorrect = questions.every(checkQuestionCorrect);
    setIsCorrect(allCorrect);
    setSubmitted(true);
    if (allCorrect) onAnswered(true);
    // FIX: count wrong attempts to unlock "reveal answers"
    if (!allCorrect) setWrongAttempts((n) => n + 1);
  };

  const handleRetry = () => {
    setSubmitted(false);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setShowAnswers(false);
  };

  const allAnswered = questions.every(
    (q) => (selectedAnswers[q.id] || []).length > 0
  );

  const correctCount = submitted ? questions.filter(checkQuestionCorrect).length : 0;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <Backdrop>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg">
                {quiz.title || "Kiểm tra nhanh"}
              </span>
            </div>
            {lockVideo && !submitted && (
              <span className="text-xs bg-red-500/30 text-white border border-white/20 rounded-full px-3 py-1 font-medium">
                🔒 Trả lời đúng để tiếp tục
              </span>
            )}
          </div>

          {/* Progress bar */}
          {!isSingleQuestion && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/80">
                <span>Câu {currentQuestionIndex + 1} / {totalQuestions}</span>
                {submitted && (
                  <span className="font-semibold">
                    ✓ {correctCount}/{totalQuestions} đúng
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {!submitted ? (
            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div
                  key={question.id}
                  className={`transition-all duration-200 ${
                    !isSingleQuestion && qIndex !== currentQuestionIndex
                      ? "hidden"
                      : ""
                  }`}
                >
                  {/* Question text */}
                  <div className="mb-5">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold">
                        {qIndex + 1}
                      </span>
                      <p className="text-base font-semibold text-slate-800 leading-relaxed pt-0.5">
                        <LaTeXRenderer content={question.questionText} />
                      </p>
                    </div>
                    {question.options.filter((o) => o.isCorrect).length > 1 && (
                      <p className="text-xs text-indigo-500 mt-2 ml-10">
                        ✦ Có thể chọn nhiều đáp án
                      </p>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5 ml-2">
                    {question.options.map((option, optIdx) => {
                      const isSelected = (selectedAnswers[question.id] || []).includes(option.id);
                      const letters = ["A", "B", "C", "D", "E"];
                      return (
                        <button
                          key={option.id}
                          onClick={() => toggleAnswer(question.id, option.id)}
                          className={`w-full flex items-center gap-4 p-3.5 rounded-xl border-2 text-left transition-all
                            ${isSelected
                              ? "border-indigo-500 bg-indigo-50 shadow-sm"
                              : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                            }`}
                        >
                          <span
                            className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold transition
                              ${isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {letters[optIdx] || optIdx + 1}
                          </span>
                          <span className="text-sm font-medium text-slate-700 leading-relaxed flex-1">
                            <LaTeXRenderer content={option.optionText} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Results ── */
            <div className="space-y-5">
              {/* Score card */}
              <div
                className={`rounded-2xl p-6 text-center space-y-2
                  ${isCorrect
                    ? "bg-green-50 border-2 border-green-200"
                    : "bg-red-50 border-2 border-red-200"
                  }`}
              >
                <div className="flex justify-center">
                  {isCorrect ? (
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  ) : (
                    <XCircle className="w-16 h-16 text-red-400" />
                  )}
                </div>
                <h3 className={`text-xl font-bold ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                  {isCorrect ? "Chính xác! 🎉" : "Chưa đúng rồi"}
                </h3>
                {!isSingleQuestion && (
                  <p className={`text-sm font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                    Bạn trả lời đúng {correctCount}/{totalQuestions} câu
                  </p>
                )}
              </div>

              {/* FIX: When wrong, show hint first — NOT correct answers */}
              {!isCorrect && (
                <>
                  {hint && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Gợi ý</p>
                        <p className="text-sm text-amber-700 mt-0.5">{hint}</p>
                      </div>
                    </div>
                  )}

                  {/* Show "Reveal answers" button only after 2+ wrong attempts */}
                  {wrongAttempts >= 2 && !showAnswers && (
                    <button
                      onClick={() => setShowAnswers(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
                    >
                      <Eye className="w-4 h-4" />
                      Xem đáp án đúng
                    </button>
                  )}

                  {/* Correct answers — only after user explicitly requests them */}
                  {showAnswers && (
                    <div className="space-y-4">
                      {questions.map((q, qIndex) => {
                        const isQCorrect = checkQuestionCorrect(q);
                        return (
                          <div key={q.id} className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5
                                ${isQCorrect ? "bg-green-500" : "bg-red-400"}`}>
                                <span className="text-white text-xs">
                                  {isQCorrect ? "✓" : "✗"}
                                </span>
                              </span>
                              <p className="text-sm font-semibold text-slate-700">
                                Câu {qIndex + 1}: <LaTeXRenderer content={q.questionText} />
                              </p>
                            </div>
                            <div className="space-y-1.5 ml-7">
                              {q.options.map((option, optIdx) => {
                                const wasSelected = (selectedAnswers[q.id] || []).includes(option.id);
                                const letters = ["A", "B", "C", "D", "E"];
                                return (
                                  <div
                                    key={option.id}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                                      ${option.isCorrect
                                        ? "bg-green-50 border border-green-200 text-green-800"
                                        : wasSelected && !option.isCorrect
                                          ? "bg-red-50 border border-red-200 text-red-700"
                                          : "text-slate-500"
                                      }`}
                                  >
                                    <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold bg-white border">
                                      {letters[optIdx]}
                                    </span>
                                    <LaTeXRenderer content={option.optionText} />
                                    {option.isCorrect && (
                                      <span className="ml-auto text-xs font-semibold text-green-600">✓ Đúng</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* When correct: show full breakdown as confirmation */}
              {isCorrect && (
                <div className="space-y-4">
                  {questions.map((q, qIndex) => (
                    <div key={q.id} className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-green-500">
                          <span className="text-white text-xs">✓</span>
                        </span>
                        <p className="text-sm font-semibold text-slate-700">
                          Câu {qIndex + 1}: <LaTeXRenderer content={q.questionText} />
                        </p>
                      </div>
                      <div className="space-y-1.5 ml-7">
                        {q.options.map((option, optIdx) => {
                          const wasSelected = (selectedAnswers[q.id] || []).includes(option.id);
                          const letters = ["A", "B", "C", "D", "E"];
                          return (
                            <div
                              key={option.id}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                                ${option.isCorrect
                                  ? "bg-green-50 border border-green-200 text-green-800"
                                  : wasSelected && !option.isCorrect
                                    ? "bg-red-50 border border-red-200 text-red-700"
                                    : "text-slate-500"
                                }`}
                            >
                              <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold bg-white border">
                                {letters[optIdx]}
                              </span>
                              <LaTeXRenderer content={option.optionText} />
                              {option.isCorrect && (
                                <span className="ml-auto text-xs font-semibold text-green-600">✓ Đúng</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          {!submitted ? (
            <>
              {/* Multi-question navigation */}
              {!isSingleQuestion && currentQuestionIndex < totalQuestions - 1 && (
                <button
                  onClick={() => setCurrentQuestionIndex((p) => p + 1)}
                  disabled={(selectedAnswers[questions[currentQuestionIndex]?.id] || []).length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-white disabled:opacity-40 transition"
                >
                  Câu tiếp theo
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-indigo-200"
              >
                Nộp bài
              </button>
            </>
          ) : (
            <>
              {!isCorrect && (
                <button
                  onClick={handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-50 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  Làm lại
                </button>
              )}
              {(!lockVideo || isCorrect) && (
                <button
                  onClick={onClose}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition shadow-md
                    ${isCorrect
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200"
                      : "bg-slate-700 hover:bg-slate-800 text-white shadow-slate-200"
                    }`}
                >
                  <ArrowRight className="w-4 h-4" />
                  Tiếp tục video
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      {children}
    </div>
  );
}