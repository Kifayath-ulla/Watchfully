import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LastWatchedVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  current_position_seconds: number;
  duration_seconds: number;
  channel_name: string | null;
}

export function ContinueWatchingReminder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lastVideo, setLastVideo] = useState<LastWatchedVideo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Check if already dismissed this session
    const sessionDismissed = sessionStorage.getItem('continue-watching-dismissed');
    if (sessionDismissed) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    const fetchLastWatched = async () => {
      // Find the most recent in-progress video
      const { data: video } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, current_position_seconds, duration_seconds, channel_name')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .gt('current_position_seconds', 30) // At least 30 seconds watched
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (video && video.current_position_seconds < video.duration_seconds - 60) {
        // Only show if not within last minute of video
        setLastVideo(video);
      }
      setLoading(false);
    };

    fetchLastWatched();
  }, [user]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('continue-watching-dismissed', 'true');
  };

  const handleContinue = () => {
    if (lastVideo) {
      navigate(`/watch/${lastVideo.id}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = lastVideo 
    ? Math.round((lastVideo.current_position_seconds / lastVideo.duration_seconds) * 100)
    : 0;

  if (loading || dismissed || !lastVideo) {
    return null;
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/20 overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Thumbnail with progress overlay */}
          <div className="relative flex-shrink-0 w-16 h-10 rounded overflow-hidden bg-muted">
            {lastVideo.thumbnail_url ? (
              <img 
                src={lastVideo.thumbnail_url} 
                alt={lastVideo.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
            {/* Progress bar on thumbnail */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted-foreground/30">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Continue watching</p>
            <p className="text-sm font-medium text-foreground truncate">
              {lastVideo.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTime(lastVideo.current_position_seconds)} / {formatTime(lastVideo.duration_seconds)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleContinue}
            >
              <Play className="h-3 w-3" />
              Resume
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
