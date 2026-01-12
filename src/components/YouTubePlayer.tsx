import { useEffect, useRef, useCallback, useState } from 'react';

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
}

export function YouTubePlayer({
  videoId,
  startSeconds = 0,
  onReady,
  onStateChange,
  onTimeUpdate,
  onEnd,
  autoplay = true
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [isAPIReady, setIsAPIReady] = useState(!!window.YT?.Player);

  // Load YouTube IFrame API
  useEffect(() => {
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
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!isAPIReady || !containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        start: Math.floor(startSeconds),
        modestbranding: 1,
        rel: 0,
        enablejsapi: 1,
        origin: window.location.origin
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
  }, [isAPIReady, videoId]);

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

  return (
    <div className="relative w-full aspect-video bg-background rounded-lg overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
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

  const getCurrentTime = useCallback(() => {
    return playerRef.current?.getCurrentTime() || 0;
  }, []);

  const getDuration = useCallback(() => {
    return playerRef.current?.getDuration() || 0;
  }, []);

  return {
    setPlayer,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration,
    player: playerRef.current
  };
}
