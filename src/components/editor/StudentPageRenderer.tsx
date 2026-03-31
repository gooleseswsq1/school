"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import StudentVideoViewer from "@/components/student/StudentVideoViewer";
import DocumentBlockComponent from "./DocumentBlockComponent";
import QuizViewer from "./QuizViewer";
import PageTree from "./PageTree";
import CommentsContainer from "./CommentsContainer";
import StudentNotesPanel from "./StudentNotesPanel";
import FlashcardBlockComponent from "./FlashcardBlockComponent";
import CanvaSlideViewerBlock from "./CanvaSlideViewer";
import InteractiveLessonViewer from "@/components/student/InteractiveLessonViewer";
import { BookOpen, ChevronRight, AlertCircle, Link2, ExternalLink, Globe } from "lucide-react";
import LinkBlockComponent from "./LinkBlockComponent";

// ─── Types ────────────────────────────────────────────────────────────

interface ContentItem {
  id: string;
  title: string;
  image?: string;
  shortcutUrl?: string;
  shortcutCode?: string;
}

interface PageBlock {
  id: string;
  type: "VIDEO" | "DOCUMENT" | "TEXT" | "CONTENT" | "QUIZ" | "CANVA" | "LINK" | "RICH_TEXT" | "FLASHCARD" | "EMBED";
  order: number;
  videoUrl?: string;
  videoType?: string;
  poster?: string;
  interactions?: any;
  content?: string;
  items?: ContentItem[];
  quiz?: any;
  quizzes?: any[];
  documents?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize?: number;
  }>;
  // LINK block fields
  url?: string;
  label?: string;
  description?: string;
  // Rich Text fields
  richTextContent?: string;
  // Canva fields
  slidesData?: any;
  // Flashcard fields
  flashcardTitle?: string;
  flashcards?: Array<{
    id: string;
    front: string;
    back: string;
    hint?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    confidence?: number;
    reviewCount?: number;
    isStarred?: boolean;
  }>;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  description?: string;
  parentId?: string;
  parent?: { id: string; title: string };
  children: Page[];
  blocks: PageBlock[];
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  authorId: string;
}

