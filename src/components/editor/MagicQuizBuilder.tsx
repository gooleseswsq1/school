"use client";

import { useState } from "react";
import {
  Plus, X, Trash2, Copy, Upload, Lightbulb,
  CheckSquare, ToggleLeft, AlignLeft, ListChecks,
  ChevronDown, ChevronUp, Save, GripVertical
} from "lucide-react";
import toast from "react-hot-toast";

/* ─── Types ──────────────────────────────────────────────────────── */

export type QuizType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE" | "ESSAY";

interface QuestionOption {
  optionText: string;
  isCorrect: boolean;
}

interface Question {
  id?: string;
  questionText: string;
  questionType: QuizType;
  order: number;
  options: QuestionOption[];
  essayAnswer?: string; // model answer for essay
  explanation?: string; // explanation shown after submit
}

interface MagicQuizBuilderProps {
  blockId: string;
  onQuizCreated: (quiz: any) => void;
  onClose: () => void;
  initialQuiz?: any;
}

/* ─── Quiz type config ───────────────────────────────────────────── */

const QUIZ_TYPES: {
  type: QuizType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    type: "SINGLE",
    label: "Trắc nghiệm 1 đáp án",
    desc: "Chỉ có 1 đáp án đúng",
    icon: <CheckSquare className="w-5 h-5" />,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-300",
  },
  {
    type: "MULTIPLE",
    label: "Trắc nghiệm nhiều đáp án",
    desc: "Có thể chọn nhiều đáp án đúng",
    icon: <ListChecks className="w-5 h-5" />,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-300",
  },
  {
    type: "TRUE_FALSE",
    label: "Đúng / Sai",
    desc: "Học sinh chọn Đúng hoặc Sai",
    icon: <ToggleLeft className="w-5 h-5" />,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
  },
  {
    type: "ESSAY",
    label: "Tự luận",
    desc: "Học sinh viết câu trả lời tự do",
    icon: <AlignLeft className="w-5 h-5" />,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
  },
];

