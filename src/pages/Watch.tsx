import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Video } from '@/types/video';
import { YouTubePlayer, useYouTubePlayer } from '@/components/YouTubePlayer';
import { useWatchSession } from '@/hooks/useWatchSession';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Pause, Check, Clock } from 'lucide-react';
import { formatDuration, calculateProgress } from '@/lib/youtube';
import { useToast } from '@/hooks/use-toast';

export default function Watch() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [committedMinutes, setCommittedMinutes] = useState<number | null>(null);
  const [showCommitment, setShowCommitment] = useState(true);
  
  const { setPlayer, pause } = useYouTubePlayer();
  const { startSession, endSession, updateProgress, isSessionActive } = useWatchSession();
  
  const lastSaveRef = useRef<number>(0);
  const saveIntervalRef = useRef<number>(5); // Save every 5 seconds of playback

  // Fetch video data
  useEffect(() => {
    async function fetchVideo() {
      if (!user || !videoId) return;

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        toast({ title: 'Error loading video', variant: 'destructive' });
        navigate('/');
        return;
      }

      if (!data) {
        toast({ title: 'Video not found', variant: 'destructive' });
        navigate('/');
        return;
      }

      setVideo(data as Video);
      setCurrentTime(data.current_position_seconds || 0);
      setDuration(data.duration_seconds || 0);
      setLoading(false);
    }

    if (!authLoading && user) {
      fetchVideo();
    }
  }, [user, videoId, authLoading, navigate, toast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Handle time updates from player
  const handleTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    if (dur > 0) setDuration(dur);

    // Save progress periodically
    if (video && time - lastSaveRef.current >= saveIntervalRef.current) {
      lastSaveRef.current = time;
      updateProgress(video.id, time, time > 0 ? 'in_progress' : undefined);
    }
  }, [video, updateProgress]);

  // Handle player state changes
  const handleStateChange = useCallback((state: YT.PlayerState) => {
    setIsPlaying(state === window.YT?.PlayerState?.PLAYING);
  }, []);

  // Handle video end
  const handleVideoEnd = useCallback(async () => {
    if (!video) return;
    
    await updateProgress(video.id, duration, 'completed');
    
    if (isSessionActive) {
      await endSession.mutateAsync({
        endPositionSeconds: duration,
        wasCompleted: true
      });
    }

    toast({ title: 'Video completed!', description: 'Great job finishing this video.' });
  }, [video, duration, updateProgress, endSession, isSessionActive, toast]);

  // Start watching with commitment
  const handleStartWatching = async (minutes: number) => {
    if (!video) return;
    
    setCommittedMinutes(minutes);
    setShowCommitment(false);

    await startSession.mutateAsync({
      videoId: video.id,
      committedMinutes: minutes,
      startPositionSeconds: video.current_position_seconds || 0
    });
  };

  // Handle back/exit
  const handleExit = async () => {
    if (video && isSessionActive) {
      await endSession.mutateAsync({
        endPositionSeconds: Math.floor(currentTime),
        wasCompleted: false,
        exitReason: 'user_exit'
      });
    } else if (video) {
      // Save final position even without session
      await updateProgress(video.id, currentTime);
    }
    navigate('/');
  };

  // Mark as complete manually
  const handleMarkComplete = async () => {
    if (!video) return;
    
    await updateProgress(video.id, duration, 'completed');
    
    if (isSessionActive) {
      await endSession.mutateAsync({
        endPositionSeconds: Math.floor(currentTime),
        wasCompleted: true
      });
    }

    toast({ title: 'Marked as complete!' });
    navigate('/');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading video...</div>
      </div>
    );
  }

  if (!video) return null;

  const progress = calculateProgress(currentTime, duration);
  const remainingSeconds = Math.max(0, duration - currentTime);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to queue
          </Button>
          <div className="flex items-center gap-2">
            {committedMinutes && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {committedMinutes}m committed
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleMarkComplete}>
              <Check className="h-4 w-4 mr-2" />
              Mark complete
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Commitment Selection */}
        {showCommitment && (
          <div className="mb-6 p-6 rounded-lg border border-border bg-card">
            <h3 className="text-lg font-medium text-foreground mb-2">
              How much time do you have?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set a time commitment to watch intentionally.
            </p>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 30, 45, 60].map((mins) => {
                const canComplete = (mins * 60) >= remainingSeconds;
                return (
                  <Button
                    key={mins}
                    variant={canComplete ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStartWatching(mins)}
                  >
                    {mins}m
                    {canComplete && (
                      <span className="ml-1 text-xs opacity-75">(can finish)</span>
                    )}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCommitment(false)}
              >
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Video Player */}
        <div className="mb-6">
          <YouTubePlayer
            videoId={video.youtube_video_id}
            startSeconds={video.current_position_seconds || 0}
            onReady={setPlayer}
            onStateChange={handleStateChange}
            onTimeUpdate={handleTimeUpdate}
            onEnd={handleVideoEnd}
            autoplay={!showCommitment}
          />
        </div>

        {/* Video Info & Progress */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-medium text-foreground mb-1">
              {video.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {video.channel_name}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}
              </span>
              <span className="text-foreground font-medium">
                {progress}% complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={isPlaying ? 'default' : 'secondary'}>
              {isPlaying ? (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Playing
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Paused
                </>
              )}
            </Badge>
            {video.intent && (
              <Badge variant="outline">
                {video.intent === 'custom' ? video.custom_intent : video.intent}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
