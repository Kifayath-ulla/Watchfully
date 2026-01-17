import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ChevronDown, Flame, Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayData {
  date: string;
  dayOfMonth: number;
  dayName: string;
  minutes: number;
  percentage: number;
  achieved: boolean;
  partial: boolean;
  isToday: boolean;
  isFuture: boolean;
  isCurrentMonth: boolean;
}

interface CalendarProgressTrackerProps {
  dailyGoalMinutes?: number;
}

export function CalendarProgressTracker({ dailyGoalMinutes = 45 }: CalendarProgressTrackerProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weekData, setWeekData] = useState<DayData[]>([]);
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
      
      // Fetch last 90 days for comprehensive data
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: dailyGoals } = await supabase
        .from('daily_goals')
        .select('date, achieved_minutes, videos_completed')
        .eq('user_id', user.id)
        .gte('date', threeMonthsAgo)
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
          dayName: new Date(goal.date).toLocaleDateString('en-US', { weekday: 'short' }),
          minutes: mins,
          percentage,
          achieved: mins >= dailyGoalMinutes * 0.8,
          partial: mins > 0 && mins < dailyGoalMinutes * 0.8,
          isToday: goal.date === todayStr,
          isFuture: false,
          isCurrentMonth: true,
        });
      });

      // Add today's data
      if (todayMinutes > 0 || !dataMap.has(todayStr)) {
        const percentage = dailyGoalMinutes > 0 ? Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100)) : 0;
        dataMap.set(todayStr, {
          date: todayStr,
          dayOfMonth: now.getDate(),
          dayName: now.toLocaleDateString('en-US', { weekday: 'short' }),
          minutes: todayMinutes,
          percentage,
          achieved: todayMinutes >= dailyGoalMinutes * 0.8,
          partial: todayMinutes > 0 && todayMinutes < dailyGoalMinutes * 0.8,
          isToday: true,
          isFuture: false,
          isCurrentMonth: true,
        });
      }

      setMonthData(dataMap);

      // Build week data (last 7 days)
      const weekDays: DayData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const existing = dataMap.get(dateStr);
        
        weekDays.push(existing || {
          date: dateStr,
          dayOfMonth: date.getDate(),
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          minutes: 0,
          percentage: 0,
          achieved: false,
          partial: false,
          isToday: dateStr === todayStr,
          isFuture: false,
          isCurrentMonth: true,
        });
      }
      setWeekData(weekDays);

      // Calculate streak
      let currentStreak = 0;
      for (let i = weekDays.length - 1; i >= 0; i--) {
        if (weekDays[i].achieved) {
          currentStreak++;
        } else if (!weekDays[i].isToday) {
          break;
        }
      }
      setStreak(currentStreak);
      setLoading(false);
    };

    fetchProgressData();
  }, [user, dailyGoalMinutes]);

  // Generate calendar grid for current month
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const todayDate = new Date();

    const grid: (DayData | null)[] = [];

    // Add padding for days before the month starts
    for (let i = 0; i < startPadding; i++) {
      grid.push(null);
    }

    // Add each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isFuture = date > todayDate;
      const existing = monthData.get(dateStr);

      grid.push(existing || {
        date: dateStr,
        dayOfMonth: day,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        minutes: 0,
        percentage: 0,
        achieved: false,
        partial: false,
        isToday: dateStr === today,
        isFuture,
        isCurrentMonth: true,
      });
    }

    return grid;
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
        {/* Weekly View (Always Visible) */}
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Progress Tracker
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </CardTitle>
              {streak > 0 && (
                <div className="flex items-center gap-1 text-orange-500">
                  <Flame className="h-4 w-4" />
                  <span className="text-sm font-semibold">{streak} day streak</span>
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        {/* Weekly Dots */}
        <CardContent className="pt-0 pb-4">
          <TooltipProvider>
            <div className="flex justify-between items-center">
              {weekData.map((day) => (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                          day.achieved && "bg-primary text-primary-foreground shadow-sm",
                          day.partial && "bg-primary/30",
                          !day.achieved && !day.partial && "bg-muted",
                          day.isToday && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                        )}
                      >
                        {day.achieved ? (
                          <Check className="h-4 w-4" />
                        ) : day.percentage > 0 ? (
                          <span className="text-xs font-medium">{day.percentage}%</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs",
                        day.isToday ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}>
                        {day.dayName}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    <p className="text-muted-foreground">{day.minutes} minutes watched</p>
                    {day.achieved && <p className="text-primary font-medium">✓ Goal achieved!</p>}
                    {day.partial && <p className="text-primary/70">Partial progress</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>

        {/* Expanded Monthly View */}
        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-border">
            {/* Month Navigation */}
            <div className="flex items-center justify-between py-3">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm">{monthName}</span>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <TooltipProvider>
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((day, idx) => (
                  <div key={idx} className="aspect-square">
                    {day ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "w-full h-full rounded-md flex flex-col items-center justify-center text-xs transition-all relative",
                              day.isFuture && "opacity-30",
                              day.achieved && "bg-primary text-primary-foreground",
                              day.partial && "bg-primary/20",
                              !day.achieved && !day.partial && !day.isFuture && "bg-muted/50",
                              day.isToday && "ring-2 ring-primary"
                            )}
                          >
                            <span className={cn(
                              "font-medium",
                              day.isToday && !day.achieved && "text-primary"
                            )}>
                              {day.dayOfMonth}
                            </span>
                            {day.achieved && (
                              <Check className="h-3 w-3 absolute bottom-0.5" />
                            )}
                            {day.partial && (
                              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3/4 h-0.5 rounded-full bg-primary/50" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                          {!day.isFuture && (
                            <>
                              <p className="text-muted-foreground">{day.minutes}m watched ({day.percentage}%)</p>
                              {day.achieved && <p className="text-primary">✓ Goal achieved</p>}
                            </>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                ))}
              </div>
            </TooltipProvider>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-xs text-muted-foreground">Achieved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary/20" />
                <span className="text-xs text-muted-foreground">Partial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <span className="text-xs text-muted-foreground">Missed</span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
