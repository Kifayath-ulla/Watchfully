import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, ChevronDown, Flame, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayData {
  date: string;
  dayOfMonth: number;
  minutes: number;
  percentage: number;
  achieved: boolean;
  partial: boolean;
  isToday: boolean;
  isFuture: boolean;
}

interface CalendarProgressTrackerProps {
  dailyGoalMinutes?: number;
}

// Circular progress indicator component
function ProgressCircle({ percentage, size = 28, isToday = false, isFuture = false }: { 
  percentage: number; 
  size?: number; 
  isToday?: boolean;
  isFuture?: boolean;
}) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={cn(
      "relative flex items-center justify-center",
      isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background rounded-full"
    )} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="3"
          className={cn(
            isFuture ? "stroke-muted/30" : "stroke-muted"
          )}
        />
        {/* Progress circle */}
        {percentage > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className={cn(
              percentage >= 80 ? "stroke-primary" : "stroke-primary/60"
            )}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
              transition: 'stroke-dashoffset 0.3s ease'
            }}
          />
        )}
      </svg>
      {/* Center fill for 100% */}
      {percentage >= 100 && (
        <div className="absolute inset-1 rounded-full bg-primary/20" />
      )}
    </div>
  );
}

export function CalendarProgressTracker({ dailyGoalMinutes = 45 }: CalendarProgressTrackerProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState<Map<string, DayData>>(new Map());
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (!user) return;

    const fetchProgressData = async () => {
      setLoading(true);
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      // Fetch all historical data
      const { data: dailyGoals } = await supabase
        .from('daily_goals')
        .select('date, achieved_minutes, videos_completed')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      // Fetch today's sessions for real-time
      const { data: todaySessions } = await supabase
        .from('watch_sessions')
        .select('actual_minutes')
        .eq('user_id', user.id)
        .gte('started_at', todayStr);

      const todayMinutes = todaySessions?.reduce((sum, s) => sum + (s.actual_minutes || 0), 0) || 0;

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
          partial: mins > 0 && mins < dailyGoalMinutes * 0.8,
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
          partial: todayMinutes > 0 && todayMinutes < dailyGoalMinutes * 0.8,
          isToday: true,
          isFuture: false,
        });
      }

      setMonthData(dataMap);

      // Calculate streak from the last 30 days
      let currentStreak = 0;
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = dataMap.get(dateStr);
        
        if (dayData?.achieved) {
          currentStreak++;
        } else if (i > 0) { // Allow today to not be achieved yet
          break;
        }
      }
      setStreak(currentStreak);
      setLoading(false);
    };

    fetchProgressData();
  }, [user, dailyGoalMinutes]);

  // Generate calendar grid for current month organized by weeks
  const { calendarWeeks, weekLabels } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const todayDate = new Date();

    const weeks: (DayData | null)[][] = [];
    const labels: string[] = [];
    let currentWeek: (DayData | null)[] = [];

    // Add padding for days before the month starts
    for (let i = 0; i < startPadding; i++) {
      currentWeek.push(null);
    }

    // Add each day of the month
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
        partial: false,
        isToday: dateStr === today,
        isFuture,
      });

      // When week is complete (7 days), push to weeks array
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        labels.push(`Week ${weeks.length}`);
        currentWeek = [];
      }
    }

    // Push any remaining days as the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
      labels.push(`Week ${weeks.length}`);
    }

    return { calendarWeeks: weeks, weekLabels: labels };
  }, [currentMonth, monthData, today]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (!user) return null;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 pt-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Activity
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </CardTitle>
              {streak > 0 && (
                <div className="flex items-center gap-1 text-orange-500">
                  <Flame className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">{streak}d</span>
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        {/* Current Week Preview (Always Visible) */}
        <CardContent className="pt-0 pb-3 px-4">
          <TooltipProvider>
            <div className="flex justify-between items-center gap-1">
              {calendarWeeks.length > 0 && calendarWeeks[calendarWeeks.length - 1].map((day, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-0.5">
                      {day ? (
                        <ProgressCircle 
                          percentage={day.percentage} 
                          size={24} 
                          isToday={day.isToday}
                          isFuture={day.isFuture}
                        />
                      ) : (
                        <div className="w-6 h-6" />
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'][idx]}
                      </span>
                    </div>
                  </TooltipTrigger>
                  {day && (
                    <TooltipContent side="bottom" className="text-xs">
                      <p className="font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                      <p className="text-muted-foreground">{day.minutes}m watched ({day.percentage}%)</p>
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
          <CardContent className="pt-0 pb-4 px-4 border-t border-border">
            {/* Month Navigation */}
            <div className="flex items-center justify-between py-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm">{monthName}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid - Organized by Weeks */}
            <TooltipProvider>
              <div className="space-y-1">
                {calendarWeeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="grid grid-cols-7 gap-1">
                    {week.map((day, dayIdx) => (
                      <div key={dayIdx} className="flex justify-center">
                        {day ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative flex flex-col items-center">
                                <ProgressCircle 
                                  percentage={day.percentage} 
                                  size={28}
                                  isToday={day.isToday}
                                  isFuture={day.isFuture}
                                />
                                <span className={cn(
                                  "absolute inset-0 flex items-center justify-center text-[9px] font-medium",
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
                          <div className="w-7 h-7" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </TooltipProvider>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <ProgressCircle percentage={100} size={14} />
                <span className="text-[10px] text-muted-foreground">100%</span>
              </div>
              <div className="flex items-center gap-1">
                <ProgressCircle percentage={50} size={14} />
                <span className="text-[10px] text-muted-foreground">50%</span>
              </div>
              <div className="flex items-center gap-1">
                <ProgressCircle percentage={0} size={14} />
                <span className="text-[10px] text-muted-foreground">0%</span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
