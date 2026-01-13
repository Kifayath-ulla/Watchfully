import { useEffect, useRef, useCallback, useState } from 'react';
import { ExternalLink, Play, Clock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  startSeconds?: number;
  onReady?: (player: YT.Player) => void;
  onStateChange?: (state: YT.PlayerState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnd?: () => void;
  autoplay?: boolean;
  videoDuration?: number;
  videoProgress?: number;
  videoTitle?: string;
}

export function YouTubePlayer({
  videoId,
  startSeconds = 0,
  onReady,
  onStateChange,
  onTimeUpdate,
  onEnd,
  autoplay = true,
  videoDuration = 0,
  videoProgress = 0,
  videoTitle,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [isAPIReady, setIsAPIReady] = useState(!!window.YT?.Player);
  const [embedBlocked, setEmbedBlocked] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = videoDuration > 0 ? Math.round((videoProgress / videoDuration) * 100) : 0;

  // Detect if running in nested iframe (preview mode)
  useEffect(() => {
    try {
      // If we're in a nested iframe, YouTube embedding often gets blocked
      if (window.self !== window.top && window.parent !== window.top) {
        setEmbedBlocked(true);
      }
    } catch {
      // Cross-origin iframe access blocked - we're likely in preview
      setEmbedBlocked(true);
    }
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (embedBlocked) return;
    
    if (window.YT?.Player) {
      setIsAPIReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      setIsAPIReady(true);
    };

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [embedBlocked]);

  // Initialize player when API is ready
  useEffect(() => {
    if (embedBlocked || !isAPIReady || !containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        start: Math.floor(startSeconds),
        modestbranding: 1,
        rel: 0,
        enablejsapi: 1,
        origin: window.location.origin,
        playsinline: 1
      },
      events: {
        onReady: (event) => {
          onReady?.(event.target);
          startTimeTracking();
        },
        onStateChange: (event) => {
          onStateChange?.(event.data);
          
          if (event.data === window.YT.PlayerState.PLAYING) {
            startTimeTracking();
          } else if (event.data === window.YT.PlayerState.PAUSED || 
                     event.data === window.YT.PlayerState.ENDED) {
            stopTimeTracking();
          }
          
          if (event.data === window.YT.PlayerState.ENDED) {
            onEnd?.();
          }
        },
        onError: () => {
          setEmbedBlocked(true);
        }
      }
    });

    return () => {
      stopTimeTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isAPIReady, videoId, embedBlocked]);

  const startTimeTracking = useCallback(() => {
    if (intervalRef.current) return;
    
    intervalRef.current = window.setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        onTimeUpdate?.(currentTime, duration);
      }
    }, 1000);
  }, [onTimeUpdate]);

  const stopTimeTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}${startSeconds > 0 ? `&t=${Math.floor(startSeconds)}` : ''}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  // Show fallback when embed is blocked
  if (embedBlocked) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="relative w-full max-w-2xl aspect-video bg-card rounded-xl overflow-hidden border border-border shadow-xl">
          {/* Thumbnail with overlay */}
          <img 
            src={thumbnailUrl} 
            alt="Video thumbnail"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
          
          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md space-y-6">
              {/* Play icon */}
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30">
                  <Play className="h-10 w-10 text-primary fill-primary" />
                </div>
              </div>

              {/* Video info */}
              <div className="text-center space-y-2">
                {videoTitle && (
                  <h3 className="text-lg font-medium text-white line-clamp-2">{videoTitle}</h3>
                )}
                <p className="text-sm text-white/70">
                  Preview mode — embedding blocked in iframe
                </p>
              </div>

              {/* Duration & Progress */}
              {videoDuration > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-white/80">
                      <Clock className="h-4 w-4" />
                      <span>Duration: {formatDuration(videoDuration)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <BarChart3 className="h-4 w-4" />
                      <span>{progressPercent}% complete</span>
                    </div>
                  </div>
                  <Progress value={progressPercent} className="h-2 bg-white/20" />
                  {videoProgress > 0 && (
                    <p className="text-xs text-white/60 text-center">
                      Resume from {formatDuration(videoProgress)}
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <Button asChild size="lg" className="w-full">
                  <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Watch on YouTube
                  </a>
                </Button>
                <Button variant="outline" asChild size="lg" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <a href={window.location.href} target="_blank" rel="noopener noreferrer">
                    Open app in new tab
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {!isAPIReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-muted-foreground">Loading player...</div>
        </div>
      )}
    </div>
  );
}

// Hook to get player controls
export function useYouTubePlayer() {
  const playerRef = useRef<YT.Player | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1);

  const setPlayer = useCallback((player: YT.Player) => {
    playerRef.current = player;
  }, []);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
  }, []);

  const seekRelative = useCallback((delta: number) => {
    if (playerRef.current) {
      const current = playerRef.current.getCurrentTime() || 0;
      const duration = playerRef.current.getDuration() || 0;
      const newTime = Math.max(0, Math.min(duration, current + delta));
      playerRef.current.seekTo(newTime, true);
    }
  }, []);

  const getCurrentTime = useCallback(() => {
    return playerRef.current?.getCurrentTime() || 0;
  }, []);

  const getDuration = useCallback(() => {
    return playerRef.current?.getDuration() || 0;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (playerRef.current) {
      const player = playerRef.current as unknown as { setPlaybackRate?: (rate: number) => void };
      if (typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(rate);
        setPlaybackRateState(rate);
      }
    }
  }, []);

  return {
    setPlayer,
    play,
    pause,
    seekTo,
    seekRelative,
    getCurrentTime,
    getDuration,
    setPlaybackRate,
    playbackRate,
    player: playerRef.current
  };
}
