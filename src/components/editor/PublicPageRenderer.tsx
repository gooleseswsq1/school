"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAuthUser } from '@/lib/auth-storage';
import { Loader, Download, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import QuizViewer from "./QuizViewer";
import CanvaSlideViewerBlock from "./CanvaSlideViewer";
import VideoInteractionOverlay from "./VideoInteractionOverlay";
import CommentsContainer from "./CommentsContainer";
import {
  loadYouTubeAPI,
  loadVimeoAPI,
  getYouTubePlayer,
  getVimeoPlayer,
  checkInteractionTrigger,
  pauseYouTubeVideo,
  playYouTubeVideo,
  pauseVimeoVideo,
  playVimeoVideo,
  getYouTubeCurrentTime,
  getVimeoCurrentTime,
} from "@/lib/video-player-helper";

interface VideoInteraction {
  id: string;
  timestamp: number;
  quizId: string;
  hint?: string;
  lockVideo?: boolean;
}

interface Document {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}

interface ContentItem {
  id: string;
  title: string;
  image?: string;
  shortcutUrl?: string;
  shortcutCode?: string;
}

interface PageBlock {
  id: string;
  type: "VIDEO" | "DOCUMENT" | "TEXT" | "CONTENT" | "QUIZ" | "CANVA";
  order: number;
  videoUrl?: string;
  videoType?: string;
  poster?: string;
  content?: string;
  items?: ContentItem[];
  documents?: Document[];
  quiz?: any;
  quizzes?: any[];
  slidesData?: any;
  interactions?: VideoInteraction[] | string; // Can be array or JSON string from database
}

interface PublicPage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  blocks: PageBlock[];
  children: PublicPage[];
  author: {
    id: string;
    name: string;
    email: string;
  };
}

interface PublicPageRendererProps {
  slug: string;
}

const getFileIcon = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes("pdf")) return "📄";
  if (lower.includes("word") || lower.includes("doc")) return "📝";
  if (lower.includes("power") || lower.includes("ppt")) return "📊";
  if (lower.includes("excel") || lower.includes("xls")) return "📈";
  return "📎";
};

/**
 * YouTube iframes require `enablejsapi=1` in the URL for the JS Player API
 * to function. Without it `YT.Player` cannot control the iframe and
 * `getYouTubePlayer()` always returns null, so quiz interactions never fire.
 * We also add `origin` so postMessage calls aren't blocked by CORS.
 */
function injectYouTubeParams(url?: string): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("enablejsapi", "1");
    if (typeof window !== "undefined") {
      u.searchParams.set("origin", window.location.origin);
    }
    return u.toString();
  } catch {
    // Fallback: manually append if URL() fails (e.g. relative URL)
    const sep = url.includes("?") ? "&" : "?";
    const origin =
      typeof window !== "undefined"
        ? `&origin=${encodeURIComponent(window.location.origin)}`
        : "";
    return `${url}${sep}enablejsapi=1${origin}`;
  }
}

// Sub-component for rendering video blocks with interaction support
interface VideoBlockRendererProps {
  block: PageBlock;
  currentInteraction: VideoInteraction | null;
  onInteractionTriggered: (interaction: VideoInteraction) => void;
  onInteractionClose: () => void;
  triggeredInteractions: Set<string>;
  videoPlayersRef: React.MutableRefObject<any>;
  videoTimeoutRef: React.MutableRefObject<any>;
}