interface StudentPageRendererProps {
  pageId: string;
  authorId: string;
  studentId?: string;
  studentName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Recursively collect all quizIds referenced inside video interactions */
function collectQuizIdsFromPages(pages: Page[]): Set<string> {
  const ids = new Set<string>();
  const traverse = (p: Page) => {
    p.blocks?.forEach((block) => {
      if (block.type === "VIDEO" && block.interactions) {
        let interactions = block.interactions;
        if (typeof interactions === "string") {
          try {
            interactions = JSON.parse(interactions);
          } catch {
            return;
          }
        }
        if (Array.isArray(interactions)) {
          interactions.forEach((i: any) => {
            if (i.quizId) ids.add(i.quizId);
          });
        }
      }
    });
    p.children?.forEach(traverse);
  };
  pages.forEach(traverse);
  return ids;
}

/** Find a page by id anywhere in the page tree */
function findPageById(pages: Page[], id: string): Page | null {
  for (const page of pages) {
    if (page.id === id) return page;
    const found = findPageById(page.children ?? [], id);
    if (found) return found;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────

export default function StudentPageRenderer({
  pageId,
  authorId,
  studentId,
}: StudentPageRendererProps) {
  const { user } = useAuth({ redirectOnUnauth: false });
  const currentUserId = studentId || user?.id || "";

  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>(pageId);
  const [resolvedQuizMap, setResolvedQuizMap] = useState<Record<string, any>>({});
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPage = findPageById(pages, selectedPageId) ?? null;

  // ── Fetch all pages ────────────────────────────────────────────────
  useEffect(() => {
    if (!authorId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/pages?authorId=${authorId}&includeDrafts=false`);
        if (!res.ok) throw new Error("Không thể tải trang");
        setPages(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [authorId]);

  // ── Resolve quiz data from video interactions ──────────────────────
  useEffect(() => {
    if (!pages.length) return;
    const quizIds = collectQuizIdsFromPages(pages);
    if (!quizIds.size) return;

    const fetchAll = async () => {
      const results: Record<string, any> = {};
      await Promise.all(
        [...quizIds].map(async (id) => {
          try {
            const res = await fetch(`/api/quiz/${id}`);
            if (res.ok) results[id] = await res.json();
          } catch {
            console.warn(`[StudentPageRenderer] Cannot resolve quiz ${id}`);
          }
        })
      );
      setResolvedQuizMap(results);
    };

    fetchAll();
  }, [pages]);

  // ── Attach resolved quiz objects to raw interaction data ───────────
  const resolveInteractions = useCallback(
    (raw: any) => {
      let interactions = raw;
      if (typeof interactions === "string") {
        try {
          interactions = JSON.parse(interactions);
        } catch {
          return [];
        }
      }
      if (!Array.isArray(interactions)) return [];
      return interactions.map((item: any) => ({
        ...item,
        quizData: resolvedQuizMap[item.quizId] ?? null,
      }));
    },
    [resolvedQuizMap]
  );

  // ── Loading / Error states ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-500 font-medium">Đang tải nội dung...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-3 p-8 bg-white rounded-2xl shadow-sm border border-red-100 max-w-sm">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Không thể tải trang</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Page Header */}
      {currentPage && (
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 shadow-sm">
          <div className="max-w-4xl mx-auto">
            {currentPage.parent && (
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                <span>{currentPage.parent.title}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-blue-600 font-medium">{currentPage.title}</span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {currentPage.title}
            </h1>
            {currentPage.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentPage.description.replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, '')}</p>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {currentPage ? (
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6 pb-24">
            {!currentPage.blocks?.length ? (
              <EmptyState message="Trang này chưa có nội dung." />
            ) : (
              currentPage.blocks.map((block) => (
                <BlockWrapper key={block.id}>
                  {block.type === "VIDEO" && block.videoUrl && (
                    <StudentVideoViewer
                      videoUrl={block.videoUrl}
                      videoType={(block.videoType as any) || "upload"}
                      poster={block.poster}
                      interactions={resolveInteractions(block.interactions)}
                      title={currentPage.title}
                    />
                  )}

                  {block.type === "DOCUMENT" && block.content && block.content.startsWith("{") && (
                    <InteractiveLessonViewer content={block.content} />
                  )}
                  {block.type === "DOCUMENT" && block.content && block.content.startsWith("/") && (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <iframe src={block.content} className="w-full border-0" style={{ height: '500px' }} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Interactive lesson" />
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

                  {/* LINK block */}
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

                  {/* CONTENT block - render shortcutUrl items */}
                  {block.type === "CONTENT" && block.items && block.items.length > 0 && (
                    <div className="space-y-3">
                      {block.items.map((item) =>
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

                  {/* RICH_TEXT block */}
                  {block.type === "RICH_TEXT" && (
                    <div 
                      className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-blue-600 prose-strong:text-slate-700"
                      dangerouslySetInnerHTML={{ 
                        __html: block.richTextContent || block.content || '<p class="text-slate-400 italic">Chưa có nội dung</p>'
                      }}
                    />
                  )}

                  {/* Legacy TEXT block */}
                  {block.type === "TEXT" && (
                    <div 
                      className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-blue-600 prose-strong:text-slate-700"
                      dangerouslySetInnerHTML={{ 
                        __html: block.content || '<p class="text-slate-400 italic">Chưa có nội dung</p>'
                      }}
                    />
                  )}

                  {/* FLASHCARD block */}
                  {block.type === "FLASHCARD" && (
                    <FlashcardBlockComponent
                      id={block.id}
                      title={block.flashcardTitle || 'Flashcards'}
                      cards={block.flashcards || []}
                      readOnly={true}
                      studentId={currentUserId}
                    />
                  )}

                  {/* CANVA/Slide block */}
                  {block.type === "CANVA" && block.slidesData && (
                    <CanvaSlideViewerBlock slidesData={block.slidesData} blockId={block.id} />
                  )}

                  {/* EMBED block */}
                  {block.type === "EMBED" && block.content && (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <iframe
                        src={block.content}
                        className="w-full border-0"
                        style={{ height: '500px' }}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        title="Embedded content"
                      />
                    </div>
                  )}
                </BlockWrapper>
              ))
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <EmptyState message="Không tìm thấy bài giảng." />
          </div>
        )}
      </main>

      {/* Student Notes Panel */}
      {currentUserId && currentPage && (
        <StudentNotesPanel
          studentId={currentUserId}
          pageId={currentPage.id}
        />
      )}

      {/* Comments */}
      {currentUserId && currentPage && (
        <div className="max-w-4xl mx-auto px-6 pb-8">
          <CommentsContainer
            blockId={`page-${currentPage.id}`}
            authorId={currentUserId}
            currentUserRole="STUDENT"
          />
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function BlockWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6">{children}</div>
    </div>
  );
}

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
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() =>
          onToggle((prev) => {
            const s = new Set(prev);
            s.has(quizId) ? s.delete(quizId) : s.add(quizId);
            return s;
          })
        }
        className="w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 transition text-left"
      >
        <span className="text-lg">{isOpen ? "▼" : "▶"}</span>
        <span className="font-semibold text-indigo-800">🎯 {title}</span>
        <span className="ml-auto text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
          {quiz.questions?.length ?? 0} câu
        </span>
      </button>
      {isOpen && (
        <div className="p-6 bg-white">
          <QuizViewer quiz={quiz} readOnly={false} />
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-slate-400">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen className="w-7 h-7 text-slate-300" />
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}