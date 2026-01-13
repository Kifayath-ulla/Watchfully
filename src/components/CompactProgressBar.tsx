import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, Target } from 'lucide-react';

interface CompactProgressBarProps {
  dailyGoalMinutes?: number;
}

export function CompactProgressBar({ dailyGoalMinutes = 45 }: CompactProgressBarProps) {
  const { user } = useAuth();
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's watch sessions
      const { data: sessions } = await supabase
        .from('watch_sessions')
        .select('actual_minutes')
        .eq('user_id', user.id)
        .gte('started_at', today);

      if (sessions) {
        const watchedMinutes = sessions.reduce((sum, s) => sum + (s.actual_minutes || 0), 0);
        setTodayMinutes(watchedMinutes);
      }

      // Fetch streak from daily_goals
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: dailyGoals } = await supabase
        .from('daily_goals')
        .select('date, achieved_minutes')
        .eq('user_id', user.id)
        .gte('date', weekAgo)
        .order('date', { ascending: false });

      if (dailyGoals) {
        let currentStreak = 0;
        for (const day of dailyGoals) {
          if ((day.achieved_minutes || 0) >= dailyGoalMinutes * 0.8) {
            currentStreak++;
          } else {
            break;
          }
        }
        setStreak(currentStreak);
      }
    };

    fetchStats();
  }, [user, dailyGoalMinutes]);

  const progressPercent = Math.min(100, (todayMinutes / dailyGoalMinutes) * 100);
  const isGoalMet = progressPercent >= 100;

  return (
    <div className="flex items-center gap-3 bg-card/60 border border-border/40 rounded-lg px-3 py-2">
      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center gap-1 text-xs">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          <span className="font-medium text-foreground">{streak}</span>
        </div>
      )}
      
      {/* Progress */}
      <div className="flex items-center gap-2 flex-1 min-w-[120px]">
        <Target className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <Progress value={progressPercent} className="h-1.5 flex-1" />
        <span className={`text-xs font-medium whitespace-nowrap ${isGoalMet ? 'text-primary' : 'text-muted-foreground'}`}>
          {todayMinutes}/{dailyGoalMinutes}m
        </span>
      </div>
    </div>
  );
}
