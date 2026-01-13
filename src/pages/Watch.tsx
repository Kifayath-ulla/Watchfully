import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Video, Playlist } from '@/types/video';
import { YouTubePlayer, useYouTubePlayer } from '@/components/YouTubePlayer';
import { useWatchSession } from '@/hooks/useWatchSession';
import { useProfile } from '@/hooks/useProfile';
import { useVideos } from '@/hooks/useVideos';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDuration, calculateProgress } from '@/lib/youtube';
import { useToast } from '@/hooks/use-toast';
import { ExitFrictionModal } from '@/components/ExitFrictionModal';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TimeCommitmentCard } from '@/components/TimeCommitmentCard';
import { PlaylistSidebar } from '@/components/PlaylistSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

export default function Watch() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { profile, toggleExitFriction } = useProfile();
  const { videos: allVideos, markComplete, deleteVideo } = useVideos();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [committedMinutes, setCommittedMinutes] = useState<number | null>(null);
  const [showCommitment, setShowCommitment] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const { setPlayer, play, pause, seekRelative, setPlaybackRate, playbackRate } = useYouTubePlayer();
  const { startSession, endSession, updateProgress, isSessionActive } = useWatchSession();
  
  const lastSaveRef = useRef<number>(0);
  const saveIntervalRef = useRef<number>(5);
  const sessionStartTimeRef = useRef<number>(0);

  // Fetch video and playlist data
  useEffect(() => {
    async function fetchVideoData() {
      if (!user || !videoId) return;

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (videoError || !videoData) {
        toast({ title: 'Video not found', variant: 'destructive' });
        navigate('/');
        return;
      }

      setVideo(videoData as Video);
      setCurrentTime(videoData.current_position_seconds || 0);
      setDuration(videoData.duration_seconds || 0);

      // If video is part of a playlist, fetch playlist and related videos
      if (videoData.playlist_id) {
        const [playlistResult, videosResult] = await Promise.all([
          supabase
            .from('playlists')
            .select('*')
            .eq('id', videoData.playlist_id)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('videos')
            .select('*')
            .eq('playlist_id', videoData.playlist_id)
            .eq('user_id', user.id)
            .order('playlist_order', { ascending: true })
        ]);

        if (playlistResult.data) {
          setPlaylist(playlistResult.data as Playlist);
        }
        if (videosResult.data) {
          setPlaylistVideos(videosResult.data as Video[]);
        }
      } else {
        // Show all non-playlist videos as the queue
        const standaloneVideos = allVideos.filter(v => !v.playlist_id);
        setPlaylistVideos(standaloneVideos);
      }

      setLoading(false);
    }

    if (!authLoading && user) {
      fetchVideoData();
    }
  }, [user, videoId, authLoading, navigate, toast, allVideos]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          isPlaying ? pause() : play();
          break;
        case 'arrowleft':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'arrowup':
          e.preventDefault();
          setPlaybackRate(Math.min(playbackRate + 0.25, 2));
          break;
        case 'arrowdown':
          e.preventDefault();
          setPlaybackRate(Math.max(playbackRate - 0.25, 0.5));
          break;
        case 'n':
          if (hasNext) navigateToNextVideo();
          break;
        case 'p':
          if (hasPrevious) navigateToPreviousVideo();
          break;
        case 'm':
          handleMarkCurrentComplete();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, play, pause, seekRelative, playbackRate, setPlaybackRate]);

  const currentIndex = playlistVideos.findIndex(v => v.id === video?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < playlistVideos.length - 1;

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

    // Auto-play next video if in playlist
    if (playlistVideos.length > 1) {
      const currentIndex = playlistVideos.findIndex(v => v.id === video.id);
      const nextVideo = playlistVideos[currentIndex + 1];
      if (nextVideo && nextVideo.status !== 'completed') {
        navigate(`/watch/${nextVideo.id}`);
      }
    }
  }, [video, duration, updateProgress, endSession, isSessionActive, toast, playlistVideos, navigate]);

  // Start watching with commitment
  const handleStartWatching = async (minutes: number) => {
    if (!video) return;
    
    setCommittedMinutes(minutes);
    setShowCommitment(false);
    sessionStartTimeRef.current = currentTime;

    await startSession.mutateAsync({
      videoId: video.id,
      committedMinutes: minutes,
      startPositionSeconds: video.current_position_seconds || 0
    });
  };

  // Calculate watched minutes in current session
  const getWatchedMinutes = () => {
    if (!committedMinutes) return 0;
    const watchedSeconds = currentTime - sessionStartTimeRef.current;
    return Math.max(0, Math.floor(watchedSeconds / 60));
  };

  // Handle back/exit button click
  const handleExitClick = () => {
    if (profile?.exit_friction_enabled && isSessionActive && committedMinutes) {
      const watchedMinutes = getWatchedMinutes();
      if (watchedMinutes < committedMinutes) {
        pause();
        setShowExitModal(true);
        return;
      }
    }
    handleExit();
  };

  // Handle confirmed exit
  const handleExit = async () => {
    if (video && isSessionActive) {
      await endSession.mutateAsync({
        endPositionSeconds: Math.floor(currentTime),
        wasCompleted: false,
        exitReason: 'user_exit'
      });
    } else if (video) {
      await updateProgress(video.id, currentTime);
    }
    navigate('/');
  };

  // Handle log and skip
  const handleLogSkip = async (reason?: string) => {
    if (!video || !user) return;

    await supabase.from('skipped_sessions').insert({
      user_id: user.id,
      video_id: video.id,
      planned_minutes: committedMinutes,
      completed_minutes: getWatchedMinutes(),
      reason
    });

    await handleExit();
  };

  // Continue watching after friction modal
  const handleContinue = () => {
    setShowExitModal(false);
    play();
  };

  // Disable exit friction
  const handleDisableExitFriction = () => {
    toggleExitFriction();
    toast({ title: 'Exit friction disabled', description: 'You can re-enable it in settings.' });
  };

  // Mark video as complete from sidebar
  const handleMarkComplete = (id: string) => {
    markComplete.mutate(id);
  };

  // Delete video from sidebar
  const handleDeleteVideo = (id: string) => {
    if (id === videoId) {
      // If deleting current video, navigate away
      const otherVideos = playlistVideos.filter(v => v.id !== id);
      if (otherVideos.length > 0) {
        navigate(`/watch/${otherVideos[0].id}`);
      } else {
        navigate('/');
      }
    }
    deleteVideo.mutate(id);
  };

  // Mark current as complete manually
  const handleMarkCurrentComplete = async () => {
    if (!video) return;
    
    await updateProgress(video.id, duration, 'completed');
    
    if (isSessionActive) {
      await endSession.mutateAsync({
        endPositionSeconds: Math.floor(currentTime),
        wasCompleted: true
      });
    }

    toast({ title: 'Marked as complete!' });
    
    // Auto-navigate to next if available
    const currentIndex = playlistVideos.findIndex(v => v.id === video.id);
    const nextVideo = playlistVideos[currentIndex + 1];
    if (nextVideo) {
      navigate(`/watch/${nextVideo.id}`);
    } else {
      navigate('/');
    }
  };

  // Playback controls
  const handleSkipBack = (seconds: number) => seekRelative(-seconds);
  const handleSkipForward = (seconds: number) => seekRelative(seconds);

  // Navigation between playlist videos
  const navigateToPreviousVideo = () => {
    const currentIndex = playlistVideos.findIndex(v => v.id === video?.id);
    if (currentIndex > 0) {
      navigate(`/watch/${playlistVideos[currentIndex - 1].id}`);
    }
  };

  const navigateToNextVideo = () => {
    const currentIndex = playlistVideos.findIndex(v => v.id === video?.id);
    if (currentIndex < playlistVideos.length - 1) {
      navigate(`/watch/${playlistVideos[currentIndex + 1].id}`);
    }
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExitClick}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {committedMinutes && (
              <Badge variant="secondary" className="gap-1 hidden sm:flex">
                <Clock className="h-3 w-3" />
                {committedMinutes}m committed
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleMarkCurrentComplete}>
              <Check className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Mark complete</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div 
          className={cn(
            "w-80 flex-shrink-0 transition-all duration-300 overflow-hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full w-0 lg:w-0"
          )}
        >
          <PlaylistSidebar
            currentVideoId={videoId || ''}
            videos={playlistVideos}
            playlist={playlist}
            onMarkComplete={handleMarkComplete}
            onDeleteVideo={handleDeleteVideo}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-4">
            {/* Commitment Selection */}
            {showCommitment && (
              <TimeCommitmentCard
                remainingSeconds={remainingSeconds}
                onStartWatching={handleStartWatching}
                onSkip={() => setShowCommitment(false)}
              />
            )}

            {/* Video Player */}
            <div>
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

            {/* Video Info - Title, Channel, Controls, Progress */}
            <div className="space-y-3">
              {/* Title and Nav */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg lg:text-xl font-medium text-foreground mb-1 line-clamp-2">
                    {video.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {video.channel_name}
                  </p>
                </div>
                
                {/* Prev/Next buttons */}
                {playlistVideos.length > 1 && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={navigateToPreviousVideo}
                      disabled={!hasPrevious}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      {currentIndex + 1}/{playlistVideos.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={navigateToNextVideo}
                      disabled={!hasNext}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Playback Controls - Compact inline */}
              <PlaybackControls
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                onPlay={play}
                onPause={pause}
                onSkipBack={handleSkipBack}
                onSkipForward={handleSkipForward}
                onPlaybackRateChange={setPlaybackRate}
              />

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}</span>
                  <span className="font-medium text-foreground">{progress}% complete</span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={isPlaying ? 'default' : 'secondary'} className="text-xs">
                  {isPlaying ? 'Playing' : 'Paused'}
                </Badge>
                {video.intent && (
                  <Badge variant="outline" className="text-xs">
                    {video.intent === 'custom' ? video.custom_intent : video.intent}
                  </Badge>
                )}
                {committedMinutes && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {getWatchedMinutes()}/{committedMinutes}m
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Friction Modal */}
      <ExitFrictionModal
        open={showExitModal}
        onOpenChange={setShowExitModal}
        onContinue={handleContinue}
        onLogSkip={handleLogSkip}
        onExit={handleExit}
        committedMinutes={committedMinutes || undefined}
        watchedMinutes={getWatchedMinutes()}
        onDisableExitFriction={handleDisableExitFriction}
      />
    </div>
  );
}
