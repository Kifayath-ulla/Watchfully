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
    <div className="flex items-center justify-center gap-1">
      {/* Skip Back */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSkipBack(10)}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Skip back 10 seconds (←)"
      >
        <SkipBack className="h-4 w-4" />
      </Button>

      {/* Play/Pause */}
      <Button
        variant="default"
        size="icon"
        onClick={isPlaying ? onPause : onPlay}
        className="h-10 w-10 rounded-full"
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>

      {/* Skip Forward */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSkipForward(10)}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Skip forward 10 seconds (→)"
      >
        <SkipForward className="h-4 w-4" />
      </Button>

      {/* Playback Speed */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 ml-1 text-xs text-muted-foreground hover:text-foreground">
            <Gauge className="h-3.5 w-3.5" />
            {playbackRate}x
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="bg-popover">
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
