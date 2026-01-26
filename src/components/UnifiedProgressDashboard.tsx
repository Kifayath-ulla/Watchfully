import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, ChevronDown, Flame, Calendar, Clock, CheckCircle2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayData {
  date: string;
  dayOfMonth: number;
  minutes: number;
  percentage: number;
  achieved: boolean;
  isToday: boolean;
  isFuture: boolean;
}

interface UnifiedProgressDashboardProps {
  dailyGoalMinutes?: number;
}

// Circular progress indicator
function ProgressCircle({ percentage, size = 24, isToday = false, isFuture = false }: { 
  percentage: number; 
  size?: number; 
  isToday?: boolean;
  isFuture?: boolean;
}) {
  const radius = (size - 3) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={cn(
      "relative flex items-center justify-center",
      isToday && "ring-1.5 ring-primary ring-offset-1 ring-offset-background rounded-full"
    )} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="2.5"
          className={cn(isFuture ? "stroke-muted/30" : "stroke-muted")}
        />
        {percentage > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={cn(percentage >= 80 ? "stroke-primary" : "stroke-primary/60")}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
              transition: 'stroke-dashoffset 0.3s ease'
            }}
          />
        )}
      </svg>
      {percentage >= 100 && (
        <div className="absolute inset-1 rounded-full bg-primary/20" />
      )}
    </div>
  );
}

