import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, X, Maximize2, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/youtube';

interface MiniPlayerProps {
  isVisible: boolean;
  videoId: string;
  youtubeVideoId: string;
  title: string;
  thumbnailUrl?: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onClose: () => void;
  onExpand: () => void;
  onSkipForward: () => void;
}

export function MiniPlayer({
  isVisible,
  videoId,
  youtubeVideoId,
  title,
  thumbnailUrl,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onClose,
  onExpand,
  onSkipForward,
}: MiniPlayerProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const thumbnail = thumbnailUrl || `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden transition-all duration-300 transform",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      {/* Thumbnail with play controls overlay */}
      <div className="relative aspect-video bg-muted">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
        />
        
        {/* Play/Pause overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10 rounded-full"
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>

        {/* Time indicator */}
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}
        </div>
      </div>

      {/* Info and controls */}
      <div className="p-2 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground">
            {isPlaying ? 'Playing' : 'Paused'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onSkipForward}
            title="Skip 10s"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onExpand}
            title="Expand"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
