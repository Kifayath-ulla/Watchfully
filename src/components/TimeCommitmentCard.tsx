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
    
    const sessionsNeeded = Math.ceil(remainingMinutes / minutes);
    const willComplete = minutes >= remainingMinutes;
    const percentagePerSession = Math.min(100, Math.round((minutes / remainingMinutes) * 100));
    
    return {
      sessionsNeeded,
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
    <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 max-w-md mx-auto shadow-sm">
      {/* Header */}
      <div className="text-center mb-3">
        <h3 className="text-base font-medium text-foreground flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          How much time do you have?
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Set your intention before watching
        </p>
      </div>

      {/* Quick Select + Custom Input Row */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {quickOptions.map((option) => (
            <Button
              key={option}
              type="button"
              variant={minutes === option ? "default" : "outline"}
              size="sm"
              className="min-w-[48px] h-8 text-xs"
              onClick={() => setMinutes(option)}
            >
              {option}m
            </Button>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              min="1"
              max="180"
              className="w-14 h-8 px-2 text-center rounded-md border border-input bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">min</span>
          </div>
        </div>

        {/* Compact Session Stats */}
        {sessionStats && minutes > 0 && (
          <div className="flex items-center justify-center gap-4 text-xs bg-muted/40 rounded-lg py-2 px-3">
            <div className="flex items-center gap-1.5">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Progress:</span>
              <span className="font-medium text-foreground">{sessionStats.percentagePerSession}%</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Sessions:</span>
              <span className="font-medium text-foreground">{sessionStats.sessionsNeeded}</span>
            </div>
            {sessionStats.willComplete && (
              <>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1 text-primary">
                  <Zap className="h-3 w-3" />
                  <span className="font-medium">Finish today!</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Video info + Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {remainingMinutes}min remaining
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onSkip} className="h-8 text-xs">
              Skip
            </Button>
            <Button type="submit" size="sm" className="h-8 text-xs">
              Start watching
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
