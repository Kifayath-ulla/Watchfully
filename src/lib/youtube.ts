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

/**
 * Extract video ID from a YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const result = parseYouTubeUrl(url);
  if (result && result.type === 'video') {
    return result.videoId;
  }
  return null;
}

/**
 * Extract playlist ID from a YouTube URL
 */
export function extractPlaylistId(url: string): string | null {
  const result = parseYouTubeUrl(url);
  if (result && result.type === 'playlist') {
    return result.playlistId;
  }
  // Also check for playlist parameter in video URLs
  try {
    const urlObj = new URL(url);
    const listId = urlObj.searchParams.get('list');
    if (listId) {
      return listId;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Fetch video details using oEmbed (no API key required)
 */
export async function fetchVideoDetails(videoId: string): Promise<{
  title: string;
  channelTitle: string;
  thumbnail: string;
  durationSeconds: number;
}> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch video details');
    }
    
    const data = await response.json();
    
    return {
      title: data.title || 'Unknown Title',
      channelTitle: data.author_name || 'Unknown Channel',
      thumbnail: getYouTubeThumbnail(videoId, 'high'),
      // oEmbed doesn't return duration, so we'll estimate or set a default
      durationSeconds: 0
    };
  } catch (error) {
    // Fallback to basic info
    return {
      title: 'YouTube Video',
      channelTitle: 'Unknown Channel',
      thumbnail: getYouTubeThumbnail(videoId, 'high'),
      durationSeconds: 0
    };
  }
}

/**
 * Fetch playlist videos by scraping the playlist page
 * Returns video IDs from the playlist
 */
export async function fetchPlaylistVideos(playlistId: string): Promise<{
  title: string;
  videoIds: string[];
}> {
  try {
    // Use a CORS proxy or direct fetch to get playlist page
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list=${playlistId}&format=json`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch playlist details');
    }
    
    const data = await response.json();
    
    // oEmbed gives us the playlist title but not the video list
    // We'll return the title and an empty array - videos need to be added manually or via API
    return {
      title: data.title || 'YouTube Playlist',
      videoIds: []
    };
  } catch (error) {
    return {
      title: 'YouTube Playlist',
      videoIds: []
    };
  }
}

/**
 * Check if URL is a playlist URL
 */
export function isPlaylistUrl(url: string): boolean {
  const result = parseYouTubeUrl(url);
  if (result && result.type === 'playlist') {
    return true;
  }
  // Also check for list parameter
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.has('list');
  } catch {
    return false;
  }
}
