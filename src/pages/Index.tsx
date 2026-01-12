import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/hooks/useVideos";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Play, Plus, LogOut, Settings } from "lucide-react";
import { AddVideoModal } from "@/components/AddVideoModal";
import { Video } from "@/types/video";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BookmarkletHelper } from "@/components/BookmarkletHelper";
import { SortableVideoCard } from "@/components/SortableVideoCard";
import { GoalNotifications } from "@/components/GoalNotifications";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function Index() {
  const { user, loading, signOut } = useAuth();
  const { videos, isLoading: videosLoading, deleteVideo, reorderVideos } = useVideos();
  const { profile, toggleSilentMode, toggleExitFriction } = useProfile();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
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
    if (intent === "custom" && customIntent) return customIntent;
    const labels: Record<string, string> = {
      learning: "Learning",
      career: "Career",
      curiosity: "Curiosity",
      leisure: "Leisure",
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
    const nextVideo = videos?.find((v) => v.status !== "completed");
    if (nextVideo) {
      navigate(`/watch/${nextVideo.id}`);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = videos.findIndex((v) => v.id === active.id);
      const newIndex = videos.findIndex((v) => v.id === over.id);
      const reordered = arrayMove(videos, oldIndex, newIndex);
      reorderVideos(reordered);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Goal Notifications */}
      <GoalNotifications />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-medium text-foreground">Watchfully</h1>
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
                  <SheetDescription>Customize your watching experience</SheetDescription>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="silent-mode">Silent Mode</Label>
                      <p className="text-xs text-muted-foreground">Disable all nudges and reminders</p>
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
                      <p className="text-xs text-muted-foreground">Ask for confirmation before leaving</p>
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
              Add a Video/Playlist
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
            <div className="text-center py-16 text-muted-foreground">Loading your videos...</div>
          ) : hasVideos ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">Your Queue</h3>
                <p className="text-sm text-muted-foreground">Drag to reorder</p>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={videos.map(v => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid gap-4">
                    {videos.map((video) => (
                      <SortableVideoCard
                        key={video.id}
                        video={video}
                        onDelete={handleDelete}
                        onClick={handleVideoClick}
                        getIntentLabel={getIntentLabel}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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

      {/* Bookmarklet Helper */}
      <section className="py-8 pb-16">
        <div className="container mx-auto px-4 max-w-md">
          <BookmarkletHelper />
        </div>
      </section>

      <AddVideoModal open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  );
}
