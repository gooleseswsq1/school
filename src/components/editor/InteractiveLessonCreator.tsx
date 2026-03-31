"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Layers, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  Download, Type, Image as ImageIcon, HelpCircle,
  GripVertical, Play, Loader2, X, FileText
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────

interface TextElement {
  type: "text";
  id: string;
  content: string;
}

interface ImageElement {
  type: "image";
  id: string;
  url: string;
  caption?: string;
}

interface QuizElement {
  type: "quiz";
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  feedback?: string;
}

type SlideElement = TextElement | ImageElement | QuizElement;

interface Slide {
  id: string;
  title: string;
  elements: SlideElement[];
}

interface LessonData {
  type: "interactive-lesson";
  title: string;
  slides: Slide[];
  settings: {
    theme: "default" | "dark" | "colorful";
    showProgress: boolean;
  };
}

interface InteractiveLessonCreatorProps {
  id: string;
  content?: string;
  onUpdate: (data: { content: string }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  readOnly?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function createEmptySlide(index: number): Slide {
  return {
    id: generateId(),
    title: `Slide ${index + 1}`,
    elements: [],
  };
}

function createDefaultLesson(): LessonData {
  return {
    type: "interactive-lesson",
    title: "Bài giảng mới",
    slides: [createEmptySlide(0)],
    settings: {
      theme: "default",
      showProgress: true,
    },
  };
}

function parseLessonData(content?: string): LessonData | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.type === "interactive-lesson") return parsed as LessonData;
    return null;
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────

export default function InteractiveLessonCreator({
  id,
  content,
  onUpdate,
  onDelete,
  readOnly = false,
}: InteractiveLessonCreatorProps) {
  const [lesson, setLesson] = useState<LessonData>(() => parseLessonData(content) || createDefaultLesson());
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageElementSlideIndex, setPendingImageElementSlideIndex] = useState<number | null>(null);

  // Current active slide
  const activeSlide = lesson.slides[activeSlideIndex] || lesson.slides[0];

