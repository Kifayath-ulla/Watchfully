import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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

  if (!user) return null;

  return (
    <div className="space-y-3">
      {/* Stats Row + Activity in one unified layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Left: Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-4 gap-2">
          <Card className="bg-card/80">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[10px]">Today</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {todayStats.watchedMinutes}
                <span className="text-xs font-normal text-muted-foreground">m</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-[10px]">Completed</span>
              </div>
              <p className="text-xl font-semibold text-foreground">{totalCompleted}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-[10px]">Streak</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {streak}
                <span className="text-xs font-normal text-muted-foreground"> days</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <Target className="h-3.5 w-3.5" />
                <span className="text-[10px]">Daily Goal</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {dailyGoalMinutes > 0 ? (
                  <>
                    {dailyGoalMinutes}
                    <span className="text-xs font-normal text-muted-foreground">m</span>
                  </>
                ) : (
                  <span className="text-xs font-normal text-muted-foreground">No limit</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Activity Tracker (Collapsible) */}
        <Card className="lg:col-span-2 overflow-hidden bg-card/80">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Activity</span>
                  <ChevronDown className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                </div>
              </div>
            </CollapsibleTrigger>

            {/* Current Week Preview */}
            <CardContent className="pt-0 pb-2 px-3">
              <TooltipProvider>
                <div className="flex justify-between items-center">
                  {currentWeek.map((day, idx) => (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-0.5">
                          {day ? (
                            <ProgressCircle 
                              percentage={day.percentage} 
                              size={22} 
                              isToday={day.isToday}
                              isFuture={day.isFuture}
                            />
                          ) : (
                            <div className="w-5 h-5" />
                          )}
                          <span className="text-[9px] text-muted-foreground">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'][idx]}
                          </span>
                        </div>
                      </TooltipTrigger>
                      {day && (
                        <TooltipContent side="bottom" className="text-xs">
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
              <CardContent className="pt-0 pb-3 px-3 border-t border-border/50">
                <div className="flex items-center justify-between py-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="font-medium text-xs">{monthName}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[9px] text-muted-foreground font-medium py-0.5">
                      {d}
                    </div>
                  ))}
                </div>

                <TooltipProvider>
                  <div className="space-y-0.5">
                    {calendarWeeks.map((week, weekIdx) => (
                      <div key={weekIdx} className="grid grid-cols-7 gap-0.5">
                        {week.map((day, dayIdx) => (
                          <div key={dayIdx} className="flex justify-center">
                            {day ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative flex flex-col items-center">
                                    <ProgressCircle 
                                      percentage={day.percentage} 
                                      size={24}
                                      isToday={day.isToday}
                                      isFuture={day.isFuture}
                                    />
                                    <span className={cn(
                                      "absolute inset-0 flex items-center justify-center text-[8px] font-medium",
                                      day.achieved ? "text-primary" : day.isFuture ? "text-muted-foreground/50" : "text-foreground/70"
                                    )}>
                                      {day.dayOfMonth}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
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
                              <div className="w-6 h-6" />
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

      {/* Daily Goal Progress Bar */}
      {dailyGoalMinutes > 0 && (
        <Card className="bg-card/80">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground">Daily Goal Progress</span>
              <Badge variant={progressPercent >= 100 ? "default" : "secondary"} className="text-[10px] h-5">
                {todayStats.watchedMinutes}/{dailyGoalMinutes}m
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {progressPercent >= 100
                ? "🎉 Goal achieved! Great job today."
                : `${Math.max(0, dailyGoalMinutes - todayStats.watchedMinutes)} minutes left to reach your goal`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
