import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Target, Zap, TrendingUp } from 'lucide-react';

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

  const sessionStats = useMemo(() => {
    if (minutes <= 0) return null;
    
    const sessionsNeeded = remainingMinutes / minutes;
    const sessionsDisplay = sessionsNeeded <= 1 ? 1 : parseFloat(sessionsNeeded.toFixed(1));
    const willComplete = minutes >= remainingMinutes;
    const percentagePerSession = Math.min(100, Math.round((minutes / remainingMinutes) * 100));
    
    return {
      sessionsNeeded: sessionsDisplay,
      willComplete,
      percentagePerSession,
    };
  }, [minutes, remainingMinutes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes > 0 && minutes <= 180) {
      onStartWatching(minutes);
    }
  };

  const quickOptions = [15, 30, 45, 60];

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-lg px-4 py-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Left: Title + Quick buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">How much time?</span>
          </div>
          <div className="flex items-center gap-1">
            {quickOptions.map((option) => (
              <Button
                key={option}
                type="button"
                variant={minutes === option ? "default" : "outline"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setMinutes(option)}
              >
                {option}m
              </Button>
            ))}
            <div className="flex items-center gap-1 ml-1">
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                min="1"
                max="180"
                className="w-12 h-7 px-2 text-center rounded border border-input bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
        </div>

        {/* Center: Stats */}
        {sessionStats && minutes > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground border-l border-border pl-4">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span className="font-medium text-foreground">{sessionStats.percentagePerSession}%</span>
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium text-foreground">{sessionStats.sessionsNeeded}</span> sessions
            </span>
            {sessionStats.willComplete && (
              <span className="flex items-center gap-1 text-primary">
                <Zap className="h-3 w-3" />
                <span className="font-medium">Finish today!</span>
              </span>
            )}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground hidden lg:inline">
            {remainingMinutes}min left
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onSkip} className="h-7 text-xs">
            Skip
          </Button>
          <Button type="submit" size="sm" className="h-7 text-xs">
            Start watching
          </Button>
        </div>
      </form>
    </div>
  );
}