const TYPE_BADGE: Record<QuizType, { label: string; color: string }> = {
  SINGLE: { label: "Trắc nghiệm 1 đáp án", color: "bg-blue-100 text-blue-700 border-blue-200" },
  MULTIPLE: { label: "Nhiều đáp án", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  TRUE_FALSE: { label: "Đúng / Sai", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ESSAY: { label: "Tự luận", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

/* ─── Default options by type ────────────────────────────────────── */

function getDefaultOptions(type: QuizType): QuestionOption[] {
  switch (type) {
    case "SINGLE":
    case "MULTIPLE":
      return [
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
      ];
    case "TRUE_FALSE":
      return [
        { optionText: "Đúng", isCorrect: true },
        { optionText: "Sai", isCorrect: false },
      ];
    case "ESSAY":
      return [];
  }
}

/* ─── Main Component ─────────────────────────────────────────────── */

export default function MagicQuizBuilder({
  blockId,
  onQuizCreated,
  onClose,
  initialQuiz,
}: MagicQuizBuilderProps) {
  const [quizTitle, setQuizTitle] = useState(initialQuiz?.title || "");
  const [questions, setQuestions] = useState<Question[]>(
    initialQuiz?.questions?.map((q: any) => ({
      ...q,
      questionType: q.questionType || "SINGLE",
    })) || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  /* ── Helpers ── */

  const addQuestion = (type: QuizType) => {
    const q: Question = {
      questionText: "",
      questionType: type,
      order: questions.length,
      options: getDefaultOptions(type),
      explanation: "",
    };
    const newIdx = questions.length;
    setQuestions([...questions, q]);
    setExpandedIdx(newIdx);
  };

  const updateQuestion = (idx: number, field: keyof Question, value: any) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const changeType = (idx: number, type: QuizType) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        questionType: type,
        options: getDefaultOptions(type),
      };
      return next;
    });
  };

  const updateOption = (qIdx: number, oIdx: number, field: keyof QuestionOption, value: any) => {
    setQuestions((prev) => {
      const next = [...prev];
      const opts = [...next[qIdx].options];
      // For SINGLE: uncheck others when checking one
      if (field === "isCorrect" && value === true && next[qIdx].questionType === "SINGLE") {
        opts.forEach((o, i) => { opts[i] = { ...o, isCorrect: false }; });
      }
      opts[oIdx] = { ...opts[oIdx], [field]: value };
      next[qIdx] = { ...next[qIdx], options: opts };
      return next;
    });
  };

  const addOption = (qIdx: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIdx] = {
        ...next[qIdx],
        options: [...next[qIdx].options, { optionText: "", isCorrect: false }],
      };
      return next;
    });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      const opts = next[qIdx].options.filter((_, i) => i !== oIdx);
      next[qIdx] = { ...next[qIdx], options: opts };
      return next;
    });
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  const duplicateQuestion = (idx: number) => {
    setQuestions((prev) => {
      const copy = { ...prev[idx], order: prev.length };
      return [...prev, copy];
    });
  };

  /* ── Bulk import ── */
  const parseBulkImport = () => {
    const lines = bulkText.split("\n").filter((l) => l.trim());
    const parsed: Question[] = [];
    lines.forEach((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 2) return;
      const [questionText, ...optTexts] = parts;
      const isTF = optTexts.length === 2 &&
        optTexts[0].toLowerCase().includes("đúng") &&
        optTexts[1].toLowerCase().includes("sai");
      const type: QuizType = isTF ? "TRUE_FALSE" : optTexts.length === 1 ? "ESSAY" : "SINGLE";
      parsed.push({
        questionText,
        questionType: type,
        order: parsed.length,
        options: type === "ESSAY" ? [] : optTexts.map((t, i) => ({ optionText: t, isCorrect: i === 0 })),
        essayAnswer: type === "ESSAY" ? optTexts[0] : undefined,
      });
    });
    if (!parsed.length) { toast.error("Không có dữ liệu hợp lệ"); return; }
    setQuestions(parsed);
    setBulkText("");
    setShowBulkImport(false);
    toast.success(`Nhập ${parsed.length} câu hỏi thành công`);
  };

  /* ── Validation ── */
  const validate = (): string | null => {
    if (!questions.length) return "Vui lòng thêm ít nhất một câu hỏi";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return `Câu ${i + 1}: Chưa nhập nội dung câu hỏi`;
      if (q.questionType !== "ESSAY") {
        const filled = q.options.filter((o) => o.optionText.trim());
        if (filled.length < 2) return `Câu ${i + 1}: Cần ít nhất 2 đáp án`;
        const hasCorrect = q.options.some((o) => o.isCorrect);
        if (!hasCorrect) return `Câu ${i + 1}: Chưa chọn đáp án đúng`;
      }
    }
    return null;
  };

  const saveQuiz = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setIsSaving(true);
    try {
      const response = await fetch("/api/quiz", {
        method: initialQuiz ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(initialQuiz ? { quizId: initialQuiz.id } : {}),
          blockId,
          title: quizTitle || "Bộ câu hỏi",
          questions: questions.map((q, i) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            order: i,
            options: q.options,
            essayAnswer: q.essayAnswer,
            explanation: q.explanation,
          })),
        }),
      });
      if (!response.ok) throw new Error("Failed to save quiz");
      const quiz = await response.json();
      toast.success("Lưu bộ câu hỏi thành công!");
      onQuizCreated(quiz);
    } catch {
      toast.error("Lỗi khi lưu bộ câu hỏi");
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Render ── */

  const correctCount = questions.filter((q) =>
    q.questionType === "ESSAY" || q.options.some((o) => o.isCorrect)
  ).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center py-8 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">

          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                  <Lightbulb className="w-4 h-4" />
                  Trình tạo Quiz
                </div>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Tên bộ câu hỏi (tùy chọn)..."
                  className="w-full bg-white/15 text-white placeholder:text-white/50 border border-white/20 rounded-xl px-4 py-2.5 text-lg font-bold focus:outline-none focus:bg-white/25 transition"
                />
              </div>
              <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-xl transition mt-6">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-4 text-sm text-white/80">
              <span className="bg-white/20 rounded-full px-3 py-1 font-medium">
                {questions.length} câu hỏi
              </span>
              {questions.length > 0 && (
                <span className={`rounded-full px-3 py-1 font-medium ${correctCount === questions.length ? "bg-green-400/30 text-green-100" : "bg-yellow-400/20 text-yellow-100"}`}>
                  {correctCount}/{questions.length} có đáp án
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* ── Add question buttons ── */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Thêm loại câu hỏi
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {QUIZ_TYPES.map((qt) => (
                  <button
                    key={qt.type}
                    onClick={() => addQuestion(qt.type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition group hover:shadow-md
                      ${qt.bg} ${qt.border} ${qt.color}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm group-hover:scale-110 transition ${qt.color}`}>
                      {qt.icon}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold leading-tight">{qt.label}</p>
                      <p className="text-xs opacity-70 mt-0.5">{qt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Bulk import ── */}
            <div>
              <button
                onClick={() => setShowBulkImport((v) => !v)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition font-medium"
              >
                <Upload className="w-4 h-4" />
                Nhập hàng loạt
                {showBulkImport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showBulkImport && (
                <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs text-slate-500">
                    Định dạng: <code className="bg-white border rounded px-1">Câu hỏi | Đáp án 1 | Đáp án 2 ...</code> (mỗi câu 1 dòng)
                  </p>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"Thủ đô Việt Nam là gì? | Hà Nội | TP.HCM | Đà Nẵng\nTrái đất quay quanh mặt trời | Đúng | Sai"}
                    rows={4}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 bg-white"
                  />
                  <div className="flex gap-2">
                    <button onClick={parseBulkImport} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition font-medium">
                      Nhập
                    </button>
                    <button onClick={() => setShowBulkImport(false)} className="px-4 py-2 border text-sm rounded-lg hover:bg-slate-100 transition text-slate-600">
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Questions list ── */}
            {questions.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Lightbulb className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">Chưa có câu hỏi</p>
                <p className="text-sm text-slate-400">Chọn loại câu hỏi phía trên để bắt đầu</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Danh sách câu hỏi
                </p>
                {questions.map((q, qIdx) => {
                  const isOpen = expandedIdx === qIdx;
                  const typeCfg = QUIZ_TYPES.find((t) => t.type === q.questionType)!;
                  const badge = TYPE_BADGE[q.questionType];
                  const hasError = !q.questionText.trim() ||
                    (q.questionType !== "ESSAY" && !q.options.some((o) => o.isCorrect));

                  return (
                    <div
                      key={qIdx}
                      className={`rounded-xl border-2 overflow-hidden transition
                        ${hasError && q.questionText
                          ? "border-amber-200"
                          : isOpen
                            ? `${typeCfg.border}`
                            : "border-slate-200"
                        }`}
                    >
                      {/* Question header row */}
                      <div
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition
                          ${isOpen ? typeCfg.bg : "bg-white hover:bg-slate-50"}`}
                        onClick={() => setExpandedIdx(isOpen ? null : qIdx)}
                      >
                        <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        <span className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold ${typeCfg.bg} ${typeCfg.color} border ${typeCfg.border}`}>
                          {qIdx + 1}
                        </span>
                        <p className={`flex-1 text-sm font-semibold truncate ${q.questionText ? "text-slate-800" : "text-slate-400"}`}>
                          {q.questionText || "Chưa nhập câu hỏi..."}
                        </p>
                        <span className={`text-xs font-medium rounded-full border px-2.5 py-0.5 flex-shrink-0 ${badge.color}`}>
                          {badge.label}
                        </span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                      </div>

                      {/* Expanded editor */}
                      {isOpen && (
                        <div className={`p-5 border-t ${typeCfg.border} space-y-5 bg-white`}>
                          {/* Type switcher */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loại câu hỏi</p>
                            <div className="flex gap-2 flex-wrap">
                              {QUIZ_TYPES.map((qt) => (
                                <button
                                  key={qt.type}
                                  onClick={() => changeType(qIdx, qt.type)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition
                                    ${q.questionType === qt.type
                                      ? `${qt.bg} ${qt.border} ${qt.color}`
                                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                                    }`}
                                >
                                  {qt.icon}
                                  {qt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Question text */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Nội dung câu hỏi *
                            </label>
                            <textarea
                              value={q.questionText}
                              onChange={(e) => updateQuestion(qIdx, "questionText", e.target.value)}
                              placeholder="Nhập câu hỏi tại đây..."
                              rows={2}
                              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-0 transition resize-none bg-white"
                            />
                          </div>

                          {/* Options by type */}
                          {q.questionType === "ESSAY" && (
                            <EssayEditor
                              answer={q.essayAnswer || ""}
                              explanation={q.explanation || ""}
                              onChange={(field, val) => updateQuestion(qIdx, field as any, val)}
                            />
                          )}

                          {q.questionType === "TRUE_FALSE" && (
                            <TrueFalseEditor
                              options={q.options}
                              onChange={(oIdx, field, val) => updateOption(qIdx, oIdx, field, val)}
                            />
                          )}

                          {(q.questionType === "SINGLE" || q.questionType === "MULTIPLE") && (
                            <MultiChoiceEditor
                              type={q.questionType}
                              options={q.options}
                              onUpdate={(oIdx, field, val) => updateOption(qIdx, oIdx, field, val)}
                              onAdd={() => addOption(qIdx)}
                              onRemove={(oIdx) => removeOption(qIdx, oIdx)}
                            />
                          )}

                          {/* Explanation (all types except essay) */}
                          {q.questionType !== "ESSAY" && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Giải thích đáp án (hiện sau khi nộp)
                              </label>
                              <input
                                type="text"
                                value={q.explanation || ""}
                                onChange={(e) => updateQuestion(qIdx, "explanation", e.target.value)}
                                placeholder="VD: Vì... (tùy chọn)"
                                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 transition bg-white"
                              />
                            </div>
                          )}

                          {/* Question actions */}
                          <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => duplicateQuestion(qIdx)}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Sao chép
                            </button>
                            <button
                              onClick={() => removeQuestion(qIdx)}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa câu hỏi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200 shadow-lg">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{questions.length}</span> câu hỏi
              {questions.length > 0 && correctCount < questions.length && (
                <span className="text-amber-600 font-medium">
                  · {questions.length - correctCount} câu chưa có đáp án
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={saveQuiz}
                disabled={isSaving || questions.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition shadow-md shadow-indigo-200"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Đang lưu..." : "Lưu bộ câu hỏi"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-editors ────────────────────────────────────────────────── */

function MultiChoiceEditor({
  type,
  options,
  onUpdate,
  onAdd,
  onRemove,
}: {
  type: "SINGLE" | "MULTIPLE";
  options: QuestionOption[];
  onUpdate: (idx: number, field: keyof QuestionOption, val: any) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  const isCorrectCount = options.filter((o) => o.isCorrect).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Các đáp án
          {type === "SINGLE" && (
            <span className="ml-2 text-xs normal-case font-normal text-blue-500">
              (chọn 1 đáp án đúng)
            </span>
          )}
          {type === "MULTIPLE" && (
            <span className="ml-2 text-xs normal-case font-normal text-indigo-500">
              ({isCorrectCount} đáp án đúng được chọn)
            </span>
          )}
        </label>
      </div>

      <div className="space-y-2">
        {options.map((opt, oIdx) => (
          <div key={oIdx} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition
            ${opt.isCorrect ? "border-green-300 bg-green-50" : "border-slate-200 bg-slate-50"}`}
          >
            {/* Correct toggle */}
            <button
              onClick={() => onUpdate(oIdx, "isCorrect", !opt.isCorrect)}
              title={opt.isCorrect ? "Bỏ đánh dấu đúng" : "Đánh dấu là đúng"}
              className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold border-2 transition
                ${opt.isCorrect
                  ? "bg-green-500 border-green-500 text-white shadow-sm"
                  : "bg-white border-slate-300 text-slate-400 hover:border-green-400"
                }`}
            >
              {opt.isCorrect ? "✓" : OPTION_LETTERS[oIdx] || oIdx + 1}
            </button>

            <input
              type="text"
              value={opt.optionText}
              onChange={(e) => onUpdate(oIdx, "optionText", e.target.value)}
              placeholder={`Đáp án ${OPTION_LETTERS[oIdx] || oIdx + 1}...`}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 transition"
            />

            {options.length > 2 && (
              <button
                onClick={() => onRemove(oIdx)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 6 && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition py-1"
        >
          <Plus className="w-4 h-4" />
          Thêm đáp án
        </button>
      )}
    </div>
  );
}

function TrueFalseEditor({
  options,
  onChange,
}: {
  options: QuestionOption[];
  onChange: (idx: number, field: keyof QuestionOption, val: any) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Đáp án đúng
      </label>
      <div className="flex gap-3">
        {options.map((opt, oIdx) => (
          <button
            key={oIdx}
            onClick={() => {
              onChange(0, "isCorrect", oIdx === 0);
              onChange(1, "isCorrect", oIdx === 1);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 text-lg font-bold transition
              ${opt.isCorrect
                ? oIdx === 0
                  ? "border-green-400 bg-green-50 text-green-700 shadow-sm"
                  : "border-red-400 bg-red-50 text-red-700 shadow-sm"
                : "border-slate-200 text-slate-400 hover:border-slate-300 bg-white"
              }`}
          >
            {oIdx === 0 ? "✓ Đúng" : "✗ Sai"}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400">Click để chọn đáp án đúng</p>
    </div>
  );
}

function EssayEditor({
  answer,
  explanation,
  onChange,
}: {
  answer: string;
  explanation: string;
  onChange: (field: string, val: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <AlignLeft className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          Câu hỏi tự luận — học sinh tự nhập câu trả lời. Bạn có thể nhập đáp án gợi ý để học sinh tự đối chiếu.
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Đáp án gợi ý (giáo viên)
        </label>
        <textarea
          value={answer}
          onChange={(e) => onChange("essayAnswer", e.target.value)}
          placeholder="Nhập đáp án mẫu hoặc hướng dẫn chấm điểm..."
          rows={3}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 transition resize-none bg-white"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Giải thích / nhận xét
        </label>
        <input
          type="text"
          value={explanation}
          onChange={(e) => onChange("explanation", e.target.value)}
          placeholder="Thêm chú thích cho học sinh..."
          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 transition bg-white"
        />
      </div>
    </div>
  );
}