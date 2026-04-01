'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSlideStore } from '@/stores/slideStore';
import { SlideThumbnailBar } from './SlideThumbnailBar';
import {
  Menu,
  X,
  Play,
  Save,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Upload,
  CheckCircle,
  ArrowRight,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Type,
  Trash2,
  Lightbulb,
  ChevronDown,
  FileText,
} from 'lucide-react';
import MagicQuizBuilder from './editor/MagicQuizBuilder';
import QuizViewer from './editor/QuizViewer';
import { canvaToLesson } from '@/utils/canvaToLesson';
import { getAuthUser } from '@/lib/auth-storage';
import toast from 'react-hot-toast';
// Note: CheckCircle & ArrowRight used in quiz phase UI

// Dynamic import
const CanvasEditorPro = dynamic(
  () => import('./CanvasEditorPro').then((mod) => ({ default: mod.CanvasEditorPro })),
  { ssr: false }
);

import type { CanvasEditorProHandle } from './CanvasEditorPro';

interface MiniCanvaAppProps {
  isModal?: boolean;
  blockId?: string;
  initialSlidesData?: any;
  onClose?: (slidesData: any) => void;
}

type ImageSource = 'upload' | 'background' | 'paste';

async function hashText(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashDataUrl(dataUrl: string): Promise<string> {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return hashText(dataUrl);
  const b64 = dataUrl.slice(comma + 1);
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return hashText(dataUrl);
  }
}

async function computeImageHash(url: string): Promise<string> {
  if (url.startsWith('data:')) return hashDataUrl(url);
  return hashText(url);
}

function getImageUrlsFromSlides(slides: any[]): string[] {
  const urls = new Set<string>();
  for (const slide of slides || []) {
    const objects = slide?.canvasData?.objects;
    if (!Array.isArray(objects)) continue;
    for (const obj of objects) {
      if (obj?.type === 'image' && typeof obj?.src === 'string' && obj.src) {
        urls.add(obj.src);
      }
    }
  }
  return Array.from(urls);
}

