import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, Target, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NOTIFICATION_DISMISSED_KEY = 'watchfully-notification-dismissed';

export function GoalNotifications() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(false);

  // Check if permanently dismissed on mount
  useEffect(() => {
    if (user) {
      const dismissedUntil = sessionStorage.getItem(`${NOTIFICATION_DISMISSED_KEY}-${user.id}`);
      if (dismissedUntil === 'session') {
        setDismissed(true);
      }
      const permanent = localStorage.getItem(`${NOTIFICATION_DISMISSED_KEY}-permanent-${user.id}`);
      if (permanent === 'true') {
        setPermanentlyDismissed(true);
      }
    }
  }, [user]);

  const checkGoalProgress = useCallback(async () => {
    if (!user || profile?.silent_mode || !profile?.browser_notifications_enabled) return;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    // Get today's watch time
    const { data: sessions } = await supabase
      .from('watch_sessions')
      .select('actual_minutes')
      .eq('user_id', user.id)
      .gte('started_at', todayStart)
      .lt('started_at', todayEnd);

    const watchedMinutes = sessions?.reduce((sum, s) => sum + (s.actual_minutes || 0), 0) || 0;
    const goalMinutes = profile?.daily_goal_minutes || 45;
    const progressPercent = Math.round((watchedMinutes / goalMinutes) * 100);

    // Calculate expected progress based on time of day
    const hoursPassedToday = now.getHours() + now.getMinutes() / 60;
    const expectedProgressPercent = Math.min(100, Math.round((hoursPassedToday / 16) * 100)); // Assuming 16 waking hours

    // Only notify if significantly behind (more than 20% behind expected)
    if (progressPercent < expectedProgressPercent - 20 && progressPercent < 100) {
      const remainingMinutes = goalMinutes - watchedMinutes;
      
      // Show toast notification
      toast({
        title: "You're behind on your daily goal",
        description: `${remainingMinutes} minutes left to reach your ${goalMinutes}-minute goal today.`,
        action: (
          <Button variant="outline" size="sm" className="gap-1">
            <Target className="h-3 w-3" />
            Start session
          </Button>
        ),
      });

      // Also show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification('Watchfully: Goal Reminder', {
          body: `You're ${progressPercent}% toward your ${goalMinutes}-minute goal. ${remainingMinutes} minutes to go!`,
          icon: '/favicon.png',
          tag: 'goal-reminder',
        });
      }
    }
  }, [user, profile, toast]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifications not supported',
        description: 'Your browser does not support notifications.',
        variant: 'destructive',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateProfile.mutate({ browser_notifications_enabled: true });
      toast({
        title: 'Notifications enabled',
        description: "We'll remind you when you're behind on your goals.",
      });
    } else {
      toast({
        title: 'Notifications blocked',
        description: 'Please enable notifications in your browser settings.',
        variant: 'destructive',
      });
    }
  };

  const handleDismiss = () => {
    if (user) {
      sessionStorage.setItem(`${NOTIFICATION_DISMISSED_KEY}-${user.id}`, 'session');
    }
    setDismissed(true);
  };

  const handleDontShowAgain = () => {
    if (user) {
      localStorage.setItem(`${NOTIFICATION_DISMISSED_KEY}-permanent-${user.id}`, 'true');
    }
    setPermanentlyDismissed(true);
    setDismissed(true);
  };

  // Check goal progress periodically (every 30 minutes)
  useEffect(() => {
    if (!user || profile?.silent_mode) return;

    // Check immediately on mount
    checkGoalProgress();

    // Set up interval to check every 30 minutes
    const interval = setInterval(checkGoalProgress, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, profile?.silent_mode, checkGoalProgress]);

  // Show notification permission prompt if not yet granted and not dismissed
  if (
    profile && 
    !profile.browser_notifications_enabled && 
    !profile.silent_mode && 
    'Notification' in window && 
    Notification.permission === 'default' &&
    !dismissed &&
    !permanentlyDismissed
  ) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm relative">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">Stay on track</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Get reminded when you're falling behind on your daily watching goals.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button size="sm" onClick={requestNotificationPermission}>
                    Enable notifications
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleDismiss}
                  >
                    Not now
                  </Button>
                </div>
                <button
                  onClick={handleDontShowAgain}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  Don't show this again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
