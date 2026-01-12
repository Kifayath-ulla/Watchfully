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