export function UnifiedProgressDashboard({ dailyGoalMinutes = 45 }: UnifiedProgressDashboardProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState<Map<string, DayData>>(new Map());
  const [todayStats, setTodayStats] = useState({ watchedMinutes: 0, videosCompleted: 0 });
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [streak, setStreak] = useState(0);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Fetch today's watch sessions
      const { data: sessions } = await supabase
        .from('watch_sessions')
        .select('actual_minutes, was_completed')
        .eq('user_id', user.id)
        .gte('started_at', todayStr);

      if (sessions) {
        const watchedMinutes = sessions.reduce((sum, s) => sum + (s.actual_minutes || 0), 0);
        const videosCompleted = sessions.filter((s) => s.was_completed).length;
        setTodayStats({ watchedMinutes, videosCompleted });
      }

      // Fetch completed videos count
      const { count: completedCount } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      setTotalCompleted(completedCount || 0);

      // Fetch all historical daily goals
      const { data: dailyGoals } = await supabase
        .from('daily_goals')
        .select('date, achieved_minutes, videos_completed')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      const todayMinutes = sessions?.reduce((sum, s) => sum + (s.actual_minutes || 0), 0) || 0;

      // Build data map
      const dataMap = new Map<string, DayData>();
      dailyGoals?.forEach(goal => {
        const mins = goal.achieved_minutes || 0;
        const percentage = dailyGoalMinutes > 0 ? Math.min(100, Math.round((mins / dailyGoalMinutes) * 100)) : 0;
        dataMap.set(goal.date, {
          date: goal.date,
          dayOfMonth: new Date(goal.date).getDate(),
          minutes: mins,
          percentage,
          achieved: mins >= dailyGoalMinutes * 0.8,
          isToday: goal.date === todayStr,
          isFuture: false,
        });
      });

      // Add today's data
      if (todayMinutes > 0 || !dataMap.has(todayStr)) {
        const percentage = dailyGoalMinutes > 0 ? Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100)) : 0;
        dataMap.set(todayStr, {
          date: todayStr,
          dayOfMonth: now.getDate(),
          minutes: todayMinutes,
          percentage,
          achieved: todayMinutes >= dailyGoalMinutes * 0.8,
          isToday: true,
          isFuture: false,
        });
      }

      setMonthData(dataMap);

      // Calculate streak
      let currentStreak = 0;
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = dataMap.get(dateStr);
        
        if (dayData?.achieved) {
          currentStreak++;
        } else if (i > 0) {
          break;
        }
      }
      setStreak(currentStreak);
    };

    fetchData();
  }, [user, dailyGoalMinutes]);

  // Generate current week for preview
  const currentWeek = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday
    
    const week: (DayData | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const isFuture = date > now;
      const existing = monthData.get(dateStr);
      
      week.push(existing || {
        date: dateStr,
        dayOfMonth: date.getDate(),
        minutes: 0,
        percentage: 0,
        achieved: false,
        isToday: dateStr === today,
        isFuture,
      });
    }
    return week;
  }, [monthData, today]);

  // Generate calendar grid for expanded month view
  const calendarWeeks = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const todayDate = new Date();

    const weeks: (DayData | null)[][] = [];
    let currentWeek: (DayData | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isFuture = date > todayDate;
      const existing = monthData.get(dateStr);

      currentWeek.push(existing || {
        date: dateStr,
        dayOfMonth: day,
        minutes: 0,
        percentage: 0,
        achieved: false,
        isToday: dateStr === today,
        isFuture,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentMonth, monthData, today]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const progressPercent = dailyGoalMinutes > 0 ? Math.min(100, (todayStats.watchedMinutes / dailyGoalMinutes) * 100) : 0;
  const minutesLeft = Math.max(0, dailyGoalMinutes - todayStats.watchedMinutes);

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Stats Row - 4 prominent cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Today</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {todayStats.watchedMinutes}
              <span className="text-lg font-normal text-muted-foreground ml-1">min</span>
            </p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {totalCompleted}
              <span className="text-lg font-normal text-muted-foreground ml-1">videos</span>
            </p>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Streak</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {streak}
              <span className="text-lg font-normal text-muted-foreground ml-1">days</span>
            </p>
          </CardContent>
        </Card>

        {/* Daily Goal */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Daily Goal</span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2.5 mb-2" />
            <p className="text-sm text-muted-foreground">
              {minutesLeft > 0 ? `${minutesLeft} min remaining` : '✓ Goal achieved!'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Tracker */}
      <Card className="bg-card border-border/50">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-base font-semibold">Activity</span>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>

          {/* Current Week Preview */}
          <CardContent className="pt-0 pb-5 px-5">
            <TooltipProvider>
              <div className="flex justify-between items-center gap-2">
                {currentWeek.map((day, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}
                        </span>
                        {day ? (
                          <ProgressCircle 
                            percentage={day.percentage} 
                            size={44} 
                            isToday={day.isToday}
                            isFuture={day.isFuture}
                          />
                        ) : (
                          <div className="w-11 h-11" />
                        )}
                      </div>
                    </TooltipTrigger>
                    {day && (
                      <TooltipContent side="bottom" className="text-sm">
                        <p className="font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        <p className="text-muted-foreground">{day.minutes}m ({day.percentage}%)</p>
                        {day.achieved && <p className="text-primary font-medium">✓ Goal achieved!</p>}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </CardContent>

          {/* Expanded Monthly View */}
          <CollapsibleContent>
            <CardContent className="pt-0 pb-5 px-5 border-t border-border/50">
              <div className="flex items-center justify-between py-4">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="font-semibold text-base">{monthName}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-3">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">
                    {d}
                  </div>
                ))}
              </div>

              <TooltipProvider>
                <div className="space-y-2">
                  {calendarWeeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-7 gap-2">
                      {week.map((day, dayIdx) => (
                        <div key={dayIdx} className="flex justify-center">
                          {day ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="relative flex flex-col items-center">
                                  <ProgressCircle 
                                    percentage={day.percentage} 
                                    size={32}
                                    isToday={day.isToday}
                                    isFuture={day.isFuture}
                                  />
                                  <span className={cn(
                                    "absolute inset-0 flex items-center justify-center text-[10px] font-medium",
                                    day.achieved ? "text-primary" : day.isFuture ? "text-muted-foreground/50" : "text-foreground/70"
                                  )}>
                                    {day.dayOfMonth}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-sm">
                                <p className="font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                {!day.isFuture && (
                                  <>
                                    <p className="text-muted-foreground">{day.minutes}m ({day.percentage}%)</p>
                                    {day.achieved && <p className="text-primary">✓ Goal achieved</p>}
                                  </>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="w-8 h-8" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
