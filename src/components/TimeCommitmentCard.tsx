import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Sparkles, TrendingUp } from 'lucide-react';

interface TimeCommitmentCardProps {
  remainingSeconds: number;
  onStartWatching: (minutes: number) => void;
  onSkip: () => void;
  sessionsToday?: number;
  progressPercent?: number;
}

export function TimeCommitmentCard({ 
  remainingSeconds, 
  onStartWatching, 
  onSkip,
  sessionsToday = 1,
  progressPercent = 100
}: TimeCommitmentCardProps) {
  const [minutes, setMinutes] = useState(30);
  const remainingMinutes = Math.ceil(remainingSeconds / 60);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes > 0 && minutes <= 180) {
      onStartWatching(minutes);
    }
  };

  const quickOptions = [15, 30, 45, 60];

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-md px-3 py-1.5">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 text-xs">
        {/* Time label */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="hidden sm:inline text-[11px]">How much time?</span>
        </div>

        {/* Quick pills */}
        <div className="flex items-center gap-0.5">
          {quickOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`h-5 px-1.5 text-[10px] font-medium rounded transition-colors ${
                minutes === option 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setMinutes(option)}
            >
              {option}m
            </button>
          ))}
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
            min="1"
            max="180"
            className="w-8 h-5 px-1 text-center border border-input bg-background text-foreground text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-ring rounded"
          />
          <span className="text-[10px] text-muted-foreground">min</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-border/60" />

        {/* Stats */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <span className="text-foreground font-medium">{progressPercent}%</span>
          </span>
          <span className="flex items-center gap-0.5">
            <TrendingUp className="h-2.5 w-2.5" />
            <span>{sessionsToday} sessions</span>
          </span>
          <span className="flex items-center gap-0.5 text-primary">
            <Sparkles className="h-2.5 w-2.5" />
            <span>Finish today!</span>
          </span>
        </div>

        {/* Time remaining + Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {remainingMinutes}min left
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onSkip} className="h-5 px-1.5 text-[10px]">
            Skip
          </Button>
          <Button type="submit" size="sm" className="h-5 px-2 text-[10px]">
            Start watching
          </Button>
        </div>
      </form>
    </div>
  );
}
