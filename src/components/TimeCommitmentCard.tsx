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
    <div className="bg-card/70 backdrop-blur-sm border border-border/50 rounded-xl px-5 py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-3 text-sm">
        {/* Time label */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline text-sm font-medium">How much time?</span>
        </div>

        {/* Quick pills */}
        <div className="flex items-center gap-1.5">
          {quickOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
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
            className="w-12 h-8 px-2 text-center border border-input bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring rounded-lg"
          />
          <span className="text-xs text-muted-foreground">min</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/60" />

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="text-foreground font-semibold">{progressPercent}%</span>
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{sessionsToday} sessions</span>
          </span>
          <span className="flex items-center gap-1 text-primary">
            <Sparkles className="h-3 w-3" />
            <span>Finish today!</span>
          </span>
        </div>

        {/* Time remaining + Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {remainingMinutes}min left
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onSkip} className="h-8 px-3 text-xs">
            Skip
          </Button>
          <Button type="submit" size="sm" className="h-8 px-4 text-xs font-medium">
            Start watching
          </Button>
        </div>
      </form>
    </div>
  );
}
