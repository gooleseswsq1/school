"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

// ─── Types (matching InteractiveLessonCreator) ──────────────────

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
    theme: string;
    showProgress: boolean;
  };
}

interface InteractiveLessonViewerProps {
  content: string;
}

// ─── Component ────────────────────────────────────────────────────

export default function InteractiveLessonViewer({ content }: InteractiveLessonViewerProps) {
  const lesson = useMemo<LessonData | null>(() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.type === "interactive-lesson") return parsed;
      return null;
    } catch {
      return null;
    }
  }, [content]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  if (!lesson) {
    return <div className="text-center py-8 text-gray-400 text-sm">Không thể tải bài giảng</div>;
  }

  const slide = lesson.slides[currentSlide];
  const progress = ((currentSlide + 1) / lesson.slides.length) * 100;

  const handleAnswer = (elementId: string, optionIndex: number) => {
    if (answers[elementId] !== undefined) return;
    setAnswers(prev => ({ ...prev, [elementId]: optionIndex }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <h3 className="text-sm font-semibold text-blue-800">{lesson.title}</h3>
        <span className="text-xs text-blue-500">{currentSlide + 1}/{lesson.slides.length}</span>
      </div>

      {/* Progress */}
      {lesson.settings.showProgress && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Slide Content */}
      <div className="p-5 min-h-[280px]">
        <h2 className="text-base font-bold text-gray-800 mb-4">{slide.title}</h2>

        <div className="space-y-4">
          {slide.elements.map((el) => {
            if (el.type === "text") {
              return (
                <div key={el.id} className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {el.content}
                </div>
              );
            }

            if (el.type === "image") {
              return (
                <div key={el.id} className="text-center">
                  <img
                    src={el.url}
                    alt={el.caption || ""}
                    className="max-h-56 rounded-xl mx-auto shadow-sm"
                  />
                  {el.caption && (
                    <p className="text-xs text-gray-500 mt-2">{el.caption}</p>
                  )}
                </div>
              );
            }

            if (el.type === "quiz") {
              const answered = answers[el.id] !== undefined;
              const selectedIndex = answers[el.id];
              const isCorrect = selectedIndex === el.correctIndex;

              return (
                <div key={el.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">?</span>
                    {el.question}
                  </p>
                  <div className="space-y-2">
                    {el.options.map((opt, oi) => {
                      const isSelected = selectedIndex === oi;
                      const isCorrectOpt = oi === el.correctIndex;

                      let btnClass = "w-full text-left px-3 py-2 rounded-lg text-sm border transition ";
                      if (!answered) {
                        btnClass += "border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer";
                      } else if (isSelected && isCorrect) {
                        btnClass += "border-green-400 bg-green-50 text-green-800";
                      } else if (isSelected && !isCorrect) {
                        btnClass += "border-red-400 bg-red-50 text-red-800";
                      } else if (isCorrectOpt) {
                        btnClass += "border-green-400 bg-green-50 text-green-800";
                      } else {
                        btnClass += "border-gray-200 text-gray-400";
                      }

                      return (
                        <button
                          key={oi}
                          onClick={() => handleAnswer(el.id, oi)}
                          disabled={answered}
                          className={btnClass}
                        >
                          <span className="flex items-center gap-2">
                            {answered && isCorrectOpt && <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />}
                            {answered && isSelected && !isCorrect && <XCircle size={14} className="text-red-500 flex-shrink-0" />}
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {answered && (
                    <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {isCorrect ? "✓ Chính xác!" : `✗ Đáp án đúng: ${el.options[el.correctIndex]}`}
                      {el.feedback && <span className="block mt-1 text-gray-600">{el.feedback}</span>}
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
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
        <button
          onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
          disabled={currentSlide === 0}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"
        >
          <ChevronLeft size={14} /> Trước
        </button>

        {/* Slide dots */}
        <div className="flex gap-1">
          {lesson.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition ${
                i === currentSlide ? "bg-blue-500 w-4" : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide(prev => Math.min(lesson.slides.length - 1, prev + 1))}
          disabled={currentSlide === lesson.slides.length - 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition"
        >
          Tiếp <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