export const MiniCanvaApp: React.FC<MiniCanvaAppProps> = ({
  isModal = false,
  blockId,
  initialSlidesData,
  onClose,
}) => {
  const router = useRouter();
  const { slides, currentSlideIndex, setCurrentSlide, updateSlide, addSlide, initializeSlides, resetSlides } =
    useSlideStore();
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false); // New: Review mode for teacher preview
  const [zoom, setZoom] = useState(1);
  const [autoNextAfterAudio, setAutoNextAfterAudio] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAnimation, setSelectedAnimation] = useState<string | null>(null);

  // ── Quiz per-slide system ─────────────────────────────────────
  // editingQuiz: show MagicQuizBuilder in sidebar
  const [editingQuiz, setEditingQuiz] = useState(false);
  // presentQuizPhase: in presentation/review mode — 'slide' | 'quiz'
  const [presentQuizPhase, setPresentQuizPhase] = useState<'slide'|'quiz'>('slide');
  // Track which slides teacher/student has answered quiz on
  const [quizDoneSlides, setQuizDoneSlides] = useState<Set<string>>(new Set());

  const [userId, setUserId] = useState<string>('anonymous');
  const [imageLibrary, setImageLibrary] = useState<string[]>([]);
  const [imageHashesByUrl, setImageHashesByUrl] = useState<Record<string, string>>({});

  const getLibraryKey = useCallback((uid: string) => `mini-canva-image-library:${uid}`, []);
  const getHiddenKey = useCallback((uid: string) => `mini-canva-hidden-images:${uid}`, []);
  const getRefsKey = useCallback((uid: string) => `mini-canva-image-refs:${uid}`, []);

  useEffect(() => {
    try {
      const auth = getAuthUser();
      setUserId(auth?.id || 'anonymous');
    } catch {
      setUserId('anonymous');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let aborted = false;

    const loadLibrary = async () => {
      try {
        const res = await fetch(`/api/canva-image-library`);
        if (res.ok) {
          const json = await res.json();
          const items: Array<{ url: string; hash: string }> = json?.images || [];
          if (aborted) return;
          setImageLibrary(items.map((i) => i.url));
          const map: Record<string, string> = {};
          for (const item of items) map[item.url] = item.hash;
          setImageHashesByUrl(map);
          return;
        }
      } catch {
        // Fallback to local storage for resilience
      }

      try {
        const stored = localStorage.getItem(getLibraryKey(userId));
        if (aborted) return;
        setImageLibrary(stored ? JSON.parse(stored) : []);
      } catch {
        if (!aborted) setImageLibrary([]);
      }
    };

    loadLibrary();
    return () => {
      aborted = true;
    };
  }, [userId, getLibraryKey]);

  const persistLibrary = useCallback((next: string[]) => {
    try {
      localStorage.setItem(getLibraryKey(userId), JSON.stringify(next));
    } catch {}
  }, [getLibraryKey, userId]);

  const persistHiddenImages = useCallback((next: string[]) => {
    try {
      localStorage.setItem(getHiddenKey(userId), JSON.stringify(next));
    } catch {}
  }, [getHiddenKey, userId]);

  const handleImageUploaded = useCallback(async (url: string, options?: { source?: ImageSource }) => {
    const source = options?.source || 'upload';
    const hash = await computeImageHash(url);

    setImageHashesByUrl((prev) => ({ ...prev, [url]: hash }));

    try {
      if (userId !== 'anonymous') {
        await fetch('/api/canva-image-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockId, url, hash, source }),
        });
      }
    } catch {
      // Keep local fallback behavior below.
    }

    if (source === 'paste') {
      try {
        const raw = localStorage.getItem(getHiddenKey(userId));
        const hidden: string[] = raw ? JSON.parse(raw) : [];
        const nextHidden = [url, ...hidden.filter((u) => u !== url)].slice(0, 200);
        persistHiddenImages(nextHidden);
      } catch {}
      return;
    }

    setImageLibrary((prev) => {
      const updated = [url, ...prev.filter((u) => u !== url)].slice(0, 50);
      persistLibrary(updated);
      return updated;
    });
  }, [blockId, getHiddenKey, persistHiddenImages, persistLibrary, userId]);

  const removeFromLibrary = useCallback(async (url: string) => {
    const hash = imageHashesByUrl[url] || await computeImageHash(url);
    try {
      if (userId !== 'anonymous') {
        await fetch('/api/canva-image-library', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash }),
        });
      }
    } catch {
      // ignore and keep local update below
    }

    setImageLibrary((prev) => {
      const updated = prev.filter((u) => u !== url);
      persistLibrary(updated);
      return updated;
    });
  }, [imageHashesByUrl, persistLibrary, userId]);

  // Sync image references by block and cleanup hidden clipboard images that are no longer used.
  useEffect(() => {
    if (typeof window === 'undefined' || !blockId) return;

    try {
      const refsKey = getRefsKey(userId);
      const refsRaw = localStorage.getItem(refsKey);
      const refsMap: Record<string, string[]> = refsRaw ? JSON.parse(refsRaw) : {};
      refsMap[blockId] = getImageUrlsFromSlides(slides);
      localStorage.setItem(refsKey, JSON.stringify(refsMap));

      const allUsed = new Set<string>(Object.values(refsMap).flat());
      const hiddenRaw = localStorage.getItem(getHiddenKey(userId));
      const hidden: string[] = hiddenRaw ? JSON.parse(hiddenRaw) : [];
      const cleanedHidden = hidden.filter((u) => allUsed.has(u));
      if (cleanedHidden.length !== hidden.length) {
        persistHiddenImages(cleanedHidden);
      }
    } catch (e) {
      console.warn('Failed to sync image references:', e);
    }
  }, [blockId, slides, userId, getRefsKey, getHiddenKey, persistHiddenImages]);

  useEffect(() => {
    if (!blockId || userId === 'anonymous') return;
    let canceled = false;

    const syncRefs = async () => {
      const urls = getImageUrlsFromSlides(slides);
      const hashes = await Promise.all(
        urls.map(async (url) => imageHashesByUrl[url] || computeImageHash(url))
      );
      if (canceled) return;

      try {
        await fetch('/api/canva-image-library/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockId, hashes }),
        });
      } catch {
        // best-effort sync
      }
    };

    syncRefs();
    return () => {
      canceled = true;
    };
  }, [blockId, slides, userId, imageHashesByUrl]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasEditorRef = useRef<CanvasEditorProHandle>(null);

  const currentSlide = slides[currentSlideIndex];

  // Load initial slides data when modal opens or blockId is set
  useEffect(() => {
    if (isModal || blockId) {
      if (initialSlidesData) {
        try {
          const raw = typeof initialSlidesData === 'string'
            ? JSON.parse(initialSlidesData)
            : initialSlidesData;

          // Support both legacy (bare array) and new { slides, autoNextAfterAudio } format
          const slidesArr = Array.isArray(raw) ? raw : (Array.isArray(raw?.slides) ? raw.slides : null);
          if (raw?.autoNextAfterAudio !== undefined) setAutoNextAfterAudio(!!raw.autoNextAfterAudio);

          if (slidesArr && slidesArr.length > 0) {
            initializeSlides(slidesArr);
          } else {
            // If initialSlidesData is present but empty, reset to fresh slide
            resetSlides();
          }
        } catch (error) {
          console.error('Error parsing slides data:', error);
          resetSlides();
        }
      } else {
        // If initialSlidesData is null/undefined, reset to fresh slide for new block
        resetSlides();
      }
    }
  }, [isModal, blockId, initialSlidesData, initializeSlides, resetSlides]);

  // Cleanup when unmounting - always reset store to prevent data leakage
  useEffect(() => {
    return () => {
      // Reset slides when component unmounts to prevent data persisting across different blocks
      // This is critical when switching between different lectures/blocks
      resetSlides();
    };
  }, [resetSlides]);

  // Handle background color change from sidebar
  const handleBackgroundColorChange = (color: string) => {
    if (currentSlide) {
      updateSlide(currentSlide.id, { backgroundColor: color });
    }
  };

  // Auto-advance slides based on audio duration (only if enabled)
  useEffect(() => {
    if (!isPresentMode || !currentSlide?.audioUrl || !autoNextAfterAudio) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handleAudioEnd = () => {
      if (currentSlideIndex < slides.length - 1) {
        setCurrentSlide(currentSlideIndex + 1);
      }
    };

    audio.src = currentSlide.audioUrl;
    audio.play();
    audio.addEventListener('ended', handleAudioEnd);

    return () => {
      audio.removeEventListener('ended', handleAudioEnd);
      audio.pause();
    };
  }, [isPresentMode, currentSlide, currentSlideIndex, slides.length, setCurrentSlide, autoNextAfterAudio]);

  // ── Animation: use onReady callback from CanvasEditorPro instead of a fixed delay ──
  // This eliminates the "appear → disappear → animate-in" flicker because animated
  // objects are already hidden (opacity=0) by the time the canvas first renders.
  const handleCanvasReady = useCallback(() => {
    try {
      canvasEditorRef.current?.runAnimations?.();
    } catch (e) {
      // ignore
    }
  }, [currentSlideIndex]);

  // Reset quiz state when slide changes
  React.useEffect(() => {
    setEditingQuiz(false);
    setPresentQuizPhase('slide');
  }, [currentSlideIndex]);

  const handleNextSlide = useCallback(() => {
    const slide   = slides[currentSlideIndex];
    const hasQuiz = !!slide?.quiz;
    const done    = slide ? quizDoneSlides.has(slide.id) : true;
    // Block navigation if quiz not answered yet
    if ((isPresentMode || isReviewMode) && hasQuiz && !done) {
      setPresentQuizPhase('quiz');
      return;
    }
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlide(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, slides, slides.length, setCurrentSlide, isPresentMode, isReviewMode, quizDoneSlides]);

  const handlePreviousSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlide(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, setCurrentSlide]);

  const handleExitPresentation = useCallback(() => {
    // Reset canvas to original state before exiting presentation mode
    try {
      // First reset all objects to visible state
      canvasEditorRef.current?.resetAllObjects?.();
      // Then reload the full canvas from original data to remove any animation artifacts
      setTimeout(() => {
        canvasEditorRef.current?.resetCanvasToOriginalState?.();
      }, 100);
    } catch (e) {
      console.error('Error resetting canvas:', e);
    }
    setIsPresentMode(false);
  }, []);

  const handleExitReviewMode = useCallback(() => {
    // Reset canvas when exiting review mode (same as exiting presentation)
    try {
      canvasEditorRef.current?.resetAllObjects?.();
      setTimeout(() => {
        canvasEditorRef.current?.resetCanvasToOriginalState?.();
      }, 100);
    } catch (e) {
      console.error('Error resetting canvas:', e);
    }
    setIsReviewMode(false);
  }, []);

  // Keyboard navigation in presentation mode (Space, Arrow keys)
  useEffect(() => {
    if (!isPresentMode && !isReviewMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousSlide();
      } else if (e.key === 'Escape') {
        if (isPresentMode) handleExitPresentation();
        if (isReviewMode) handleExitReviewMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentMode, isReviewMode, handleExitPresentation, handleExitReviewMode, handleNextSlide, handlePreviousSlide]);

  const handleAddTextTemplate = (type: 'heading' | 'description' | 'note') => {
    canvasEditorRef.current?.addTextTemplate(type);
  };

  // Called when user clicks 💡 Quiz button in CanvasEditorPro toolbar
  const handleAddQuiz = () => {
    setIsLeftPanelOpen(true);
    setEditingQuiz(true);
    setTimeout(() => {
      document.getElementById('sidebar-quiz-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  const handleAddStockImage = (url: string) => {
    canvasEditorRef.current?.addImageFromUrl(url);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSlide) return;
    const url = URL.createObjectURL(file);
    updateSlide(currentSlide.id, { audioUrl: url });
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        canvasEditorRef.current?.setBackgroundImage(url);
        // Also save to image library so user can reuse it on other slides
        handleImageUploaded(url, { source: 'background' });
      }
    };
    reader.readAsDataURL(file);
  };

  // Xử lý "Hoàn tát & Lưu" trong Modal mode
  const handleSaveAndClose = async () => {
    if (isModal && onClose) {
      try {
        setIsSaving(true);
        // Wrap slides + settings so CanvaSlideViewer can read autoNextAfterAudio
        const slidesData = { slides, autoNextAfterAudio };
        onClose(slidesData);
      } catch (e) {
        console.error('Error saving:', e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Handle Save for Full Page Mode
  const handleSaveFullPage = async () => {
    if (!blockId || isModal) return;

    try {
      setIsSaving(true);
      
      // Convert slides + settings to JSON string, handling potential circular references
      let slidesData: string;
      try {
        slidesData = JSON.stringify({ slides, autoNextAfterAudio });
      } catch (e) {
        console.error('Failed to stringify slides:', e);
        throw new Error('Slides data cannot be serialized');
      }
      
      console.log('Saving canvas data, size:', new Blob([slidesData]).size, 'bytes');
      console.log('Block ID:', blockId);
      
      const response = await fetch(`/api/blocks/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slidesData }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: response.statusText };
        }
        console.error('API Error Response:', errorData);
        console.error('Response Status:', response.status);
        throw new Error(errorData.error || errorData.details?.message || `API Error: ${response.status}`);
      }

      console.log('Canvas saved successfully');
      const savedToast = document.createElement('div');
      savedToast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl z-50 font-medium flex items-center gap-2';
      savedToast.innerHTML = '✅ Canvas đã được lưu thành công!';
      document.body.appendChild(savedToast);
      
      // Navigate back to teacher editor after 1.5 seconds.
      // IMPORTANT: Next.js App Router caches the previous page, so router.back() alone
      // returns stale data. We listen for the popstate event (fires when back() completes)
      // then call router.refresh() to force the server to re-fetch fresh block data —
      // this is what makes quiz/slides appear immediately after saving.
      setTimeout(() => {
        savedToast.remove();
        const onNavComplete = () => {
          router.refresh(); // bust the cache so updated slidesData is visible
        };
        window.addEventListener('popstate', onNavComplete, { once: true });
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error saving canvas:', error);
      const errorToast = document.createElement('div');
      errorToast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorToast.textContent = `Lỗi khi lưu canvas: ${error instanceof Error ? error.message : 'Unknown error'}`;
      document.body.appendChild(errorToast);
      setTimeout(() => errorToast.remove(), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Xuất slides thành bài giảng tương tác
  const handleExportToLesson = async () => {
    if (!blockId) {
      toast.error('Vui lòng lưu trước khi xuất bài giảng');
      return;
    }
    try {
      setIsSaving(true);
      const slidesData = { slides, autoNextAfterAudio };
      const lessonData = canvaToLesson(slidesData, 'Bài giảng từ Canva');
      if (!lessonData) {
        toast.error('Không có dữ liệu slides để xuất');
        return;
      }

      // Tạo block DOCUMENT mới cùng page chứa block CANVA hiện tại  
      const res = await fetch(`/api/blocks/${blockId}`);
      if (!res.ok) throw new Error('Không thể lấy thông tin block');
      const blockInfo = await res.json();
      const pageId = blockInfo.pageId;

      if (!pageId) {
        toast.error('Không tìm được trang chứa block');
        return;
      }

      // Tạo block bài giảng tương tác mới
      const createRes = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          type: 'DOCUMENT',
          content: JSON.stringify(lessonData),
        }),
      });

      if (!createRes.ok) throw new Error('Không thể tạo bài giảng');

      toast.success('🎉 Đã xuất thành bài giảng tương tác! Quay lại trang để xem.');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất bài giảng');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentSlide) {
    return (
      <div className={`flex items-center justify-center ${isModal ? 'h-full w-full' : 'h-screen w-screen'} bg-gray-900`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">Mini Canva</h1>
          <p className="text-gray-400 mt-4">Chưa có slide nào</p>
          <button
            onClick={addSlide}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tạo slide mới
          </button>
        </div>
      </div>
    );
  }

  // Presentation Mode View
  if (isPresentMode) {
    const presSlide   = slides[currentSlideIndex];
    const presHasQuiz = !!presSlide?.quiz;
    const presDone    = presSlide ? quizDoneSlides.has(presSlide.id) : true;

    // ── Quiz phase: replace canvas with full-screen quiz ──────────────
    if (presentQuizPhase === 'quiz' && presSlide?.quiz) {
      return (
        <div className={`flex flex-col ${isModal ? 'h-full' : 'fixed inset-0'} bg-gray-950 z-50`}>
          <div className="flex-1 overflow-y-auto flex items-start justify-center p-6">
            <div className="w-full max-w-2xl">
              {/* Quiz card */}
              <div className="rounded-2xl border border-violet-300/30 bg-white shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lightbulb size={22} />
                    <div>
                      <p className="text-xs opacity-70 uppercase tracking-wider">
                        Slide {currentSlideIndex + 1} / {slides.length}
                      </p>
                      <h3 className="font-bold text-lg">{presSlide.quiz.title || 'Kiểm tra nhanh'}</h3>
                    </div>
                  </div>
                  {presDone && (
                    <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full text-sm font-semibold">
                      <CheckCircle size={15} /> Đã hoàn thành
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <QuizViewer
                    quiz={presSlide.quiz as any}
                    readOnly={false}
                    onSubmitted={(_allCorrect) => {
                      // Presentation mode is teacher-controlled: mark done regardless of correctness
                      if (presSlide) setQuizDoneSlides(prev => new Set([...prev, presSlide.id]));
                    }}
                  />
                </div>
                {presDone && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setPresentQuizPhase('slide');
                        if (currentSlideIndex < slides.length - 1) {
                          setCurrentSlide(currentSlideIndex + 1);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition text-sm"
                    >
                      {currentSlideIndex < slides.length - 1 ? (
                        <><ArrowRight size={18} /> Tiếp tục slide tiếp theo</>
                      ) : (
                        <><CheckCircle size={18} /> Kết thúc trình chiếu</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Exit button */}
          <div className="bg-gray-900 px-6 py-4 flex justify-end">
            <button onClick={handleExitPresentation} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition">
              Thoát (ESC)
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col ${isModal ? 'h-full' : 'fixed inset-0'} bg-black z-50`}>
        {/* Presentation Canvas */}
        <div className="flex-1 w-full flex items-center justify-center overflow-hidden relative">
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CanvasEditorPro
              ref={canvasEditorRef}
              slideId={currentSlide.id}
              readOnly
              isPresentationMode={true}
              zoom={zoom}
              onZoomChange={setZoom}
              onReady={handleCanvasReady}
            />
          </div>

          {/* Bottom-right Navigation Buttons (hover to show) */}
          <div
            className="absolute bottom-6 right-6 flex items-center gap-2 transition-opacity duration-200"
            onMouseEnter={() => setShowNavButtons(true)}
            onMouseLeave={() => setShowNavButtons(false)}
            style={{
              opacity: showNavButtons ? 1 : 0.3,
            }}
          >
            <button
              onClick={handlePreviousSlide}
              disabled={currentSlideIndex === 0}
              className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-200 rounded-full disabled:opacity-30 transition shadow-lg"
              title="Trước (←)"
            >
              <ChevronLeft size={20} className="text-gray-800" />
            </button>
            <div className="bg-white px-3 py-1 rounded-full shadow-lg">
              <span className="text-sm font-semibold text-gray-800">
                {currentSlideIndex + 1}/{slides.length}
              </span>
            </div>
            <button
              onClick={handleNextSlide}
              disabled={currentSlideIndex === slides.length - 1}
              className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-200 rounded-full disabled:opacity-30 transition shadow-lg"
              title="Tiếp theo (→)"
            >
              <ChevronRight size={20} className="text-gray-800" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 text-white w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousSlide}
              disabled={currentSlideIndex === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 transition"
            >
              <ChevronLeft size={18} /> Trước
            </button>

            <span className="text-sm font-semibold bg-gray-800 px-3 py-2 rounded">
              {currentSlideIndex + 1} / {slides.length}
            </span>

            <button
              onClick={handleNextSlide}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Tiếp theo <ChevronRight size={18} />
            </button>

            {/* Quiz button — shown when current slide has a quiz */}
            {presHasQuiz && (
              <button
                onClick={() => setPresentQuizPhase('quiz')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold text-sm ${
                  presDone ? 'bg-green-600 hover:bg-green-700' : 'bg-violet-600 hover:bg-violet-700 animate-pulse'
                }`}
              >
                <Lightbulb size={16} />
                {presDone ? 'Quiz ✓' : 'Làm Quiz'}
              </button>
            )}
          </div>

          <button
            onClick={handleExitPresentation}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition"
          >
            Thoát (ESC)
          </button>
        </div>

        <audio ref={audioRef} />
      </div>
    );
  }

  // Review Mode View (Teacher preview before publishing)
  if (isReviewMode) {
    const revSlide   = slides[currentSlideIndex];
    const revHasQuiz = !!revSlide?.quiz;
    const revDone    = revSlide ? quizDoneSlides.has(revSlide.id) : true;

    // ── Quiz phase for review mode ────────────────────────────────────
    if (presentQuizPhase === 'quiz' && revSlide?.quiz) {
      return (
        <div className={`flex flex-col ${isModal ? 'h-full' : 'fixed inset-0'} bg-gray-950 z-50`}>
          <div className="flex-1 overflow-y-auto flex items-start justify-center p-6">
            <div className="w-full max-w-2xl">
              <div className="rounded-2xl border border-violet-300/30 bg-white shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lightbulb size={22} />
                    <div>
                      <p className="text-xs opacity-70 uppercase tracking-wider">Xem trước · Slide {currentSlideIndex + 1} / {slides.length}</p>
                      <h3 className="font-bold text-lg">{revSlide.quiz.title || 'Kiểm tra nhanh'}</h3>
                    </div>
                  </div>
                  {revDone && <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full text-sm font-semibold"><CheckCircle size={15} /> Đã xong</span>}
                </div>
                <div className="p-6">
                  <QuizViewer
                    quiz={revSlide.quiz as any}
                    readOnly={false}
                    isTeacher={true}
                    onSubmitted={(_allCorrect) => {
                      // Review mode is teacher preview: mark done regardless of correctness
                      if (revSlide) setQuizDoneSlides(p => new Set([...p, revSlide.id]));
                    }}
                  />
                </div>
                {revDone && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                    <button onClick={() => { setPresentQuizPhase('slide'); if (currentSlideIndex < slides.length - 1) setCurrentSlide(currentSlideIndex + 1); }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition text-sm">
                      {currentSlideIndex < slides.length - 1 ? <><ArrowRight size={18}/> Tiếp tục</> : <><CheckCircle size={18}/> Kết thúc</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-900 px-6 py-4 flex justify-between items-center text-white">
            <span className="text-xs bg-blue-600 px-3 py-1.5 rounded-full font-semibold">Chế độ Xem trước</span>
            <button onClick={handleExitReviewMode} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition">Thoát (ESC)</button>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col ${isModal ? 'h-full' : 'fixed inset-0'} bg-black z-50`}>
        {/* Review Canvas */}
        <div className="flex-1 w-full flex items-center justify-center overflow-hidden relative">
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CanvasEditorPro
              ref={canvasEditorRef}
              slideId={currentSlide.id}
              readOnly
              isPresentationMode={true}
              zoom={zoom}
              onZoomChange={setZoom}
              onReady={handleCanvasReady}
            />
          </div>

          {/* Bottom-right Navigation Buttons */}
          <div
            className="absolute bottom-6 right-6 flex items-center gap-2 transition-opacity duration-200"
            onMouseEnter={() => setShowNavButtons(true)}
            onMouseLeave={() => setShowNavButtons(false)}
            style={{
              opacity: showNavButtons ? 1 : 0.3,
            }}
          >
            <button
              onClick={handlePreviousSlide}
              disabled={currentSlideIndex === 0}
              className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-200 rounded-full disabled:opacity-30 transition shadow-lg"
              title="Trước (←)"
            >
              <ChevronLeft size={20} className="text-gray-800" />
            </button>
            <div className="bg-white px-3 py-1 rounded-full shadow-lg">
              <span className="text-sm font-semibold text-gray-800">
                {currentSlideIndex + 1}/{slides.length}
              </span>
            </div>
            <button
              onClick={handleNextSlide}
              disabled={currentSlideIndex === slides.length - 1}
              className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-200 rounded-full disabled:opacity-30 transition shadow-lg"
              title="Tiếp theo (→)"
            >
              <ChevronRight size={20} className="text-gray-800" />
            </button>
          </div>

          {/* Quiz is shown as step-phase in review mode controls below */}

          {/* Review Mode Badge */}
          <div className="absolute top-6 left-6 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <span className="font-semibold">Chế độ Xem trước</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 text-white w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handlePreviousSlide} disabled={currentSlideIndex === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 transition">
              <ChevronLeft size={18} /> Trước
            </button>
            <span className="text-sm font-semibold bg-gray-800 px-3 py-2 rounded">
              {currentSlideIndex + 1} / {slides.length}
            </span>
            <button onClick={handleNextSlide}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
              Tiếp theo <ChevronRight size={18} />
            </button>
            {revHasQuiz && (
              <button onClick={() => setPresentQuizPhase('quiz')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold text-sm ${revDone ? 'bg-green-600 hover:bg-green-700' : 'bg-violet-600 hover:bg-violet-700'}`}>
                <Lightbulb size={16} /> {revDone ? 'Quiz ✓' : 'Xem Quiz'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-blue-600 px-3 py-1.5 rounded-full font-semibold">Xem trước</span>
            <button onClick={handleExitReviewMode} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition">
              Thoát (ESC)
            </button>
          </div>
        </div>

        <audio ref={audioRef} />
      </div>
    );
  }

  return (
    <div className={`flex ${isModal ? 'h-full flex-col' : 'h-screen w-screen'} bg-gray-900 overflow-hidden`}>
      {/* Left Sidebar - Assets Panel */}
      <aside
        className={[
          'bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col',
          !isLeftPanelOpen ? 'w-0' : editingQuiz ? 'w-[600px]' : 'w-72',
        ].join(' ')}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Sidebar Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
              {editingQuiz ? '💡 Tạo / Sửa Quiz' : 'Thành phần'}
            </h2>
            {editingQuiz && (
              <button
                onClick={() => setEditingQuiz(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 rounded"
                title="Quay lại"
              >
                ✕
              </button>
            )}
          </div>

          <div className={editingQuiz ? '' : 'p-4 space-y-6'}>

            {/* ── SECTION: Nền slide ── */}
            {!editingQuiz && <>
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Palette size={14} className="text-purple-500" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Nền slide</h3>
              </div>

              {/* 3 Màu thường dùng nổi bật */}
              <div className="flex gap-2 mb-3">
                {[
                  { color: '#ffffff', label: 'Trắng' },
                  { color: '#1a1a2e', label: 'Đen' },
                  { color: '#f0f4f8', label: 'Xám nhạt' },
                ].map(({ color, label }) => (
                  <button
                    key={color}
                    onClick={() => handleBackgroundColorChange(color)}
                    className="flex-1 h-10 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:scale-105 transition-all flex items-center justify-center text-xs font-medium shadow-sm"
                    style={{ backgroundColor: color, color: color === '#ffffff' || color === '#f0f4f8' ? '#555' : '#fff' }}
                    title={label}
                  >
                    {label}
                  </button>
                ))}
              </div>



              {/* Gradient Presets */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[
                  { label: 'Hoàng hôn', from: '#ff6b6b', to: '#feca57' },
                  { label: 'Biển xanh', from: '#4facfe', to: '#00f2fe' },
                  { label: 'Tím mộng', from: '#a18cd1', to: '#fbc2eb' },
                  { label: 'Rừng xanh', from: '#11998e', to: '#38ef7d' },
                  { label: 'Đêm', from: '#0f0c29', to: '#302b63' },
                  { label: 'Lửa', from: '#f093fb', to: '#f5576c' },
                ].map((g) => (
                  <button
                    key={g.label}
                    onClick={() => handleBackgroundColorChange(g.from)}
                    className="h-8 rounded-md border border-gray-200 hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all text-xs font-semibold text-white overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                    title={g.label}
                  />
                ))}
              </div>

              {/* Custom Color + Background Image Upload */}
              <div className="flex items-center gap-2">
                <label
                  className="flex items-center gap-1.5 px-2 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg cursor-pointer transition group flex-1"
                  title="Tùy chỉnh màu nền"
                >
                  <div
                    className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: currentSlide?.backgroundColor || '#ffffff' }}
                  />
                  <span className="text-xs text-gray-600 group-hover:text-gray-800 font-medium">Màu tùy chỉnh</span>
                  <input
                    type="color"
                    defaultValue={currentSlide?.backgroundColor || '#ffffff'}
                    onChange={(e) => handleBackgroundColorChange(e.target.value)}
                    className="sr-only"
                  />
                </label>

                {/* Upload background image */}
                <label
                  className="flex items-center justify-center w-10 h-10 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition"
                  title="Upload ảnh làm nền / khung slide"
                >
                  <ImageIcon size={16} className="text-indigo-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </section>

            <div className="border-t border-gray-100" />

            {/* ── SECTION: Thư viện ảnh ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-teal-500" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Thư viện ảnh</h3>
                </div>
                {imageLibrary.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Xóa toàn bộ thư viện ảnh?')) {
                        setImageLibrary([]);
                        try { localStorage.removeItem(`mini-canva-image-library:${userId}`); } catch {}
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-600 transition"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {imageLibrary.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg">
                  <ImageIcon size={24} className="mx-auto mb-2 opacity-40" />
                  <p>Chưa có ảnh nào</p>
                  <p className="mt-1 opacity-70">Upload ảnh qua nút 🖼️ trong canvas</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {imageLibrary.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded-md overflow-hidden border border-gray-200 hover:border-blue-400 transition cursor-pointer bg-gray-50">
                      <img
                        src={url}
                        alt={`Ảnh ${i + 1}`}
                        className="w-full h-full object-cover"
                        onClick={() => handleAddStockImage(url)}
                        title="Click để thêm vào slide"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleAddStockImage(url)}
                          className="text-white text-xs bg-blue-600 rounded px-1.5 py-0.5 hover:bg-blue-700 transition"
                          title="Thêm vào slide"
                        >
                          +
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromLibrary(url); }}
                          className="text-white text-xs bg-red-600 rounded px-1.5 py-0.5 hover:bg-red-700 transition"
                          title="Xóa khỏi thư viện"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                💡 Ảnh upload sẽ vào thư viện dùng chung theo tài khoản. Ảnh Ctrl+V được lưu ẩn và tự dọn khi không còn dùng.
              </p>
            </section>

            <div className="border-t border-gray-100" />

            {/* ── SECTION: Hiệu ứng chữ ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-amber-500" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Hiệu ứng xuất hiện</h3>
              </div>
              <p className="text-xs mb-3 leading-relaxed">
                {selectedAnimation
                  ? <span className="text-amber-600 font-medium">✅ Hiệu ứng: <b>{selectedAnimation}</b></span>
                  : <span className="text-gray-400">Chọn đối tượng → bấm hiệu ứng để gán</span>
                }
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { type: 'fade',         emoji: '✨', label: 'Fade In',      desc: 'Mờ dần' },
                  { type: 'slide-up',     emoji: '⬆️', label: 'Trượt Lên',   desc: 'Từ dưới lên' },
                  { type: 'zoom-in',      emoji: '🔍', label: 'Zoom In',      desc: 'Phóng to nhẹ' },
                  { type: 'reveal-left',  emoji: '◀️', label: 'Lộ Từ Trái',  desc: 'Trái → phải' },
                  { type: 'typewriter',   emoji: '⌨️', label: 'Đánh Máy',    desc: 'Gõ từng chữ' },
                  { type: 'bounce-in',    emoji: '🏀', label: 'Nảy Vào',     desc: 'Bounce scale' },
                  { type: 'rotate-in',    emoji: '🌀', label: 'Xoay Vào',    desc: 'Rotate + fade' },
                ].map((fx) => {
                  const isActive = selectedAnimation === fx.type;
                  return (
                    <button
                      key={fx.type}
                      onClick={() => {
                        canvasEditorRef.current?.setAnimationForSelected({ type: fx.type, order: Date.now() });
                        setSelectedAnimation(fx.type);
                      }}
                      className={`flex flex-col items-start gap-0.5 px-2.5 py-2 border rounded-lg transition text-left group ${
                        isActive
                          ? 'bg-amber-100 border-amber-400 ring-1 ring-amber-400'
                          : 'bg-gray-50 hover:bg-amber-50 hover:border-amber-300 border-gray-200'
                      }`}
                      title={fx.desc}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm leading-none">{fx.emoji}</span>
                        {isActive && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-200 px-1 rounded leading-tight">ĐÃ GÁN</span>
                        )}
                      </div>
                      <span className={`text-xs font-semibold leading-tight ${isActive ? 'text-amber-700' : 'text-gray-700 group-hover:text-amber-700'}`}>{fx.label}</span>
                      <span className="text-[10px] text-gray-400 leading-tight">{fx.desc}</span>
                    </button>
                  );
                })}

                {/* Remove effect button */}
                <button
                  onClick={() => {
                    canvasEditorRef.current?.setAnimationForSelected(null);
                    setSelectedAnimation(null);
                  }}
                  className="flex flex-col items-start gap-0.5 px-2.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition text-left group"
                  title="Xóa hiệu ứng khỏi đối tượng đã chọn"
                >
                  <Trash2 size={14} className="text-red-400" />
                  <span className="text-xs font-semibold text-red-600 leading-tight">Xóa hiệu ứng</span>
                  <span className="text-[10px] text-red-300 leading-tight">Bỏ animation</span>
                </button>
              </div>
            </section>

            <div className="border-t border-gray-100" />

            {/* ── SECTION: Mẫu văn bản ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Type size={14} className="text-blue-500" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Mẫu văn bản</h3>
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleAddTextTemplate('heading')}
                  className="w-full px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition text-sm font-bold text-left"
                >
                  H Tiêu đề lớn
                </button>
                <button
                  onClick={() => handleAddTextTemplate('description')}
                  className="w-full px-3 py-2.5 bg-gray-50 hover:bg-blue-50 text-gray-700 border border-gray-200 rounded-lg transition text-sm font-medium text-left"
                >
                  ¶ Đoạn mô tả
                </button>
                <button
                  onClick={() => handleAddTextTemplate('note')}
                  className="w-full px-3 py-2 bg-gray-50 hover:bg-blue-50 text-gray-500 border border-gray-200 rounded-lg transition text-xs italic text-left"
                >
                  ✏ Ghi chú nhỏ
                </button>
              </div>
            </section>

            <div className="border-t border-gray-100" />

            {/* ── SECTION: Âm thanh ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Volume2 size={14} className="text-green-500" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Âm thanh slide</h3>
              </div>
              <label className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg cursor-pointer transition">
                <Upload size={15} />
                <span className="text-sm font-medium">Tải lên audio</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </label>
              {currentSlide.audioUrl && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
                  <Volume2 size={12} /> Đã có audio ✓
                </p>
              )}
            </section>

            <div className="border-t border-gray-100" />
            </>}

            {/* ── SECTION: Quiz trên slide ── */}
            <section id="sidebar-quiz-section" className={editingQuiz ? '' : 'px-4 pb-4'}>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={14} className="text-violet-500" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Quiz trên slide</h3>
                {currentSlide.quiz && !editingQuiz && (
                  <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
                    {currentSlide.quiz?.questions?.length || 0} câu
                  </span>
                )}
              </div>

              {/* ── Quiz builder embedded in sidebar ── */}
              {editingQuiz ? (
                <div className="-mx-4 -mb-4">
                  <MagicQuizBuilder
                    blockId={currentSlide.id}
                    initialQuiz={currentSlide.quiz}
                    onQuizCreated={(quiz) => {
                      updateSlide(currentSlide.id, {
                        quiz: quiz
                      });
                      setEditingQuiz(false);
                    }}
                    onClose={() => {
                      setEditingQuiz(false);
                    }}
                  />
                </div>
              ) : !currentSlide.quiz ? (
                /* No quiz yet — show create button */
                <button
                  onClick={() => setEditingQuiz(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition text-sm font-medium"
                >
                  <Lightbulb size={15} /> Tạo Quiz mới
                </button>
              ) : (
                /* Has quiz — show toggle + actions */
                <div className="space-y-2">
                  {/* Quiz info badge */}
                  <div className="flex items-center gap-2 p-2.5 bg-violet-50 rounded-lg border border-violet-200 text-xs text-violet-700">
                    <Lightbulb size={13} className="text-violet-500 flex-shrink-0" />
                    <span>Quiz sẽ tự hiện khi trình chiếu tới slide này</span>
                  </div>

                  {/* Quiz summary */}
                  {currentSlide.quiz && (
                    <div className="p-2.5 bg-violet-50 rounded-lg border border-violet-100 text-xs text-violet-700">
                      <p className="font-semibold">{currentSlide.quiz?.title || 'Bộ câu hỏi'}</p>
                      <p className="text-violet-500 mt-0.5">{currentSlide.quiz?.questions?.length || 0} câu hỏi</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingQuiz(true)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition"
                    >
                      ✏ Sửa quiz
                    </button>
                    <button
                      onClick={() => updateSlide(currentSlide.id, { quiz: undefined })}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 size={11} /> Xóa
                    </button>
                  </div>
                </div>
              )}
            </section>

          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between h-16 flex-shrink-0">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title={isLeftPanelOpen ? 'Ẩn sidebar' : 'Hiển thị sidebar'}
            >
              {isLeftPanelOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-xl font-bold text-gray-900">Mini Canva</h1>
            <span className="text-sm text-gray-600 font-medium">
              Slide {currentSlideIndex + 1} / {slides.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentSlide.audioUrl && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                <Volume2 size={14} />
                Âm thanh
              </div>
            )}

            {/* Auto-next Checkbox */}
            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={autoNextAfterAudio}
                onChange={(e) => setAutoNextAfterAudio(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-gray-700 font-medium">Tự động sang trang</span>
            </label>

            <button
              onClick={() => setIsPresentMode(true)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition text-sm font-medium"
            >
              <Play size={16} />
              Trình chiếu
            </button>

            <button
              onClick={() => setIsReviewMode(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm font-medium"
              title="Xem trước trước khi công khai"
            >
              <Play size={16} />
              Xem trước
            </button>

            {/* Xuất bài giảng tương tác */}
            {!isModal && blockId && (
              <button
                onClick={handleExportToLesson}
                disabled={isSaving || slides.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition text-sm font-medium disabled:opacity-50"
                title="Xuất slides thành bài giảng tương tác"
              >
                <FileText size={16} />
                Xuất bài giảng
              </button>
            )}

            {/* Conditional: Show "Hoàn tát & Lưu" if in Modal mode, otherwise show normal Save button */}
            {isModal ? (
              <button 
                onClick={handleSaveAndClose}
                disabled={isSaving}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm font-medium disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {isSaving ? 'Đang lưu...' : 'Hoàn tát & Lưu'}
              </button>
            ) : (
              <button 
                onClick={handleSaveFullPage}
                disabled={isSaving || !blockId}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            )}
          </div>
        </header>

        {/* Canvas Workspace */}
        <main className="flex-1 bg-gray-900 overflow-hidden flex items-center justify-center relative" id="canvas-workspace">
          {currentSlide && (
            <CanvasEditorPro
              ref={canvasEditorRef}
              slideId={currentSlide.id}
              onRightPanelToggle={() => setIsRightPanelOpen(!isRightPanelOpen)}
              zoom={zoom}
              onZoomChange={setZoom}
              onSelectionChange={setSelectedAnimation}
              onImageUploaded={handleImageUploaded}
              onAddQuiz={handleAddQuiz}
            />
          )}

          {/* Quiz is managed in the sidebar — no overlay needed in edit mode */}
        </main>

        {/* Footer - Slide Thumbnails (Hide in Modal mode) */}
        {!isModal && (
          <footer className="border-t border-gray-200 bg-white h-24 overflow-hidden flex-shrink-0">
            <SlideThumbnailBar />
          </footer>
        )}
      </div>

      {/* Right Sidebar - Properties Panel */}
      <aside
        className={`${
          isRightPanelOpen ? 'w-72' : 'w-0'
        } bg-white border-l border-gray-200 transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Thuộc tính</h2>
          <p className="text-sm text-gray-600">Chọn một đối tượng để chỉnh sửa</p>
        </div>
      </aside>

      <audio ref={audioRef} />
    </div>
  );
}

export default MiniCanvaApp;