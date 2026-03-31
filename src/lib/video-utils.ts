/**
 * Extract YouTube video ID from URL or shorthand
 * Supports: https://youtube.com/watch?v=xxx, https://youtu.be/xxx, youtube video ID
 */
export function extractYouTubeId(input: string): string | null {
  // If it looks like an ID already
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract Vimeo video ID from URL
 * Supports: https://vimeo.com/xxx, https://player.vimeo.com/video/xxx
 */
export function extractVimeoId(input: string): string | null {
  // If it looks like an ID already
  if (/^\d+$/.test(input)) {
    return input;
  }

  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate embed URL from video ID and platform
 */
export function generateVideoEmbedUrl(
  videoId: string,
  platform: "youtube" | "vimeo"
): string {
  if (platform === "youtube") {
    return `https://www.youtube.com/embed/${videoId}?rel=0`;
  } else {
    return `https://player.vimeo.com/video/${videoId}`;
  }
}

/**
 * Detect video platform from URL
 */
export function detectVideoPlatform(
  url: string
): "youtube" | "vimeo" | "upload" | null {
  if (extractYouTubeId(url)) {
    return "youtube";
  }
  if (extractVimeoId(url)) {
    return "vimeo";
  }
  if (url.startsWith("http") && (url.endsWith(".mp4") || url.includes("/video"))) {
    return "upload";
  }
  return null;
}
