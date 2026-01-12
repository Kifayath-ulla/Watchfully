import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVideos } from '@/hooks/useVideos';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Play, Plus, LogOut, Trash2, PlayCircle, Settings } from 'lucide-react';
import { AddVideoModal } from '@/components/AddVideoModal';
import { formatDuration, calculateProgress } from '@/lib/youtube';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video } from '@/types/video';
import { ProgressDashboard } from '@/components/ProgressDashboard';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function Index() {
  const { user, loading, signOut } = useAuth();
  const { videos, isLoading: videosLoading, deleteVideo } = useVideos();
  const { profile, toggleSilentMode, toggleExitFriction } = useProfile();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const hasVideos = videos && videos.length > 0;

  const getIntentLabel = (intent: string, customIntent?: string | null) => {
    if (intent === 'custom' && customIntent) return customIntent;
    const labels: Record<string, string> = {
      learning: 'Learning',
      career: 'Career',
      curiosity: 'Curiosity',
      leisure: 'Leisure'
    };
    return labels[intent] || intent;
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteVideo.mutateAsync(id);
  };

  const handleVideoClick = (video: Video) => {
    navigate(`/watch/${video.id}`);
  };

  const handleStartSession = () => {
    const nextVideo = videos?.find(v => v.status !== 'completed');
    if (nextVideo) {
      navigate(`/watch/${nextVideo.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-medium text-foreground">
            Watchfully
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {/* Settings Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>
                    Customize your watching experience
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="silent-mode">Silent Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Disable all nudges and reminders
                      </p>
                    </div>
                    <Switch
                      id="silent-mode"
                      checked={profile?.silent_mode ?? false}
                      onCheckedChange={toggleSilentMode}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="exit-friction">Exit Friction</Label>
                      <p className="text-xs text-muted-foreground">
                        Ask for confirmation before leaving
                      </p>
                    </div>
                    <Switch
                      id="exit-friction"
                      checked={profile?.exit_friction_enabled ?? true}
                      onCheckedChange={toggleExitFriction}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-serif text-4xl md:text-5xl font-medium text-foreground tracking-tight mb-4">
            Watch with intention.
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Track your progress, set a time commitment, honor your intention.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2" disabled={!hasVideos} onClick={handleStartSession}>
              <Play className="h-4 w-4" />
              Start a focused session
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Add a video
            </Button>
          </div>
        </div>
      </section>

      {/* Progress Dashboard */}
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <h3 className="text-lg font-medium text-foreground mb-4">Your Progress</h3>
          <ProgressDashboard dailyGoalMinutes={profile?.daily_goal_minutes || 45} />
        </div>
      </section>

      {/* Video Queue or Empty State */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {videosLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              Loading your videos...
            </div>
          ) : hasVideos ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground mb-4">Your Queue</h3>
              <div className="grid gap-4">
                {videos.map((video) => {
                  const progress = calculateProgress(
                    video.current_position_seconds || 0,
                    video.duration_seconds
                  );
                  
                  return (
                    <Card 
                      key={video.id} 
                      className="overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-lg"
                      onClick={() => handleVideoClick(video)}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row">
                          {/* Thumbnail */}
                          <div className="relative sm:w-48 flex-shrink-0 group">
                            <img
                              src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`}
                              alt={video.title}
                              className="w-full h-32 sm:h-full object-cover"
                            />
                            {/* Play overlay */}
                            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <PlayCircle className="h-12 w-12 text-primary" />
                            </div>
                            <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-medium">
                              {formatDuration(video.duration_seconds)}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground line-clamp-2 mb-1">
                                  {video.title}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {video.channel_name}
                                </p>
                                <div className="flex items-center gap-2 mb-3">
                                  <Badge variant="secondary" className="text-xs">
                                    {getIntentLabel(video.intent || 'curiosity', video.custom_intent)}
                                  </Badge>
                                  <Badge 
                                    variant={video.status === 'completed' ? 'default' : 'outline'} 
                                    className="text-xs"
                                  >
                                    {video.status === 'not_started' 
                                      ? 'Not started' 
                                      : video.status === 'in_progress' 
                                        ? 'In progress' 
                                        : 'Completed'}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <Progress value={progress} className="h-1.5" />
                                  <p className="text-xs text-muted-foreground">
                                    {progress}% complete
                                  </p>
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleDelete(e, video.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 px-6 rounded-lg border border-dashed border-border bg-card/30">
              <p className="text-muted-foreground mb-4">
                Your queue is empty. Add a YouTube video or playlist to get started.
              </p>
              <Button variant="secondary" className="gap-2" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4" />
                Add your first video
              </Button>
            </div>
          )}
        </div>
      </section>

      <AddVideoModal open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  );
}
