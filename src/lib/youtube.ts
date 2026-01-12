// YouTube URL parsing and utilities

export interface YouTubeVideoInfo {
  videoId: string;
  type: 'video';
}

export interface YouTubePlaylistInfo {
  playlistId: string;
  type: 'playlist';
}

export type YouTubeParseResult = YouTubeVideoInfo | YouTubePlaylistInfo | null;

/**
 * Parse a YouTube URL and extract video or playlist ID
 */
export function parseYouTubeUrl(url: string): YouTubeParseResult {
  try {
    const urlObj = new URL(url);
    
    // Handle youtu.be short URLs
    if (urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) {
        return { videoId, type: 'video' };
      }
    }
    
    // Handle youtube.com URLs
    if (urlObj.hostname.includes('youtube.com')) {
      // Playlist URL
      if (urlObj.pathname === '/playlist') {
        const playlistId = urlObj.searchParams.get('list');
        if (playlistId) {
          return { playlistId, type: 'playlist' };
        }
      }
      
      // Video URL (may also have playlist parameter)
      if (urlObj.pathname === '/watch') {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
          return { videoId, type: 'video' };
        }
      }
      
      // Embed URL
      if (urlObj.pathname.startsWith('/embed/')) {
        const videoId = urlObj.pathname.split('/embed/')[1]?.split('?')[0];
        if (videoId) {
          return { videoId, type: 'video' };
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Format seconds into readable duration (HH:MM:SS or MM:SS)
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(currentSeconds: number, totalSeconds: number): number {
  if (totalSeconds === 0) return 0;
  return Math.min(100, Math.round((currentSeconds / totalSeconds) * 100));
}

/**
 * Estimate minutes needed to complete a percentage of video
 */
export function estimateMinutesForProgress(
  durationSeconds: number,
  currentPositionSeconds: number,
  availableMinutes: number
): { canCompletePercent: number; canCompleteVideo: boolean } {
  const remainingSeconds = durationSeconds - currentPositionSeconds;
  const availableSeconds = availableMinutes * 60;
  
  if (availableSeconds >= remainingSeconds) {
    return { canCompletePercent: 100, canCompleteVideo: true };
  }
  
  const additionalProgress = (availableSeconds / durationSeconds) * 100;
  const currentProgress = calculateProgress(currentPositionSeconds, durationSeconds);
  
  return {
    canCompletePercent: Math.min(100, currentProgress + additionalProgress),
    canCompleteVideo: false
  };
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'max' = 'medium'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    max: 'maxresdefault'
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Get embed URL for YouTube player
 */
export function getYouTubeEmbedUrl(videoId: string, startSeconds?: number): string {
  let url = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
  
  if (startSeconds && startSeconds > 0) {
    url += `&start=${Math.floor(startSeconds)}`;
  }
  
  return url;
}
