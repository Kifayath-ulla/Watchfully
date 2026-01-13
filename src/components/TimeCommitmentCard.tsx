import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="max-w-lg mx-auto border-border/60 shadow-sm">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <h3 className="text-lg font-medium text-foreground flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            How much time do you have?
          </h3>
          <p className="text-sm text-muted-foreground">
            Set your intention before watching
          </p>
        </div>

        {/* Quick Select Buttons */}
        <div className="flex justify-center gap-2">
          {quickOptions.map((option) => (
            <Button
              key={option}
              type="button"
              variant={minutes === option ? "default" : "outline"}
              size="sm"
              className="min-w-[52px]"
              onClick={() => setMinutes(option)}
            >
              {option}m
            </Button>
          ))}
        </div>

        {/* Custom Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="relative w-24">
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                min="1"
                max="180"
                className="w-full h-10 px-3 text-center rounded-md border border-input bg-background text-foreground text-lg font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>

          {/* Session Stats */}
          {sessionStats && minutes > 0 && (
            <div className="bg-muted/40 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5" />
                    Progress per session
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {sessionStats.percentagePerSession}%
                  </p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Sessions to finish
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {sessionStats.sessionsNeeded} {sessionStats.sessionsNeeded === 1 ? 'session' : 'sessions'}
                  </p>
                </div>
              </div>
              
              {sessionStats.willComplete && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-primary pt-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="font-medium">You can finish this video today!</span>
                </div>
              )}
            </div>
          )}

          {/* Video info */}
          <p className="text-xs text-center text-muted-foreground">
            {remainingMinutes} minutes remaining in this video
          </p>

          {/* Actions */}
          <div className="flex gap-2 justify-center">
            <Button type="submit" className="min-w-[140px]">
              Start watching
            </Button>
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
