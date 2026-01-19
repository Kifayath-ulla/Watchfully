import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface TimeCommitmentCardProps {
  remainingSeconds: number;
  onStartWatching: (minutes: number) => void;
  onSkip: () => void;
}

export function TimeCommitmentCard({ 
  remainingSeconds, 
  onStartWatching, 
  onSkip 
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
    <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded px-3 py-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
        {/* Time label */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Time:</span>
        </div>

        {/* Quick pills */}
        <div className="flex items-center gap-1">
          {quickOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`h-6 px-2 text-[11px] font-medium rounded-full transition-colors ${
                minutes === option 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
            className="w-10 h-6 px-1.5 text-center rounded-full border border-input bg-background text-foreground text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Remaining + Actions all inline */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">
            {remainingMinutes}m left
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onSkip} className="h-6 px-2 text-[11px]">
            Skip
          </Button>
          <Button type="submit" size="sm" className="h-6 px-3 text-[11px]">
            Start watching
          </Button>
        </div>
      </form>
    </div>
  );
}
