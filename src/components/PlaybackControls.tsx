import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Gauge
} from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onSkipBack: (seconds: number) => void;
  onSkipForward: (seconds: number) => void;
  onPlaybackRateChange: (rate: number) => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function PlaybackControls({
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onSkipBack,
  onSkipForward,
  onPlaybackRateChange
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50">
      {/* Skip Back */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSkipBack(10)}
        className="h-10 w-10"
        title="Skip back 10 seconds"
      >
        <SkipBack className="h-5 w-5" />
        <span className="sr-only">Skip back 10s</span>
      </Button>

      {/* Play/Pause */}
      <Button
        variant="default"
        size="icon"
        onClick={isPlaying ? onPause : onPlay}
        className="h-12 w-12 rounded-full"
      >
        {isPlaying ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6 ml-0.5" />
        )}
        <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
      </Button>

      {/* Skip Forward */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSkipForward(10)}
        className="h-10 w-10"
        title="Skip forward 10 seconds"
      >
        <SkipForward className="h-5 w-5" />
        <span className="sr-only">Skip forward 10s</span>
      </Button>

      {/* Playback Speed */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 ml-2">
            <Gauge className="h-4 w-4" />
            {playbackRate}x
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {PLAYBACK_RATES.map((rate) => (
            <DropdownMenuItem
              key={rate}
              onClick={() => onPlaybackRateChange(rate)}
              className={playbackRate === rate ? 'bg-primary/10 text-primary' : ''}
            >
              {rate}x {rate === 1 && '(Normal)'}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
