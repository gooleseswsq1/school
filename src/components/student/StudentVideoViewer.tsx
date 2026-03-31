"use client";

import { useState, useRef, useEffect } from "react";
import VideoInteractionOverlay from "@/components/editor/VideoInteractionOverlay";
import { CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

interface VideoInteraction {
  id: string;
  timestamp: number; // in seconds
  quizId: string;
  quizTitle?: string;
  hint?: string;
  lockVideo?: boolean;
  quizData?: Quiz; // Pre-loaded quiz data from StudentPageRenderer
}

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

interface StudentVideoViewerProps {
  videoUrl: string;
  videoType: "youtube" | "vimeo" | "upload";
  poster?: string;
  interactions?: VideoInteraction[];
  title?: string;
}

export default function StudentVideoViewer({
  videoUrl,
  videoType,
  poster,
  interactions = [],
  title = "Video",
}: StudentVideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [activeInteraction, setActiveInteraction] = useState<VideoInteraction | null>(null);
  const [viewedInteractions, setViewedInteractions] = useState<Set<string>>(new Set());
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [completedInteractions, setCompletedInteractions] = useState<Set<string>>(new Set());

  // Persist viewed interactions in localStorage so popups don't re-trigger on revisit
  const viewedKey = `viewed_interactions_${videoUrl}`;
  useEffect(() => {
    try {
      const stored = localStorage.getItem(viewedKey);
      if (stored) setViewedInteractions(new Set(JSON.parse(stored) as string[]));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  // Debug: log when interactions are received
  useEffect(() => {
    if (interactions.length > 0) {
      console.log(`[StudentVideoViewer] Received ${interactions.length} interaction(s):`, 
        interactions.map(i => ({ id: i.id, timestamp: i.timestamp, quizId: i.quizId })));
    }
  }, [interactions]);

  // Load quiz data when interaction is triggered
  useEffect(() => {
    const loadQuiz = async () => {
      if (!activeInteraction) {
        setQuiz(null);
        return;
      }

      // Use pre-loaded quiz data if available
      if (activeInteraction.quizData) {
        setQuiz(activeInteraction.quizData);
        return;
      }

      // Otherwise fetch from API
      setIsLoadingQuiz(true);
      try {
        const response = await fetch(`/api/quiz/${activeInteraction.quizId}`);
        if (!response.ok) throw new Error("Failed to load quiz");

        const quizData = await response.json();
        setQuiz(quizData);
      } catch (error) {
        console.error("Error loading quiz:", error);
        toast.error("Lỗi khi tải Quiz");
        setActiveInteraction(null);
      } finally {
        setIsLoadingQuiz(false);
      }
    };

    loadQuiz();
  }, [activeInteraction]);

  // Handle time update for video tracking
  const handleTimeUpdate = (currentTime: number) => {
    setCurrentTime(currentTime);

    // Check if we should trigger an interaction
    const triggerInteraction = interactions.find((inter) => {
      const alreadyViewed = viewedInteractions.has(inter.id);
      // Trigger when time is within 0.7 seconds of the interaction timestamp
      // Use a wider tolerance to account for seeking and frame rate variations
      const timeDiff = Math.abs(inter.timestamp - currentTime);
      const shouldTrigger = timeDiff <= 0.7 && !alreadyViewed;
      
      if (shouldTrigger) {
        console.log(`[StudentVideoViewer] Triggering interaction "${inter.id}" at ${currentTime.toFixed(2)}s (target: ${inter.timestamp}s)`);
      }
      
      return shouldTrigger;
    });

    if (triggerInteraction) {
      // Mark as viewed, persist to localStorage, and trigger
      setViewedInteractions((prev) => {
        const next = new Set([...prev, triggerInteraction.id]);
        try { localStorage.setItem(viewedKey, JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
      setActiveInteraction(triggerInteraction);

      // Pause video if possible
      if (videoRef.current && videoType === "upload") {
        videoRef.current.pause();
      }
    }
  };

  // Handle video element time update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdateEvent = () => {
      handleTimeUpdate(video.currentTime);
    };

    video.addEventListener("timeupdate", handleTimeUpdateEvent);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdateEvent);
    };
  }, [interactions, viewedInteractions]);

  // Handle quiz completion
  const handleQuizAnswered = (isCorrect: boolean) => {
    if (isCorrect && activeInteraction) {
      setCompletedInteractions((prev) => new Set([...prev, activeInteraction.id]));
      
      // Resume video if it's an upload
      if (videoRef.current && videoType === "upload") {
        videoRef.current.play();
      }
    }
  };

  // Handle close overlay (for non-locked quiz or after correct answer)
  const handleCloseOverlay = () => {
    if (videoRef.current && videoType === "upload") {
      videoRef.current.play();
    }
    setActiveInteraction(null);
  };

  if (!videoUrl) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Không có video</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Container */}
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {videoType === "upload" ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            poster={poster}
            className="w-full h-full"
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={videoUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {/* Video Title */}
      {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}

      {/* Interactions Summary */}
      {interactions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            📋 Mốc Quiz trong video ({completedInteractions.size}/{interactions.length})
          </h3>
          <div className="space-y-1">
            {interactions
              .sort((a, b) => a.timestamp - b.timestamp)
              .map((interaction) => {
                const minutes = Math.floor(interaction.timestamp / 60);
                const seconds = Math.floor(interaction.timestamp % 60);
                const isCompleted = completedInteractions.has(interaction.id);

                return (
                  <div
                    key={interaction.id}
                    className={`flex items-center gap-2 text-sm p-2 rounded ${
                      isCompleted ? "bg-green-100 text-green-900" : "text-gray-700"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-400 rounded-full" />
                    )}
                    <span className="font-medium">
                      {minutes}:{seconds.toString().padStart(2, "0")}
                    </span>
                    <span className="text-xs font-medium">📝 Quiz</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Quiz Overlay */}
      {activeInteraction && quiz && (
        <VideoInteractionOverlay
          quiz={quiz}
          hint={activeInteraction.hint}
          onAnswered={handleQuizAnswered}
          onClose={handleCloseOverlay}
          lockVideo={activeInteraction.lockVideo ?? false}
        />
      )}

      {/* Loading indicator */}
      {activeInteraction && isLoadingQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Đang tải Quiz...</p>
          </div>
        </div>
      )}
    </div>
  );
}