  // ─── Auto-save with debounce ──────────────────────────────
  const autoSave = useCallback((updatedLesson: LessonData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onUpdate({ content: JSON.stringify(updatedLesson) });
    }, 800);
  }, [onUpdate]);

  const updateLesson = useCallback((updater: (prev: LessonData) => LessonData) => {
    setLesson(prev => {
      const updated = updater(prev);
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ─── Slide operations ─────────────────────────────────────
  const addSlide = useCallback(() => {
    updateLesson(prev => ({
      ...prev,
      slides: [...prev.slides, createEmptySlide(prev.slides.length)],
    }));
    setActiveSlideIndex(lesson.slides.length);
  }, [updateLesson, lesson.slides.length]);

  const deleteSlide = useCallback((index: number) => {
    if (lesson.slides.length <= 1) {
      toast.error("Phải có ít nhất 1 slide");
      return;
    }
    updateLesson(prev => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index),
    }));
    if (activeSlideIndex >= lesson.slides.length - 1) {
      setActiveSlideIndex(Math.max(0, lesson.slides.length - 2));
    }
  }, [updateLesson, lesson.slides.length, activeSlideIndex]);

  const moveSlide = useCallback((index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= lesson.slides.length) return;
    updateLesson(prev => {
      const slides = [...prev.slides];
      [slides[index], slides[newIndex]] = [slides[newIndex], slides[index]];
      return { ...prev, slides };
    });
    setActiveSlideIndex(newIndex);
  }, [updateLesson, lesson.slides.length]);

  const updateSlideTitle = useCallback((index: number, title: string) => {
    updateLesson(prev => ({
      ...prev,
      slides: prev.slides.map((s, i) => i === index ? { ...s, title } : s),
    }));
  }, [updateLesson]);

  // ─── Element operations ───────────────────────────────────
  const addElement = useCallback((slideIndex: number, elementType: "text" | "image" | "quiz") => {
    if (elementType === "image") {
      setPendingImageElementSlideIndex(slideIndex);
      imageInputRef.current?.click();
      return;
    }

    const newElement: SlideElement = elementType === "text"
      ? { type: "text", id: generateId(), content: "" }
      : { type: "quiz", id: generateId(), question: "", options: ["", ""], correctIndex: 0, feedback: "" };

    updateLesson(prev => ({
      ...prev,
      slides: prev.slides.map((s, i) =>
        i === slideIndex ? { ...s, elements: [...s.elements, newElement] } : s
      ),
    }));
  }, [updateLesson]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || pendingImageElementSlideIndex === null) return;

    const slideIndex = pendingImageElementSlideIndex;
    setPendingImageElementSlideIndex(null);
    if (e.target) e.target.value = "";

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = data.url || data.filePath;

      const newElement: ImageElement = { type: "image", id: generateId(), url, caption: "" };
      updateLesson(prev => ({
        ...prev,
        slides: prev.slides.map((s, i) =>
          i === slideIndex ? { ...s, elements: [...s.elements, newElement] } : s
        ),
      }));
      toast.success("Tải ảnh thành công!");
    } catch {
      toast.error("Lỗi khi tải ảnh");
    }
  }, [pendingImageElementSlideIndex, updateLesson]);

  const updateElement = useCallback((slideIndex: number, elementId: string, data: Partial<SlideElement>) => {
    updateLesson(prev => ({
      ...prev,
      slides: prev.slides.map((s, i) =>
        i === slideIndex
          ? {
              ...s,
              elements: s.elements.map(el =>
                el.id === elementId ? { ...el, ...data } as SlideElement : el
              ),
            }
          : s
      ),
    }));
  }, [updateLesson]);

  const deleteElement = useCallback((slideIndex: number, elementId: string) => {
    updateLesson(prev => ({
      ...prev,
      slides: prev.slides.map((s, i) =>
        i === slideIndex
          ? { ...s, elements: s.elements.filter(el => el.id !== elementId) }
          : s
      ),
    }));
  }, [updateLesson]);

  // ─── ZIP Export ───────────────────────────────────────────
  const handleExportZip = useCallback(async () => {
    setIsExporting(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const htmlContent = generateExportHTML(lesson);
      zip.file("index.html", htmlContent);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${lesson.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Xuất ZIP thành công!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Lỗi khi xuất ZIP");
    } finally {
      setIsExporting(false);
    }
  }, [lesson]);

  // ─── Read-only / iframe mode (when content is a URL) ─────
  if (readOnly || (content && !content.startsWith("{"))) {
    if (content && content.startsWith("/")) {
      return (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <iframe
            src={content}
            className="w-full border-0"
            style={{ height: "500px" }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="Interactive lesson"
          />
        </div>
      );
    }
    // Fallback for legacy document blocks
    return null;
  }

  // ─── Preview Mode ─────────────────────────────────────────
  if (isPreview) {
    return (
      <PreviewMode
        lesson={lesson}
        slideIndex={previewSlideIndex}
        onSlideChange={setPreviewSlideIndex}
        onClose={() => setIsPreview(false)}
      />
    );
  }

  // ─── Editor Mode ──────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* Header / Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-blue-600" />
          <input
            type="text"
            value={lesson.title}
            onChange={(e) => updateLesson(prev => ({ ...prev, title: e.target.value }))}
            className="text-sm font-semibold text-gray-800 border-none focus:outline-none focus:ring-0 bg-transparent"
            placeholder="Tên bài giảng"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setPreviewSlideIndex(0); setIsPreview(true); }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <Play size={13} /> Xem trước
          </button>
          <button
            onClick={handleExportZip}
            disabled={isExporting}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Tạo ZIP
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete()}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
              title="Xóa block"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex gap-3 min-h-[400px]">
        {/* Left Sidebar – Slide List */}
        <div className="w-48 flex-shrink-0 bg-gray-50 rounded-xl border border-gray-200 p-2 space-y-1 overflow-y-auto max-h-[500px]">
          {lesson.slides.map((slide, index) => (
            <div
              key={slide.id}
              onClick={() => setActiveSlideIndex(index)}
              className={`
                group flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer text-xs transition
                ${index === activeSlideIndex
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : "hover:bg-gray-100 text-gray-600 border border-transparent"}
              `}
            >
              <GripVertical size={12} className="text-gray-300 flex-shrink-0" />
              <span className="flex-1 truncate font-medium">{slide.title || `Slide ${index + 1}`}</span>
              <span className="text-[10px] text-gray-400">{slide.elements.length}</span>
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); moveSlide(index, "up"); }}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30">
                  <ChevronUp size={10} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); moveSlide(index, "down"); }}
                  disabled={index === lesson.slides.length - 1}
                  className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30">
                  <ChevronDown size={10} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteSlide(index); }}
                  className="p-0.5 hover:bg-red-100 hover:text-red-600 rounded">
                  <X size={10} />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addSlide}
            className="w-full flex items-center justify-center gap-1 px-2 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-dashed border-gray-300 hover:border-blue-300"
          >
            <Plus size={12} /> Thêm slide
          </button>
        </div>

        {/* Center – Slide Editor */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 overflow-y-auto max-h-[500px]">
          {/* Slide title */}
          <input
            type="text"
            value={activeSlide.title}
            onChange={(e) => updateSlideTitle(activeSlideIndex, e.target.value)}
            className="w-full text-base font-semibold text-gray-800 border-none focus:outline-none mb-3 pb-2 border-b placeholder:text-gray-300"
            placeholder="Tiêu đề slide"
          />

          {/* Elements */}
          <div className="space-y-3">
            {activeSlide.elements.map((element) => (
              <ElementEditor
                key={element.id}
                element={element}
                onUpdate={(data) => updateElement(activeSlideIndex, element.id, data)}
                onDelete={() => deleteElement(activeSlideIndex, element.id)}
              />
            ))}

            {activeSlide.elements.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Slide trống. Thêm nội dung bên dưới.
              </div>
            )}
          </div>

          {/* Add element buttons */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => addElement(activeSlideIndex, "text")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            >
              <Type size={13} /> Văn bản
            </button>
            <button
              onClick={() => addElement(activeSlideIndex, "image")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            >
              <ImageIcon size={13} /> Hình ảnh
            </button>
            <button
              onClick={() => addElement(activeSlideIndex, "quiz")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            >
              <HelpCircle size={13} /> Câu hỏi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Element Editor ─────────────────────────────────────────────

function ElementEditor({
  element,
  onUpdate,
  onDelete,
}: {
  element: SlideElement;
  onUpdate: (data: Partial<SlideElement>) => void;
  onDelete: () => void;
}) {
  switch (element.type) {
    case "text":
      return (
        <div className="group relative bg-gray-50 rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-gray-400 uppercase">Văn bản</span>
            <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded transition">
              <Trash2 size={12} />
            </button>
          </div>
          <textarea
            value={element.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Nhập nội dung văn bản..."
            className="w-full min-h-[80px] text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
          />
        </div>
      );

    case "image":
      return (
        <div className="group relative bg-gray-50 rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-gray-400 uppercase">Hình ảnh</span>
            <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded transition">
              <Trash2 size={12} />
            </button>
          </div>
          {element.url ? (
            <div className="space-y-2">
              <img src={element.url} alt={element.caption || ""} className="max-h-48 rounded-lg object-contain mx-auto" />
              <input
                type="text"
                value={element.caption || ""}
                onChange={(e) => onUpdate({ caption: e.target.value })}
                placeholder="Chú thích hình ảnh (tùy chọn)"
                className="w-full text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-xs">Đang tải ảnh...</div>
          )}
        </div>
      );

    case "quiz":
      return (
        <div className="group relative bg-purple-50 rounded-lg border border-purple-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-purple-400 uppercase">Câu hỏi trắc nghiệm</span>
            <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded transition">
              <Trash2 size={12} />
            </button>
          </div>
          <input
            type="text"
            value={element.question}
            onChange={(e) => onUpdate({ question: e.target.value })}
            placeholder="Nhập câu hỏi..."
            className="w-full text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
          <div className="space-y-1.5">
            {element.options.map((option, optIndex) => (
              <div key={optIndex} className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate({ correctIndex: optIndex })}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    element.correctIndex === optIndex
                      ? "border-green-500 bg-green-500"
                      : "border-gray-300 hover:border-green-400"
                  }`}
                >
                  {element.correctIndex === optIndex && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </button>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...element.options];
                    newOptions[optIndex] = e.target.value;
                    onUpdate({ options: newOptions });
                  }}
                  placeholder={`Đáp án ${optIndex + 1}`}
                  className="flex-1 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
                {element.options.length > 2 && (
                  <button
                    onClick={() => {
                      const newOptions = element.options.filter((_, i) => i !== optIndex);
                      const newCorrect = element.correctIndex >= newOptions.length
                        ? newOptions.length - 1
                        : element.correctIndex > optIndex
                          ? element.correctIndex - 1
                          : element.correctIndex;
                      onUpdate({ options: newOptions, correctIndex: newCorrect });
                    }}
                    className="p-1 text-gray-300 hover:text-red-500 transition"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {element.options.length < 6 && (
            <button
              onClick={() => onUpdate({ options: [...element.options, ""] })}
              className="mt-2 flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700 transition"
            >
              <Plus size={12} /> Thêm đáp án
            </button>
          )}
          <input
            type="text"
            value={element.feedback || ""}
            onChange={(e) => onUpdate({ feedback: e.target.value })}
            placeholder="Giải thích đáp án (tùy chọn)"
            className="w-full mt-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
        </div>
      );

    default:
      return null;
  }
}

// ─── Preview Mode ───────────────────────────────────────────────

function PreviewMode({
  lesson,
  slideIndex,
  onSlideChange,
  onClose,
}: {
  lesson: LessonData;
  slideIndex: number;
  onSlideChange: (index: number) => void;
  onClose: () => void;
}) {
  const slide = lesson.slides[slideIndex];
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});

  const handleAnswer = (elementId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [elementId]: optionIndex }));
    setShowFeedback(prev => ({ ...prev, [elementId]: true }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Preview header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-blue-500" />
          <span className="text-sm font-medium text-gray-700">Xem trước: {lesson.title}</span>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition">
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((slideIndex + 1) / lesson.slides.length) * 100}%` }}
        />
      </div>

      {/* Slide content */}
      <div className="p-6 min-h-[350px]">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{slide.title}</h2>

        <div className="space-y-4">
          {slide.elements.map((el) => {
            if (el.type === "text") {
              return (
                <div key={el.id} className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {el.content}
                </div>
              );
            }
            if (el.type === "image") {
              return (
                <div key={el.id} className="text-center">
                  <img src={el.url} alt={el.caption || ""} className="max-h-64 rounded-xl mx-auto" />
                  {el.caption && <p className="text-xs text-gray-500 mt-1">{el.caption}</p>}
                </div>
              );
            }
            if (el.type === "quiz") {
              const answered = answers[el.id] !== undefined;
              const isCorrect = answers[el.id] === el.correctIndex;
              return (
                <div key={el.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm font-medium text-gray-800 mb-3">{el.question}</p>
                  <div className="space-y-2">
                    {el.options.map((opt, oi) => {
                      const isSelected = answers[el.id] === oi;
                      const isCorrectOpt = oi === el.correctIndex;
                      return (
                        <button
                          key={oi}
                          onClick={() => !answered && handleAnswer(el.id, oi)}
                          disabled={answered}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition border
                            ${!answered ? "border-gray-200 hover:border-blue-300 hover:bg-blue-50" : ""}
                            ${answered && isSelected && isCorrect ? "border-green-400 bg-green-50 text-green-700" : ""}
                            ${answered && isSelected && !isCorrect ? "border-red-400 bg-red-50 text-red-700" : ""}
                            ${answered && !isSelected && isCorrectOpt ? "border-green-400 bg-green-50 text-green-700" : ""}
                            ${answered && !isSelected && !isCorrectOpt ? "border-gray-200 text-gray-400" : ""}
                          `}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {showFeedback[el.id] && (
                    <div className={`mt-2 text-xs ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                      {isCorrect ? "✓ Chính xác!" : `✗ Đáp án đúng: ${el.options[el.correctIndex]}`}
                      {el.feedback && <span className="block mt-1 text-gray-500">{el.feedback}</span>}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
        <button
          onClick={() => onSlideChange(slideIndex - 1)}
          disabled={slideIndex === 0}
          className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
        >
          ← Trước
        </button>
        <span className="text-xs text-gray-500">
          {slideIndex + 1} / {lesson.slides.length}
        </span>
        <button
          onClick={() => onSlideChange(slideIndex + 1)}
          disabled={slideIndex === lesson.slides.length - 1}
          className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition"
        >
          Tiếp →
        </button>
      </div>
    </div>
  );
}

// ─── HTML Export Generator ──────────────────────────────────────

function generateExportHTML(lesson: LessonData): string {
  const lessonJson = JSON.stringify(lesson)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${lesson.title.replace(/[<>&"]/g, "")}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f8fafc;color:#1e293b;min-height:100vh;display:flex;flex-direction:column}
.header{background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:16px;font-weight:600}
.progress-bar{height:4px;background:#e2e8f0}.progress-fill{height:100%;background:#3b82f6;transition:width .3s}
.slide-container{flex:1;max-width:800px;margin:24px auto;padding:0 16px;width:100%}
.slide-title{font-size:20px;font-weight:700;margin-bottom:16px;color:#0f172a}
.element{margin-bottom:16px}
.text-el{font-size:14px;line-height:1.7;white-space:pre-wrap;color:#475569}
.image-el{text-align:center}.image-el img{max-width:100%;max-height:400px;border-radius:12px}
.image-el .caption{font-size:12px;color:#94a3b8;margin-top:4px}
.quiz-el{background:#f1f5f9;border-radius:12px;padding:16px;border:1px solid #e2e8f0}
.quiz-el .question{font-size:14px;font-weight:600;margin-bottom:12px}
.quiz-el .option{display:block;width:100%;text-align:left;padding:8px 12px;margin-bottom:6px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;transition:all .2s}
.quiz-el .option:hover:not(:disabled){border-color:#93c5fd;background:#eff6ff}
.quiz-el .option.correct{border-color:#4ade80;background:#f0fdf4;color:#166534}
.quiz-el .option.wrong{border-color:#f87171;background:#fef2f2;color:#991b1b}
.quiz-el .option.show-correct{border-color:#4ade80;background:#f0fdf4;color:#166534}
.quiz-el .option:disabled{cursor:default}
.quiz-el .feedback{font-size:12px;margin-top:8px;padding:8px;border-radius:6px}
.quiz-el .feedback.correct{color:#166534;background:#dcfce7}
.quiz-el .feedback.wrong{color:#991b1b;background:#fee2e2}
.nav{background:#fff;border-top:1px solid #e2e8f0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
.nav button{padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:all .2s}
.nav .prev{background:#f1f5f9;color:#475569}.nav .prev:hover{background:#e2e8f0}
.nav .next{background:#3b82f6;color:#fff}.nav .next:hover{background:#2563eb}
.nav button:disabled{opacity:.4;cursor:default}
.nav .counter{font-size:12px;color:#94a3b8}
</style>
</head>
<body>
<div class="header"><h1 id="lessonTitle"></h1><span id="slideCounter" style="font-size:12px;color:#94a3b8"></span></div>
<div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
<div class="slide-container" id="slideContainer"></div>
<div class="nav">
  <button class="prev" id="prevBtn" onclick="goSlide(-1)">← Trước</button>
  <span class="counter" id="navCounter"></span>
  <button class="next" id="nextBtn" onclick="goSlide(1)">Tiếp →</button>
</div>
<script>
var lesson=${lessonJson};
var current=0;
var answers={};
function render(){
  var s=lesson.slides[current];
  document.getElementById("lessonTitle").textContent=lesson.title;
  document.getElementById("progressFill").style.width=((current+1)/lesson.slides.length*100)+"%";
  document.getElementById("slideCounter").textContent=(current+1)+"/"+lesson.slides.length;
  document.getElementById("navCounter").textContent=(current+1)+" / "+lesson.slides.length;
  document.getElementById("prevBtn").disabled=current===0;
  document.getElementById("nextBtn").disabled=current===lesson.slides.length-1;
  var h='<h2 class="slide-title">'+esc(s.title)+'</h2>';
  s.elements.forEach(function(el){
    h+='<div class="element">';
    if(el.type==="text")h+='<div class="text-el">'+esc(el.content)+'</div>';
    else if(el.type==="image"){h+='<div class="image-el"><img src="'+esc(el.url)+'" alt="'+esc(el.caption||"")+'"/>';if(el.caption)h+='<div class="caption">'+esc(el.caption)+'</div>';h+='</div>';}
    else if(el.type==="quiz"){
      var a=answers[el.id];
      h+='<div class="quiz-el"><div class="question">'+esc(el.question)+'</div>';
      el.options.forEach(function(o,i){
        var cls="option";
        if(a!==undefined){
          if(i===a&&i===el.correctIndex)cls+=" correct";
          else if(i===a)cls+=" wrong";
          else if(i===el.correctIndex)cls+=" show-correct";
        }
        h+='<button class="'+cls+'" '+(a!==undefined?'disabled':'')+' onclick="answer(\\''+el.id+"\\',"+i+')">'+esc(o)+"</button>";
      });
      if(a!==undefined){
        var ok=a===el.correctIndex;
        h+='<div class="feedback '+(ok?"correct":"wrong")+'">'+(ok?"✓ Chính xác!":"✗ Đáp án đúng: "+esc(el.options[el.correctIndex]));
        if(el.feedback)h+="<br/>"+esc(el.feedback);
        h+="</div>";
      }
      h+="</div>";
    }
    h+="</div>";
  });
  document.getElementById("slideContainer").innerHTML=h;
}
function goSlide(d){current=Math.max(0,Math.min(lesson.slides.length-1,current+d));render();}
function answer(id,i){answers[id]=i;render();}
function esc(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
render();
</script>
</body>
</html>`;
}
