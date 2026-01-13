import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/hooks/useVideos";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Play, Plus, LogOut, Settings, CheckSquare } from "lucide-react";
import { AddVideoModal } from "@/components/AddVideoModal";
import { Video, VideoStatus, VideoIntent } from "@/types/video";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SortableVideoCard } from "@/components/SortableVideoCard";
import { PlaylistGroup } from "@/components/PlaylistGroup";
import { GoalNotifications } from "@/components/GoalNotifications";
import { QueueFilters } from "@/components/QueueFilters";
import { BulkActionBar } from "@/components/BulkActionBar";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { videos, isLoading: videosLoading, deleteVideo, reorderVideos, bulkMarkComplete, bulkDelete, bulkUpdateIntent, undoBulkComplete, undoBulkDelete, undoBulkIntent } = useVideos();
  const { playlists, deletePlaylist } = usePlaylists();
  const { toast } = useToast();
  const { profile, toggleSilentMode, toggleExitFriction } = useProfile();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'all'>('all');
  const [intentFilter, setIntentFilter] = useState<VideoIntent | 'all'>('all');
  const [videoFilter, setVideoFilter] = useState<string | 'all'>('all');
  
  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  
  // Playlist deletion confirmation
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

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

  // Helper to get playlist status from its videos
  const getPlaylistStatus = (playlistVids: Video[]): VideoStatus => {
    if (playlistVids.every(v => v.status === 'completed')) return 'completed';
    if (playlistVids.some(v => v.status === 'in_progress' || v.status === 'completed')) return 'in_progress';
    return 'not_started';
  };

  // Group videos by playlist
  const { playlistVideos, standaloneVideos, filteredPlaylists, filteredStandaloneVideos } = useMemo(() => {
    const playlistMap = new Map<string, Video[]>();
    const standalone: Video[] = [];

    videos.forEach(video => {
      if (video.playlist_id) {
        const existing = playlistMap.get(video.playlist_id) || [];
        existing.push(video);
        playlistMap.set(video.playlist_id, existing);
      } else {
        standalone.push(video);
      }
    });

    // Apply video filter first
    let filteredStandalone = standalone;
    let filteredPlaylistList = playlists;
    
    if (videoFilter !== 'all') {
      if (videoFilter === 'playlists-only') {
        filteredStandalone = [];
      } else if (videoFilter === 'standalone-only') {
        filteredPlaylistList = [];
      } else if (videoFilter.startsWith('playlist:')) {
        const playlistId = videoFilter.replace('playlist:', '');
        filteredPlaylistList = playlists.filter(p => p.id === playlistId);
        filteredStandalone = [];
      } else if (videoFilter.startsWith('video:')) {
        const videoId = videoFilter.replace('video:', '');
        filteredStandalone = standalone.filter(v => v.id === videoId);
        filteredPlaylistList = [];
      }
    }

    // Apply status and intent filters
    filteredStandalone = filteredStandalone.filter(video => {
      const statusMatch = statusFilter === 'all' || video.status === statusFilter;
      const intentMatch = intentFilter === 'all' || video.intent === intentFilter;
      return statusMatch && intentMatch;
    });

    // Filter playlists by their derived status and stored intent
    const filteredPlaylistIds = filteredPlaylistList.filter(playlist => {
      const playlistVids = playlistMap.get(playlist.id) || [];
      if (playlistVids.length === 0) return false;
      
      const playlistStatus = getPlaylistStatus(playlistVids);
      const statusMatch = statusFilter === 'all' || playlistStatus === statusFilter;
      const intentMatch = intentFilter === 'all' || playlist.intent === intentFilter;
      return statusMatch && intentMatch;
    }).map(p => p.id);

    return {
      playlistVideos: playlistMap,
      standaloneVideos: standalone,
      filteredPlaylists: playlists.filter(p => filteredPlaylistIds.includes(p.id)),
      filteredStandaloneVideos: filteredStandalone,
    };
  }, [videos, playlists, statusFilter, intentFilter, videoFilter]);

  // Selection handlers
  const toggleSelection = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedVideoIds(new Set());
    setSelectionMode(false);
  };

  const selectAll = () => {
    const allIds = new Set(videos.map(v => v.id));
    setSelectedVideoIds(allIds);
  };

  const handleBulkComplete = async () => {
    if (selectedVideoIds.size === 0) return;
    const previousStates = await bulkMarkComplete.mutateAsync(Array.from(selectedVideoIds));
    clearSelection();
    toast({
      title: `${selectedVideoIds.size} videos marked complete`,
      action: previousStates ? (
        <Button variant="outline" size="sm" onClick={() => undoBulkComplete.mutate(previousStates)}>
          Undo
        </Button>
      ) : undefined,
    });
  };

  const handleBulkDelete = async () => {
    if (selectedVideoIds.size === 0) return;
    const count = selectedVideoIds.size;
    const deletedVideos = await bulkDelete.mutateAsync(Array.from(selectedVideoIds));
    clearSelection();
    toast({
      title: `${count} videos deleted`,
      action: deletedVideos ? (
        <Button variant="outline" size="sm" onClick={() => undoBulkDelete.mutate(deletedVideos)}>
          Undo
        </Button>
      ) : undefined,
    });
  };

  const handleBulkIntent = async (intent: VideoIntent, customIntent?: string) => {
    if (selectedVideoIds.size === 0) return;
    const previousStates = await bulkUpdateIntent.mutateAsync({ 
      videoIds: Array.from(selectedVideoIds), 
      intent,
      customIntent 
    });
    clearSelection();
    toast({
      title: `Intent updated for ${selectedVideoIds.size} videos`,
      action: previousStates ? (
        <Button variant="outline" size="sm" onClick={() => undoBulkIntent.mutate(previousStates)}>
          Undo
        </Button>
      ) : undefined,
    });
  };

  // Playlist deletion
  const handlePlaylistDelete = (playlistId: string) => {
    setPlaylistToDelete(playlistId);
  };

  const confirmPlaylistDelete = async () => {
    if (playlistToDelete) {
      await deletePlaylist.mutateAsync(playlistToDelete);
      setPlaylistToDelete(null);
    }
  };

  const playlistToDeleteData = playlists.find(p => p.id === playlistToDelete);
  const playlistVideoCount = playlistToDelete ? (playlistVideos.get(playlistToDelete)?.length || 0) : 0;

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

  const clearFilters = () => {
    setStatusFilter('all');
    setIntentFilter('all');
    setVideoFilter('all');
  };

  const hasActiveFilters = statusFilter !== 'all' || intentFilter !== 'all' || videoFilter !== 'all';
  const displayedCount = filteredStandaloneVideos.length + filteredPlaylists.reduce((acc, p) => acc + (playlistVideos.get(p.id)?.length || 0), 0);
  const totalCount = videos.length;

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
              {/* Queue Header with Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium text-foreground">Your Queue</h3>
                  {hasActiveFilters && (
                    <span className="text-sm text-muted-foreground">
                      Showing {displayedCount} of {totalCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <QueueFilters
                    statusFilter={statusFilter}
                    intentFilter={intentFilter}
                    videoFilter={videoFilter}
                    onStatusChange={setStatusFilter}
                    onIntentChange={setIntentFilter}
                    onVideoFilterChange={setVideoFilter}
                    onClear={clearFilters}
                    videos={videos}
                    playlists={playlists}
                  />
                  <Button
                    variant={selectionMode ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectionMode(!selectionMode);
                      if (selectionMode) clearSelection();
                    }}
                    className="h-8"
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Select
                  </Button>
                </div>
              </div>

              {/* Bulk Action Bar */}
              {selectedVideoIds.size > 0 && (
                <BulkActionBar
                  selectedCount={selectedVideoIds.size}
                  totalCount={videos.length}
                  onClear={clearSelection}
                  onSelectAll={selectAll}
                  onMarkComplete={handleBulkComplete}
                  onDelete={handleBulkDelete}
                  onChangeIntent={handleBulkIntent}
                  isLoading={bulkMarkComplete.isPending || bulkDelete.isPending || bulkUpdateIntent.isPending}
                />
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="grid gap-4">
                  {/* Render playlists as grouped items */}
                  {filteredPlaylists.map((playlist) => {
                    const playlistVideoList = playlistVideos.get(playlist.id);
                    if (!playlistVideoList || playlistVideoList.length === 0) return null;
                    
                    return (
                      <PlaylistGroup
                        key={playlist.id}
                        playlist={playlist}
                        videos={playlistVideoList}
                        onVideoClick={handleVideoClick}
                        onVideoDelete={handleDelete}
                        onPlaylistDelete={handlePlaylistDelete}
                        getIntentLabel={getIntentLabel}
                        selectionMode={selectionMode}
                        selectedVideoIds={selectedVideoIds}
                        onToggleSelect={toggleSelection}
                      />
                    );
                  })}

                  {/* Render standalone videos */}
                  {filteredStandaloneVideos.length > 0 && (
                    <SortableContext
                      items={filteredStandaloneVideos.map(v => v.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredStandaloneVideos.map((video) => (
                        <SortableVideoCard
                          key={video.id}
                          video={video}
                          onDelete={handleDelete}
                          onClick={handleVideoClick}
                          getIntentLabel={getIntentLabel}
                          selectionMode={selectionMode}
                          isSelected={selectedVideoIds.has(video.id)}
                          onToggleSelect={toggleSelection}
                        />
                      ))}
                    </SortableContext>
                  )}

                  {/* No results after filtering */}
                  {filteredPlaylists.length === 0 && filteredStandaloneVideos.length === 0 && hasActiveFilters && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No videos match your filters.</p>
                      <Button variant="link" onClick={clearFilters}>Clear filters</Button>
                    </div>
                  )}
                </div>
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

      <AddVideoModal open={showAddModal} onOpenChange={setShowAddModal} />

      {/* Playlist Delete Confirmation */}
      <AlertDialog open={!!playlistToDelete} onOpenChange={() => setPlaylistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{playlistToDeleteData?.title}" and all {playlistVideoCount} videos in it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPlaylistDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
