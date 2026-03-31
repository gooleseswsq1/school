'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, ChevronLeft, ChevronRight, BookOpen, Play,
  Maximize2, Minimize2, Video, FileText, HelpCircle, 
  ExternalLink, Layers, ChevronDown
} from 'lucide-react';
import StudentVideoViewer from '@/components/student/StudentVideoViewer';
import DocumentBlockComponent from '@/components/editor/DocumentBlockComponent';
import QuizViewer from '@/components/editor/QuizViewer';
import LinkBlockComponent from '@/components/editor/LinkBlockComponent';
import FlashcardBlockComponent from '@/components/editor/FlashcardBlockComponent';
import CanvaSlideViewerBlock from '@/components/editor/CanvaSlideViewer';
import CommentsContainer from '@/components/editor/CommentsContainer';
import InteractiveLessonViewer from '@/components/student/InteractiveLessonViewer';

// ─── Types ────────────────────────────────────────────────────────────

interface PageBlock {
  id: string;
  type: "VIDEO" | "DOCUMENT" | "TEXT" | "CONTENT" | "QUIZ" | "CANVA" | "LINK" | "RICH_TEXT" | "FLASHCARD" | "EMBED";
  order: number;
  videoUrl?: string;
  videoType?: string;
  poster?: string;
  interactions?: any;
  content?: string;
  items?: any[];
  quiz?: any;
  quizzes?: any[];
  documents?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize?: number;
  }>;
  url?: string;
  label?: string;
  description?: string;
  richTextContent?: string;
  flashcardTitle?: string;
  slidesData?: any;
  flashcards?: Array<{
    id: string;
    front: string;
    back: string;
    hint?: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  parent?: { id: string; title: string } | null;
  children?: Page[];
  blocks?: PageBlock[];
  order?: number;
  isPublished?: boolean;
  author?: { name: string; id: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

interface MiniLecturePlayerProps {
  course: {
    id: string;
    title: string;
    slug?: string;
    description?: string;
    author?: { name: string; id: string };
    children?: Page[];
    createdAt?: string;
    updatedAt?: string;
  };
  initialLessonId?: string;
  studentId?: string;
  studentName?: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────

export default function MiniLecturePlayer({
  course,
  initialLessonId,
  studentId,
  studentName,
  onClose,
}: MiniLecturePlayerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    initialLessonId || course.id || course.children?.[0]?.id || null
  );
  const [currentLesson, setCurrentLesson] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLessonList, setShowLessonList] = useState(false);
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set());
  const [resolvedQuizMap, setResolvedQuizMap] = useState<Record<string, any>>({});

  const lessonSequence = useMemo<Page[]>(() => {
    const rootLesson: Page = {
      id: course.id,
      title: course.title,
      slug: course.slug || '',
      description: course.description,
    };
    const childLessons = (course.children || []).filter((child) => child.id !== course.id);
    return [rootLesson, ...childLessons];
  }, [course]);

  useEffect(() => {
    setSelectedLessonId(initialLessonId || course.id || course.children?.[0]?.id || null);
  }, [initialLessonId, course.id, course.children]);

  // Fetch lesson details when selected
  useEffect(() => {
    if (!selectedLessonId) return;
    
    const fetchLesson = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/pages/${selectedLessonId}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentLesson(data);
        }
      } catch (err) {
        console.error('Error fetching lesson:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLesson();
  }, [selectedLessonId]);

  // Resolve quiz data from video interactions in current lesson
  useEffect(() => {
    if (!currentLesson?.blocks?.length) return;
    const quizIds = new Set<string>();
    currentLesson.blocks.forEach((block) => {
      if (block.type === 'VIDEO' && block.interactions) {
        let interactions = block.interactions;
        if (typeof interactions === 'string') {
          try { interactions = JSON.parse(interactions); } catch { return; }
        }
        if (Array.isArray(interactions)) {
          interactions.forEach((i: any) => { if (i.quizId) quizIds.add(i.quizId); });
        }
      }
    });
    if (!quizIds.size) return;
    const fetchQuizzes = async () => {
      const results: Record<string, any> = {};
      await Promise.all(
        [...quizIds].map(async (id) => {
          try {
            const res = await fetch(`/api/quiz/${id}`);
            if (res.ok) results[id] = await res.json();
          } catch { /* ignore */ }
        })
      );
      setResolvedQuizMap((prev) => ({ ...prev, ...results }));
    };
    fetchQuizzes();
  }, [currentLesson]);

  // Resolve interactions for a block
  const resolveInteractions = useCallback((raw: any) => {
    let interactions = raw;
    if (typeof interactions === 'string') {
      try { interactions = JSON.parse(interactions); } catch { return []; }
    }
    if (!Array.isArray(interactions)) return [];
    return interactions.map((item: any) => ({
      ...item,
      quizData: resolvedQuizMap[item.quizId] ?? null,
    }));
  }, [resolvedQuizMap]);

  // Navigate to next/previous lesson
  const navigateLesson = useCallback((direction: 'prev' | 'next') => {
    if (!selectedLessonId) return;

    const currentIndex = lessonSequence.findIndex(l => l.id === selectedLessonId);
    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(lessonSequence.length - 1, currentIndex + 1);
    }

    setSelectedLessonId(lessonSequence[newIndex].id);
  }, [lessonSequence, selectedLessonId]);

  // Get current lesson index
  const currentIndex = lessonSequence.findIndex(l => l.id === selectedLessonId);
  const totalLessons = lessonSequence.length;

  // ─── Minimized View (very near student name - top right corner) ──────────────────────────
  if (!isExpanded) {
    return (
      <div className="fixed top-16 right-4 z-50 animate-in slide-in-from-top-2 duration-200">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-600 to-cyan-600">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/70 font-medium">Đang học</div>
              <div className="text-sm font-bold text-white truncate">{course.title}</div>
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Mở rộng"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Current lesson info */}
          {currentLesson && (
            <div className="p-3 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                  {currentIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                    {currentLesson.title}
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / totalLessons) * 100}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Bài {currentIndex + 1}/{totalLessons}
              </div>
            </div>
          )}

          {/* Quick navigation */}
          <div className="flex items-center gap-1 p-2 pt-0">
            <button
              onClick={() => navigateLesson('prev')}
              disabled={currentIndex <= 0}
              className="flex-1 p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mx-auto text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setIsExpanded(true)}
              className="flex-1 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4 mx-auto text-white" />
            </button>
            <button
              onClick={() => navigateLesson('next')}
              disabled={currentIndex >= totalLessons - 1}
              className="flex-1 p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 mx-auto text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Expanded View ────────────────────────────────────────────────
  return (
    <div className={`fixed z-50 bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden transition-all duration-300 ${
      isFullscreen 
        ? 'inset-0 rounded-none' 
        : 'bottom-4 right-4 w-[80vw] max-w-[1000px] h-[70vh] rounded-2xl'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs text-white/70">Khóa học</div>
              <div className="text-sm font-bold text-white">{course.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowLessonList(!showLessonList)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Danh sách bài học"
            >
              <Layers className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={() => { setIsExpanded(false); setIsFullscreen(false); }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Thu gọn"
            >
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Lesson navigation */}
        {currentLesson && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => navigateLesson('prev')}
              disabled={currentIndex <= 0}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1 text-center">
              <div className="text-xs text-white/70">
                Bài {currentIndex + 1}/{totalLessons}
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {currentLesson.title}
              </div>
            </div>
            <button
              onClick={() => navigateLesson('next')}
              disabled={currentIndex >= totalLessons - 1}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex h-[calc(100%-120px)]">
        {/* Lesson list sidebar */}
        {showLessonList && (
          <div className="w-48 border-r border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Danh sách bài học
              </div>
              {lessonSequence.map((lesson, idx) => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setSelectedLessonId(lesson.id);
                    setShowLessonList(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg mb-1 transition-colors ${
                    selectedLessonId === lesson.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
                      selectedLessonId === lesson.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {idx === 0 ? 'G' : idx}
                    </span>
                    <span className="text-xs truncate">{idx === 0 ? `${lesson.title} (Nội dung chính)` : lesson.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Đang tải...</p>
              </div>
            </div>
          ) : currentLesson ? (
            <div className="p-4 space-y-4">
              {/* Lesson title */}
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {currentLesson.title}
                </h2>
                {currentLesson.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {currentLesson.description.replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, '')}
                  </p>
                )}
              </div>

              {/* Blocks */}
              {!currentLesson.blocks?.length ? (
                <div className="text-center py-8 text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Bài học chưa có nội dung</p>
                </div>
              ) : (
                currentLesson.blocks.map((block) => (
                  <BlockRenderer key={block.id} block={block} resolveInteractions={resolveInteractions} />
                ))
              )}

              {/* Comments */}
              {studentId && (
                <div className="mt-6">
                  <CommentsContainer
                    blockId={`page-${currentLesson.id}`}
                    authorId={studentId}
                    currentUserRole="STUDENT"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-sm">Chọn một bài học để bắt đầu</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress footer */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
        <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalLessons) * 100}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-center text-gray-400 dark:text-gray-500">
          Tiến độ: {currentIndex + 1}/{totalLessons} bài học
        </div>
      </div>
    </div>
  );
}

// ─── Block Renderer ──────────────────────────────────────────────────

function BlockRenderer({ block, resolveInteractions }: { block: PageBlock; resolveInteractions?: (raw: any) => any[] }) {
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set());

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4">
        {/* VIDEO */}
        {block.type === "VIDEO" && block.videoUrl && (
          <StudentVideoViewer
            videoUrl={block.videoUrl}
            videoType={(block.videoType as any) || "upload"}
            poster={block.poster}
            interactions={resolveInteractions ? resolveInteractions(block.interactions) : []}
            title="Video bài học"
          />
        )}

        {/* DOCUMENT – Interactive Lesson or legacy documents */}
        {block.type === "DOCUMENT" && block.content && block.content.startsWith("{") && (
          <InteractiveLessonViewer content={block.content} />
        )}
        {block.type === "DOCUMENT" && (!block.content || !block.content.startsWith("{")) && block.content && block.content.startsWith("/") && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <iframe src={block.content} className="w-full border-0" style={{ height: '450px' }} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Interactive lesson" />
          </div>
        )}
        {block.type === "DOCUMENT" && !block.content && (
          <DocumentBlockComponent
            id={block.id}
            documents={block.documents ?? []}
            onAddDocument={async () => {}}
            onDeleteDocument={async () => {}}
            onDelete={async () => {}}
          />
        )}

        {/* QUIZ */}
        {block.type === "QUIZ" && (block.quiz || block.quizzes?.length) && (
          <div className="space-y-3">
            {block.quiz && (
              <QuizAccordion
                quizId={`${block.id}-${block.quiz.id}`}
                title={block.quiz.title || "Bộ Câu Hỏi"}
                quiz={block.quiz}
                expanded={expandedQuizzes}
                onToggle={setExpandedQuizzes}
              />
            )}
            {block.quizzes?.map((quiz: any, i: number) => (
              <QuizAccordion
                key={quiz.id}
                quizId={`${block.id}-${quiz.id}`}
                title={quiz.title ?? `Bộ Câu Hỏi ${i + 1}`}
                quiz={quiz}
                expanded={expandedQuizzes}
                onToggle={setExpandedQuizzes}
              />
            ))}
          </div>
        )}

        {/* LINK */}
        {block.type === "LINK" && block.url && (
          <LinkBlockComponent
            block={{
              id: block.id,
              url: block.url,
              label: block.label,
              description: block.description,
            }}
            readOnly={true}
          />
        )}

        {/* CONTENT */}
        {block.type === "CONTENT" && block.items && block.items.length > 0 && (
          <div className="space-y-3">
            {block.items.map((item: any) =>
              item.shortcutUrl ? (
                <LinkBlockComponent
                  key={item.id}
                  block={{
                    id: item.id,
                    url: item.shortcutUrl,
                    label: item.title,
                  }}
                  readOnly={true}
                />
              ) : null
            )}
          </div>
        )}

        {/* RICH_TEXT */}
        {block.type === "RICH_TEXT" && (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: block.richTextContent || block.content || '<p class="text-gray-400 italic">Chưa có nội dung</p>'
            }}
          />
        )}

        {/* Legacy TEXT */}
        {block.type === "TEXT" && (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: block.content || '<p class="text-gray-400 italic">Chưa có nội dung</p>'
            }}
          />
        )}

        {/* FLASHCARD */}
        {block.type === "FLASHCARD" && (
          <FlashcardBlockComponent
            id={block.id}
            title={block.flashcardTitle || 'Flashcards'}
            cards={block.flashcards || []}
            readOnly={true}
            studentId=""
          />
        )}

        {/* CANVA/Slide */}
        {block.type === "CANVA" && block.slidesData && (
          <CanvaSlideViewerBlock slidesData={block.slidesData} blockId={block.id} />
        )}

        {/* EMBED */}
        {block.type === "EMBED" && block.content && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <iframe
              src={block.content}
              className="w-full border-0"
              style={{ height: '450px' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Embedded content"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Quiz Accordion ──────────────────────────────────────────────────

function QuizAccordion({
  quizId,
  title,
  quiz,
  expanded,
  onToggle,
}: {
  quizId: string;
  title: string;
  quiz: any;
  expanded: Set<string>;
  onToggle: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const isOpen = expanded.has(quizId);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
      <button
        onClick={() =>
          onToggle((prev) => {
            const s = new Set(prev);
            s.has(quizId) ? s.delete(quizId) : s.add(quizId);
            return s;
          })
        }
        className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 hover:from-indigo-100 dark:hover:from-indigo-900/30 transition text-left"
      >
        <span className="text-sm">{isOpen ? "▼" : "▶"}</span>
        <span className="font-semibold text-indigo-800 dark:text-indigo-300 text-sm">🎯 {title}</span>
        <span className="ml-auto text-xs text-indigo-500 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
          {quiz.questions?.length ?? 0} câu
        </span>
      </button>
      {isOpen && (
        <div className="p-4 bg-white dark:bg-slate-800">
          <QuizViewer quiz={quiz} readOnly={false} />
        </div>
      )}
    </div>
  );
}