function VideoBlockRenderer({
  block,
  currentInteraction,
  onInteractionTriggered,
  onInteractionClose,
  triggeredInteractions,
  videoPlayersRef,
  videoTimeoutRef,
}: VideoBlockRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // FIX: Keep live refs to props that are captured in setInterval closures.
  // Without these, the interval always uses the stale snapshot from setup time,
  // so a newly-dismissed interaction stays "untriggered" forever (or re-triggers).
  const triggeredInteractionsRef = useRef<Set<string>>(triggeredInteractions);
  useEffect(() => {
    triggeredInteractionsRef.current = triggeredInteractions;
  }, [triggeredInteractions]);

  const onInteractionTriggeredRef = useRef(onInteractionTriggered);
  useEffect(() => {
    onInteractionTriggeredRef.current = onInteractionTriggered;
  }, [onInteractionTriggered]);

  // Initialize YouTube/Vimeo API and set up interaction tracking
  useEffect(() => {
    let isSubscribed = true;
    const setupVideoPlayer = async () => {
      // Parse interactions if they come as a JSON string from database
      let interactions: VideoInteraction[] = [];
      if (block.interactions) {
        if (typeof block.interactions === 'string') {
          try {
            interactions = JSON.parse(block.interactions);
          } catch (error) {
            console.error("Error parsing interactions:", error);
            interactions = [];
          }
        } else {
          interactions = block.interactions;
        }
      }

      if (!interactions || interactions.length === 0) {
        setIsPlayerReady(true);
        return;
      }

      try {
        if (block.videoType === "youtube") {
          await loadYouTubeAPI();
          if (isSubscribed && iframeRef.current) {
            const checkYTAPI = setInterval(() => {
              if ((window as any).YT && (window as any).YT.Player) {
                const player = getYouTubePlayer(iframeRef.current!);
                if (player) {
                  videoPlayersRef.current[block.id] = {
                    player,
                    type: "youtube",
                    iframe: iframeRef.current,
                  };
                  setupYouTubeTimeTracking(player, interactions);
                  setIsPlayerReady(true);
                  // FIX: only clear the poller once the player is actually ready
                  clearInterval(checkYTAPI);
                }
                // Previously clearInterval was here (outside the player guard),
                // which caused it to fire and abort on the first tick even when
                // getYouTubePlayer() returned null.
              }
            }, 100);

            setTimeout(() => clearInterval(checkYTAPI), 5000);
          }
        } else if (block.videoType === "vimeo") {
          await loadVimeoAPI();
          if (isSubscribed && iframeRef.current) {
            const checkVimeoAPI = setInterval(() => {
              if ((window as any).Vimeo && (window as any).Vimeo.Player) {
                const player = getVimeoPlayer(iframeRef.current!);
                if (player) {
                  videoPlayersRef.current[block.id] = {
                    player,
                    type: "vimeo",
                    iframe: iframeRef.current,
                  };
                  setupVimeoTimeTracking(player, interactions);
                  setIsPlayerReady(true);
                  // FIX: same as above — only clear when player is confirmed ready
                  clearInterval(checkVimeoAPI);
                }
              }
            }, 100);

            setTimeout(() => clearInterval(checkVimeoAPI), 5000);
          }
        } else {
          setIsPlayerReady(true);
        }
      } catch (error) {
        console.error("Error setting up video player:", error);
        setIsPlayerReady(true);
      }
    };

    setupVideoPlayer();

    return () => {
      isSubscribed = false;
    };
  }, [block]);

  /**
   * Exits fullscreen and waits for the browser to finish before resolving.
   *
   * exitFullscreen() is asynchronous — the browser needs a frame or two to
   * actually collapse the fullscreen layer. If we show the overlay immediately
   * after calling exitFullscreen() (without awaiting), the overlay renders
   * while the fullscreen layer is still active and stays invisible.
   *
   * This function resolves either when the `fullscreenchange` event fires OR
   * after a 300 ms safety timeout, whichever comes first.
   */
  const exitFullscreenIfNeeded = (): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const doc = document as any;
        const isFullscreen =
          doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement;

        if (!isFullscreen) {
          resolve();
          return;
        }

        // Resolve once the browser confirms fullscreen has exited
        const onChanged = () => {
          clearTimeout(fallback);
          resolve();
        };
        document.addEventListener("fullscreenchange", onChanged, { once: true });
        document.addEventListener("webkitfullscreenchange", onChanged, { once: true });

        // Safety fallback in case the event never fires
        const fallback = setTimeout(() => {
          document.removeEventListener("fullscreenchange", onChanged);
          document.removeEventListener("webkitfullscreenchange", onChanged);
          resolve();
        }, 300);

        const exit =
          doc.exitFullscreen ||
          doc.webkitExitFullscreen ||
          doc.mozCancelFullScreen ||
          doc.msExitFullscreen;
        if (exit) exit.call(doc);
      } catch (e) {
        resolve(); // Non-fatal — proceed regardless
      }
    });
  };

  // Tracking helpers read live refs so intervals never go stale.
  const setupYouTubeTimeTracking = (player: any, interactions: VideoInteraction[]) => {
    if (videoTimeoutRef.current) clearInterval(videoTimeoutRef.current);

    // async so we can await exitFullscreenIfNeeded before showing overlay
    videoTimeoutRef.current = setInterval(async () => {
      const currentTime = getYouTubeCurrentTime(player);

      const interaction = checkInteractionTrigger(
        currentTime,
        (interactions || []).map((i) => ({ ...i })),
        triggeredInteractionsRef.current
      );

      if (interaction) {
        pauseYouTubeVideo(player);
        await exitFullscreenIfNeeded(); // wait for fullscreen to fully exit
        const fullInteraction = interactions?.find((i) => i.id === interaction.id);
        if (fullInteraction) {
          onInteractionTriggeredRef.current(fullInteraction);
        }
      }
    }, 500);
  };

  const setupVimeoTimeTracking = (player: any, interactions: VideoInteraction[]) => {
    if (videoTimeoutRef.current) clearInterval(videoTimeoutRef.current);

    videoTimeoutRef.current = setInterval(async () => {
      try {
        const currentTime = await getVimeoCurrentTime(player);

        const interaction = checkInteractionTrigger(
          currentTime,
          (interactions || []).map((i) => ({ ...i })),
          triggeredInteractionsRef.current
        );

        if (interaction) {
          pauseVimeoVideo(player);
          await exitFullscreenIfNeeded(); // wait for fullscreen to fully exit
          const fullInteraction = interactions?.find((i) => i.id === interaction.id);
          if (fullInteraction) {
            onInteractionTriggeredRef.current(fullInteraction);
          }
        }
      } catch (error) {
        console.error("Error tracking Vimeo time:", error);
      }
    }, 500);
  };

  // Handle uploaded video time updates.
  // Deps array is intentionally [block] only — triggeredInteractions and
  // onInteractionTriggered are accessed via refs (triggeredInteractionsRef /
  // onInteractionTriggeredRef) so the effect never needs to re-register.
  // Keeping the array size constant avoids the React "deps changed size" warning.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || block.videoType !== "upload") return;

    let interactions: VideoInteraction[] = [];
    if (block.interactions) {
      if (typeof block.interactions === "string") {
        try {
          interactions = JSON.parse(block.interactions);
        } catch (error) {
          console.error("Error parsing interactions:", error);
          interactions = [];
        }
      } else {
        interactions = block.interactions;
      }
    }

    if (!interactions || interactions.length === 0) return;

    const handleTimeUpdate = async () => {
      const currentTime = video.currentTime;

      const interaction = checkInteractionTrigger(
        currentTime,
        interactions.map((i) => ({ ...i })),
        triggeredInteractionsRef.current
      );

      if (interaction) {
        video.pause();
        await exitFullscreenIfNeeded(); // wait for fullscreen to fully exit
        const fullInteraction = interactions.find((i) => i.id === interaction.id);
        if (fullInteraction) {
          onInteractionTriggeredRef.current(fullInteraction);
        }
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [block]); // stable — see note above

  const handleQuizAnswered = (isCorrect: boolean) => {
    if (!currentInteraction || !isCorrect) {
      return;
    }

    // Resume video
    if (block.videoType === "upload" && videoRef.current) {
      videoRef.current.play();
    } else if (block.videoType === "youtube" && videoPlayersRef.current[block.id]) {
      playYouTubeVideo(videoPlayersRef.current[block.id].player);
    } else if (block.videoType === "vimeo" && videoPlayersRef.current[block.id]) {
      playVimeoVideo(videoPlayersRef.current[block.id].player);
    }

    onInteractionClose();
  };

  // Fetch quiz data for the current interaction
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  useEffect(() => {
    if (!currentInteraction) {
      setCurrentQuiz(null);
      setQuizError(null);
      return;
    }

    const loadQuiz = async () => {
      setQuizError(null);
      try {
        console.log("[PublicPageRenderer] Loading quiz:", currentInteraction.quizId);
        const response = await fetch(`/api/quiz/${currentInteraction.quizId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg = errorData.error || `API returned ${response.status}`;
          console.error("[PublicPageRenderer] Quiz fetch failed:", errorMsg, errorData);
          setQuizError(`Lỗi tải bài kiểm tra: ${errorMsg}`);
          setCurrentQuiz(null);
          return;
        }
        
        const quiz = await response.json();
        console.log("[PublicPageRenderer] Quiz loaded successfully:", quiz);
        setCurrentQuiz(quiz);
        setQuizError(null);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[PublicPageRenderer] Error loading quiz:", errorMsg);
        setQuizError(`Lỗi kết nối: ${errorMsg}`);
        setCurrentQuiz(null);
      }
    };

    loadQuiz();
  }, [currentInteraction]);

  return (
    <div>
      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Video
      </h3>
      <div
        className="w-full rounded-lg overflow-hidden bg-black flex items-center justify-center relative"
        style={{ aspectRatio: "16 / 9" }}
      >
        {block.videoType === "upload" ? (
          <video
            ref={videoRef}
            src={block.videoUrl}
            controls
            poster={block.poster}
            className="w-full h-full"
          />
        ) : block.videoType === "youtube" ? (
          <iframe
            ref={iframeRef}
            src={injectYouTubeParams(block.videoUrl)}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={block.videoUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {/* Interaction Overlay */}
      {currentInteraction && (
        quizError ? (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">Lỗi</p>
            <p className="text-red-600 text-sm">{quizError}</p>
            <button
              onClick={onInteractionClose}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Đóng
            </button>
          </div>
        ) : currentQuiz ? (
          <VideoInteractionOverlay
            quiz={currentQuiz}
            hint={currentInteraction.hint}
            onAnswered={handleQuizAnswered}
            onClose={onInteractionClose}
            lockVideo={currentInteraction.lockVideo || false}
          />
        ) : (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">Đang tải bài kiểm tra...</p>
          </div>
        )
      )}
    </div>
  );
}

export default function PublicPageRenderer({
  slug,
}: PublicPageRendererProps) {
  // Get current user (optional for public pages)
  const { user } = useAuth({ redirectOnUnauth: false });
  const router = useRouter();
  const [page, setPage] = useState<PublicPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // Video interaction state
  const [currentInteraction, setCurrentInteraction] = useState<{
    blockId: string;
    interaction: VideoInteraction;
  } | null>(null);
  const [triggeredInteractions, setTriggeredInteractions] = useState<Set<string>>(new Set());
  const videoPlayersRef = useRef<{
    [key: string]: { player: any; type: "youtube" | "vimeo"; iframe?: HTMLIFrameElement };
  }>({});
  const videoTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Block expansion state - track which blocks are expanded
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [blockContents, setBlockContents] = useState<Record<string, any>>({});
  const [loadingBlocks, setLoadingBlocks] = useState<Set<string>>(new Set());

  const handleBlockExpand = async (blockId: string) => {
    const isCurrentlyExpanded = expandedBlocks.has(blockId);

    if (!isCurrentlyExpanded && !blockContents[blockId]) {
      setLoadingBlocks(prev => new Set(prev).add(blockId));
      try {
        const response = await fetch(`/api/blocks/${blockId}`);
        if (response.ok) {
          const data = await response.json();
          setBlockContents(prev => ({ ...prev, [blockId]: data }));
        }
      } catch (error) {
        console.error("Error loading block content:", error);
      } finally {
        setLoadingBlocks(prev => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
    }

    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (isCurrentlyExpanded) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  const handleGoBack = () => {
    const user = getAuthUser();
    if (user) {
      try {
        // Redirect to appropriate home page based on role
        if (user.role === 'STUDENT') {
          router.push('/student/pages');
        } else if (user.role === 'TEACHER') {
          router.push('/teacher');
        } else {
          router.back();
        }
      } catch {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const fetchPageData = async () => {
    try {
      // Disable caching to always get latest data from database
      const response = await fetch(`/api/public/pages/${slug}`, {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });

      if (!response.ok) {
        throw new Error("Không thể tải trang");
      }

      const data = await response.json();
      setPage(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching page:", err);
      if (!page) { // Only set error if we don't have any data yet
        setError(
          err instanceof Error ? err.message : "Lỗi khi tải trang"
        );
      }
    }
  };

  useEffect(() => {
    const loadPageAndSetUpPolling = async () => {
      setIsLoading(true);
      await fetchPageData();
      setIsLoading(false);

      // Set up polling to check for updates every 3 seconds
      pollIntervalRef.current = setInterval(async () => {
        pollCountRef.current++;
        await fetchPageData();
      }, 3000);
    };

    loadPageAndSetUpPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (videoTimeoutRef.current) {
        clearInterval(videoTimeoutRef.current);
      }
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center p-4">
          <Loader className="animate-spin mx-auto mb-4" size={40} />
          <p className="text-gray-600 dark:text-gray-300">Đang tải trang...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md text-center">
          <div className="inline-block p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
            <div className="flex justify-center mb-4">
              <span className="text-6xl">404</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
              Lỗi
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm sm:text-base">
              {error || "Không tìm thấy trang"}
            </p>
            <button
              onClick={handleGoBack}
              className="w-full px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
            >
              <ArrowLeft size={18} />
              <span>Quay lại</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header with Commands and Comments */}
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm relative z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-4xl mx-auto">
            {/* Top Row: Back Button and Comments Container */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition text-sm sm:text-base"
              >
                <ArrowLeft size={20} />
                Quay lại
              </button>
              {/* Command Icon: Comments Container at Top Right */}
              <div className="flex-shrink-0 relative z-50">
                <CommentsContainer
                  blockId={`page-${page.id}`}
                  authorId={user?.id || ""}
                  currentUserRole="STUDENT"
                />
              </div>
            </div>
            
            {/* Title and Description */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 break-words">
              {page.title}
            </h1>
            {page.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">{page.description.replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, '')}</p>
            )}
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
              Giáo viên: <span className="font-medium">{page.author.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-0">
        <div className="max-w-4xl mx-auto">
          {page.blocks && page.blocks.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {page.blocks.map((block) => {
                const isExpanded = expandedBlocks.has(block.id);
                const isLoadingContent = loadingBlocks.has(block.id);

                // Get block type info
                const getBlockTypeInfo = (type: string) => {
                  switch (type) {
                    case "VIDEO":
                      return { icon: "🎥", label: "Video", color: "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" };
                    case "DOCUMENT":
                      return { icon: "📄", label: "Tài liệu", color: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" };
                    case "QUIZ":
                      return { icon: "❓", label: "Bài kiểm tra", color: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" };
                    case "CANVA":
                      return { icon: "🎨", label: "Slide", color: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400" };
                    case "TEXT":
                      return { icon: "📝", label: "Văn bản", color: "bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400" };
                    case "CONTENT":
                      return { icon: "📚", label: "Nội dung", color: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400" };
                    default:
                      return { icon: "📦", label: "Block", color: "bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400" };
                  }
                };

                const typeInfo = getBlockTypeInfo(block.type);

                return (
                  <div key={block.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                    {/* Block Header - Always visible */}
                    <button
                      onClick={() => handleBlockExpand(block.id)}
                      className="w-full p-4 sm:p-6 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${typeInfo.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                          {typeInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              Block #{block.order + 1}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {block.type === "VIDEO" && "Video bài học"}
                            {block.type === "DOCUMENT" && "Tài liệu đính kèm"}
                            {block.type === "QUIZ" && "Bài kiểm tra"}
                            {block.type === "CANVA" && "Bài trình bày"}
                            {block.type === "TEXT" && "Nội dung văn bản"}
                            {block.type === "CONTENT" && "Nội dung bài học"}
                          </h3>
                          {block.type === "DOCUMENT" && block.documents && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {block.documents.length} tài liệu
                            </p>
                          )}
                          {block.type === "QUIZ" && (block.quiz || block.quizzes) && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {(block.quiz?.questions?.length || 0) + (block.quizzes?.reduce((acc: number, q: any) => acc + (q.questions?.length || 0), 0) || 0)} câu hỏi
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronLeft className="w-5 h-5 text-gray-400 rotate-[-90deg] transition-transform" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400 transition-transform" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Block Content - Only visible when expanded */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-slate-700 p-4 sm:p-6 bg-gray-50 dark:bg-slate-800/50">
                        {isLoadingContent ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader className="animate-spin w-6 h-6 text-blue-600" />
                            <span className="ml-2 text-gray-500">Đang tải...</span>
                          </div>
                        ) : (
                          <>
                            {/* Video Block */}
                            {block.type === "VIDEO" && block.videoUrl && (
                              <VideoBlockRenderer
                                block={block}
                                currentInteraction={
                                  currentInteraction?.blockId === block.id ? currentInteraction.interaction : null
                                }
                                onInteractionTriggered={(interaction) => {
                                  setCurrentInteraction({ blockId: block.id, interaction });
                                }}
                                onInteractionClose={() => {
                                  if (currentInteraction?.blockId === block.id) {
                                    triggeredInteractions.add(currentInteraction.interaction.id);
                                    setTriggeredInteractions(new Set(triggeredInteractions));
                                    setCurrentInteraction(null);
                                  }
                                }}
                                triggeredInteractions={triggeredInteractions}
                                videoPlayersRef={videoPlayersRef}
                                videoTimeoutRef={videoTimeoutRef}
                              />
                            )}

                            {/* Document Block */}
                            {block.type === "DOCUMENT" && block.documents && block.documents.length > 0 && (
                              <div>
                                <h4 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
                                  Tài liệu đính kèm
                                </h4>
                                <div className="space-y-3">
                                  {block.documents.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
                                        <span className="text-2xl shrink-0">
                                          {getFileIcon(doc.fileType)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                            {doc.title}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {doc.fileType.toUpperCase()}
                                            {doc.fileSize &&
                                              ` • ${(doc.fileSize / 1024 / 1024).toFixed(2)} MB`}
                                          </p>
                                        </div>
                                      </div>
                                      <a
                                        href={`/api/download?fileUrl=${encodeURIComponent(doc.fileUrl)}&fileName=${encodeURIComponent(doc.title || doc.fileUrl.split('/').pop() || 'download')}`}
                                        download
                                        className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
                                      >
                                        <Download size={16} />
                                        Download
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Text Block */}
                            {block.type === "TEXT" && block.content && (
                              <div>
                                <h4 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Nội dung</h4>
                                <div
                                  className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm sm:text-base"
                                  dangerouslySetInnerHTML={{ __html: block.content }}
                                />
                              </div>
                            )}

                            {/* Content Block */}
                            {block.type === "CONTENT" && block.items && block.items.length > 0 && (
                              <div>
                                <h4 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Nội dung bài học</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                  {block.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-md transition"
                                    >
                                      {item.image && (
                                        <img
                                          src={item.image}
                                          alt={item.title}
                                          className="w-full h-40 object-cover rounded-lg mb-3"
                                        />
                                      )}
                                      <h5 className="font-semibold text-gray-900 mb-2">{item.title}</h5>
                                      {item.shortcutUrl && (
                                        <a
                                          href={item.shortcutUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                          Xem chi tiết →
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Quiz Block */}
                            {block.type === "QUIZ" && (block.quiz || block.quizzes?.length) && (
                              <div>
                                {block.quiz && (
                                  <QuizViewer quiz={block.quiz} readOnly={false} />
                                )}
                                {block.quizzes && block.quizzes.length > 0 && block.quizzes.map((quiz: any, index: number) => (
                                  <div key={quiz.id} className={index > 0 ? "mt-6" : ""}>
                                    <QuizViewer quiz={quiz} readOnly={false} />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Canva/Slide Block */}
                            {block.type === "CANVA" && block.slidesData && (
                              <CanvaSlideViewerBlock slidesData={block.slidesData} blockId={block.id} />
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm sm:text-base">Trang này chưa có nội dung</p>
          </div>
        )}

        {/* Sub Pages */}
        {page.children && page.children.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900 dark:text-white">Trang con</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {page.children.map((child) => (
                <a
                  key={child.id}
                  href={`/${child.slug}`}
                  className="p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition border border-gray-200 dark:border-slate-700"
                >
                  <h3 className="font-semibold text-lg sm:text-xl text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 break-words">
                    {child.title}
                  </h3>
                  {child.description && (
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {child.description}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}