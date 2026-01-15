import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Target, Pencil, RotateCcw, Check } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

interface DailyGoalEditorProps {
  currentGoal: number;
  compact?: boolean;
}

export function DailyGoalEditor({ currentGoal, compact = false }: DailyGoalEditorProps) {
  const { updateProfile } = useProfile();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentGoal.toString());

  useEffect(() => {
    setValue(currentGoal.toString());
  }, [currentGoal]);

  const handleSave = () => {
    const numValue = parseInt(value) || 0;
    
    // Allow 0 (no limit) or any positive number up to 1440 (24 hours)
    if (numValue < 0) {
      toast({
        title: 'Invalid goal',
        description: 'Daily goal cannot be negative.',
        variant: 'destructive',
      });
      return;
    }

    if (numValue > 1440) {
      toast({
        title: 'Goal too high',
        description: 'Maximum is 1440 minutes (24 hours).',
        variant: 'destructive',
      });
      return;
    }

    updateProfile.mutate({ daily_goal_minutes: numValue });
    toast({
      title: numValue === 0 ? 'Daily goal disabled' : `Daily goal set to ${numValue} min`,
    });
    setOpen(false);
  };

  const handleReset = () => {
    setValue('45');
    updateProfile.mutate({ daily_goal_minutes: 45 });
    toast({ title: 'Daily goal reset to 45 min' });
    setOpen(false);
  };

  const handleClear = () => {
    setValue('0');
    updateProfile.mutate({ daily_goal_minutes: 0 });
    toast({ title: 'Daily goal disabled' });
    setOpen(false);
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
            <Target className="h-3 w-3" />
            {currentGoal > 0 ? `${currentGoal}m` : 'No limit'}
            <Pencil className="h-2.5 w-2.5 ml-0.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Daily goal (minutes)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-8"
                  placeholder="0 = no limit"
                />
                <Button size="sm" className="h-8 px-2" onClick={handleSave}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClear}>
                No limit
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleReset}>
                <RotateCcw className="h-3 w-3" />
                Reset to 45m
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Set to 0 to disable. Max: 1440 min (24h)
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="daily-goal-input">Daily Goal (minutes)</Label>
      <div className="flex items-center gap-2">
        <Input
          id="daily-goal-input"
          type="number"
          min={0}
          max={1440}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24"
        />
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
        <span className="text-sm text-muted-foreground">
          min/day (0 = no limit, max 24h)
        </span>
      </div>
      <div className="flex gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={handleClear}>
          Disable limit
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset to default (45m)
        </Button>
      </div>
    </div>
  );
}
