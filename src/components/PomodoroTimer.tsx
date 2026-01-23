import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const TIMER_CONFIGS = {
  focus: { minutes: 25, label: 'Focus', icon: Timer },
  shortBreak: { minutes: 5, label: 'Short Break', icon: Coffee },
  longBreak: { minutes: 15, label: 'Long Break', icon: Coffee },
};

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_CONFIGS.focus.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    if (mode === 'focus') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      
      // Every 4 sessions, take a long break
      if (newSessions % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(TIMER_CONFIGS.longBreak.minutes * 60);
      } else {
        setMode('shortBreak');
        setTimeLeft(TIMER_CONFIGS.shortBreak.minutes * 60);
      }
    } else {
      setMode('focus');
      setTimeLeft(TIMER_CONFIGS.focus.minutes * 60);
    }

    // Play notification sound
    if (Notification.permission === 'granted') {
      new Notification('Pomodoro Timer', {
        body: mode === 'focus' ? 'Time for a break!' : 'Ready to focus!',
        icon: '/favicon.png',
      });
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_CONFIGS[mode].minutes * 60);
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(TIMER_CONFIGS[newMode].minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / (TIMER_CONFIGS[mode].minutes * 60)) * 100;
  const circumference = 2 * Math.PI * 38;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Card className="bg-card/80 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Pomodoro</span>
          </div>
          <span className="text-xs text-muted-foreground">{sessions} sessions</span>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-1.5 mb-4">
          {(Object.keys(TIMER_CONFIGS) as TimerMode[]).map((m) => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 px-3 text-xs flex-1",
                mode === m && "bg-primary text-primary-foreground"
              )}
              onClick={() => switchMode(m)}
            >
              {TIMER_CONFIGS[m].label}
            </Button>
          ))}
        </div>

        {/* Timer Display */}
        <div className="flex justify-center mb-4">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="38"
                fill="none"
                strokeWidth="4"
                className="stroke-muted"
              />
              <circle
                cx="40"
                cy="40"
                r="38"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className={cn(
                  mode === 'focus' ? 'stroke-primary' : 'stroke-accent-foreground'
                )}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                  transition: 'stroke-dashoffset 0.5s ease',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums">
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs text-muted-foreground">
                {TIMER_CONFIGS[mode].label}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={resetTimer}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className={cn(
              "h-10 w-10",
              isRunning && "bg-destructive hover:bg-destructive/90"
            )}
            onClick={toggleTimer}
          >
            {isRunning ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
