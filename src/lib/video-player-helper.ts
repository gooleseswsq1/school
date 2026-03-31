/**
 * Video Player Helper
 * Provides utilities for:
 * - Handling time updates for uploaded video
 * - YouTube IFrame API integration
 * - Vimeo Player API integration
 * - Tracking interactions and pausing at specific timestamps
 */

// Load YouTube IFrame API
export const loadYouTubeAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).YT && (window as any).YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onload = () => {
      // YouTube API will call onYouTubeIframeAPIReady when ready
      // We'll resolve this after a short delay to ensure it's ready
      setTimeout(resolve, 100);
    };
    tag.onerror = reject;
    document.body.appendChild(tag);
  });
};

// Load Vimeo Player API
export const loadVimeoAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Vimeo) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.onload = () => {
      setTimeout(resolve, 100);
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

/**
 * Get YouTube player instance from iframe
 */
export const getYouTubePlayer = (iframe: HTMLIFrameElement): any => {
  if ((window as any).YT && (window as any).YT.Player) {
    return new (window as any).YT.Player(iframe);
  }
  return null;
};

/**
 * Get Vimeo player instance from iframe
 */
export const getVimeoPlayer = (iframe: HTMLIFrameElement): any => {
  if ((window as any).Vimeo && (window as any).Vimeo.Player) {
    return new (window as any).Vimeo.Player(iframe);
  }
  return null;
};

/**
 * Check if it's time to trigger an interaction
 */
export const checkInteractionTrigger = (
  currentTime: number,
  interactions: Array<{ timestamp: number; id: string }>,
  triggeredIds: Set<string>
): { id: string; timestamp: number } | null => {
  for (const interaction of interactions) {
    // Check if we haven't triggered this interaction yet and we've reached its timestamp
    if (!triggeredIds.has(interaction.id) && currentTime >= interaction.timestamp) {
      // Only trigger if we're within 0.5 seconds of the timestamp
      // This handles the case where currentTime might jump past it
      if (currentTime - interaction.timestamp < 0.5) {
        return interaction;
      }
    }
  }
  return null;
};

/**
 * Set up event listeners for uploaded video
 */
export const setupUploadedVideoListeners = (
  videoElement: HTMLVideoElement | null,
  onTimeUpdate: (currentTime: number) => void,
  onPlay: () => void,
  onPause: () => void
): (() => void) => {
  if (!videoElement) return () => {};

  videoElement.addEventListener("timeupdate", () => {
    onTimeUpdate(videoElement.currentTime);
  });

  videoElement.addEventListener("play", onPlay);
  videoElement.addEventListener("pause", onPause);

  return () => {
    videoElement.removeEventListener("timeupdate", () => {});
    videoElement.removeEventListener("play", onPlay);
    videoElement.removeEventListener("pause", onPause);
  };
};

/**
 * Pause uploaded video
 */
export const pauseUploadedVideo = (videoElement: HTMLVideoElement | null) => {
  if (videoElement) {
    videoElement.pause();
  }
};

/**
 * Resume uploaded video
 */
export const playUploadedVideo = (videoElement: HTMLVideoElement | null) => {
  if (videoElement) {
    videoElement.play().catch((error) => {
      console.error("Unable to play video:", error);
    });
  }
};

/**
 * Pause YouTube video
 */
export const pauseYouTubeVideo = (player: any) => {
  if (player && player.pauseVideo) {
    player.pauseVideo();
  }
};

/**
 * Resume YouTube video
 */
export const playYouTubeVideo = (player: any) => {
  if (player && player.playVideo) {
    player.playVideo();
  }
};

/**
 * Get YouTube video current time
 */
export const getYouTubeCurrentTime = (player: any): number => {
  if (player && player.getCurrentTime) {
    return player.getCurrentTime();
  }
  return 0;
};

/**
 * Pause Vimeo video
 */
export const pauseVimeoVideo = (player: any) => {
  if (player && player.pause) {
    player.pause().catch((error: any) => {
      console.error("Unable to pause Vimeo video:", error);
    });
  }
};

/**
 * Resume Vimeo video
 */
export const playVimeoVideo = (player: any) => {
  if (player && player.play) {
    player.play().catch((error: any) => {
      console.error("Unable to play Vimeo video:", error);
    });
  }
};

/**
 * Get Vimeo video current time
 */
export const getVimeoCurrentTime = (player: any): Promise<number> => {
  if (player && player.getCurrentTime) {
    return player.getCurrentTime();
  }
  return Promise.resolve(0);
};
