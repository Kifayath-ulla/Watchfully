import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame } from 'lucide-react';

interface DayData {
  day: string;
  date: string;
  minutes: number;
  achieved: boolean;
  isToday: boolean;
}

interface WeeklyStreakDotsProps {
  dailyGoalMinutes?: number;
}

export function WeeklyStreakDots({ dailyGoalMinutes = 45 }: WeeklyStreakDotsProps) {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchWeekData = async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: dailyGoals } = await supabase
        .from('daily_goals')
        .select('date, achieved_minutes')
        .eq('user_id', user.id)
        .gte('date', weekAgo)
        .lte('date', todayStr)
        .order('date', { ascending: true });

      // Also fetch today's sessions for real-time update
      const { data: todaySessions } = await supabase
        .from('watch_sessions')
        .select('actual_minutes')
        .eq('user_id', user.id)
        .gte('started_at', todayStr);

      const todayMinutes = todaySessions?.reduce((sum, s) => sum + (s.actual_minutes || 0), 0) || 0;

      // Build week data
      const days: DayData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const isToday = dateStr === todayStr;
        
        let minutes = 0;
        if (isToday) {
          minutes = todayMinutes;
        } else {
          const dayData = dailyGoals?.find(d => d.date === dateStr);
          minutes = dayData?.achieved_minutes || 0;
        }

        days.push({
          day: dayName,
          date: dateStr,
          minutes,
          achieved: minutes >= dailyGoalMinutes * 0.8,
          isToday,
        });
      }

      setWeekData(days);

      // Calculate streak
      let currentStreak = 0;
      for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].achieved) {
          currentStreak++;
        } else if (!days[i].isToday) {
          // Don't break streak on today if not achieved yet
          break;
        }
      }
      setStreak(currentStreak);
    };

    fetchWeekData();
  }, [user, dailyGoalMinutes]);

  if (!user || weekData.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          {weekData.map((day) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div
                  className={`w-3 h-3 rounded-full transition-all ${
                    day.achieved
                      ? 'bg-primary shadow-sm'
                      : day.minutes > 0
                        ? 'bg-primary/30'
                        : 'bg-muted'
                  } ${day.isToday ? 'ring-1 ring-offset-1 ring-offset-background ring-primary/50' : ''}`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{day.day}</p>
                <p className="text-muted-foreground">{day.minutes}m watched</p>
                {day.achieved && <p className="text-primary">✓ Goal achieved</p>}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {streak > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5 text-orange-500">
                <Flame className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{streak}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{streak} day streak! 🔥</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
