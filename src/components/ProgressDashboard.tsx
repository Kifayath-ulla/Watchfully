import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Clock, 
  CheckCircle2, 
  Flame, 
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react';

interface DailyStats {
  date: string;
  watchedMinutes: number;
  videosCompleted: number;
}

interface ProgressDashboardProps {
  dailyGoalMinutes?: number;
}

export function ProgressDashboard({ dailyGoalMinutes = 45 }: ProgressDashboardProps) {
  const { user } = useAuth();
  const [todayStats, setTodayStats] = useState({ watchedMinutes: 0, videosCompleted: 0 });
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch today's watch sessions
      const { data: sessions } = await supabase
        .from('watch_sessions')
        .select('actual_minutes, was_completed')
        .eq('user_id', user.id)
        .gte('started_at', today);

      if (sessions) {
        const watchedMinutes = sessions.reduce((sum, s) => sum + (s.actual_minutes || 0), 0);
        const videosCompleted = sessions.filter(s => s.was_completed).length;
        setTodayStats({ watchedMinutes, videosCompleted });
      }

      // Fetch completed videos count
      const { count: completedCount } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      setTotalCompleted(completedCount || 0);

      // Fetch weekly stats for streak calculation
      const { data: dailyGoals } = await supabase
        .from('daily_goals')
        .select('date, achieved_minutes, videos_completed')
        .eq('user_id', user.id)
        .gte('date', weekAgo)
        .order('date', { ascending: false });

      if (dailyGoals) {
        setWeeklyStats(dailyGoals.map(g => ({
          date: g.date,
          watchedMinutes: g.achieved_minutes || 0,
          videosCompleted: g.videos_completed || 0
        })));

        // Calculate streak
        let currentStreak = 0;
        const sortedDays = [...dailyGoals].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        for (const day of sortedDays) {
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

  const progressPercent = Math.min(100, (todayStats.watchedMinutes / dailyGoalMinutes) * 100);

  const getWeekDays = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const stats = weeklyStats.find(s => s.date === dateStr);
      days.push({
        day: dayName,
        date: dateStr,
        achieved: stats ? (stats.watchedMinutes >= dailyGoalMinutes * 0.8) : false,
        minutes: stats?.watchedMinutes || 0
      });
    }
    return days;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Today</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {todayStats.watchedMinutes}
              <span className="text-sm font-normal text-muted-foreground">m</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Completed</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {totalCompleted}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs">Streak</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {streak}
              <span className="text-sm font-normal text-muted-foreground"> days</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs">Daily Goal</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {dailyGoalMinutes > 0 ? (
                <>
                  {dailyGoalMinutes}
                  <span className="text-sm font-normal text-muted-foreground">m</span>
                </>
              ) : (
                <span className="text-sm font-normal text-muted-foreground">No limit</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Goal Progress */}
      {dailyGoalMinutes > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Daily Goal Progress</span>
              <Badge variant={progressPercent >= 100 ? 'default' : 'secondary'}>
                {todayStats.watchedMinutes}/{dailyGoalMinutes}m
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {progressPercent >= 100 
                ? '🎉 Goal achieved! Great job today.'
                : `${Math.max(0, dailyGoalMinutes - todayStats.watchedMinutes)} minutes left to reach your goal`
              }
            </p>
          </CardContent>
        </Card>
      )}
