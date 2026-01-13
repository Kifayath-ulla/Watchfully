import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, PlayCircle, Trash2, ListVideo } from 'lucide-react';
import { Video, Playlist } from '@/types/video';
import { formatDuration } from '@/lib/youtube';
import { SortableVideoCard } from './SortableVideoCard';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface PlaylistGroupProps {
  playlist: Playlist;
  videos: Video[];
  onVideoClick: (video: Video) => void;
  onVideoDelete: (e: React.MouseEvent, id: string) => void;
  onPlaylistDelete?: (playlistId: string) => void;
  getIntentLabel: (intent: string, customIntent?: string | null) => string;
  selectionMode?: boolean;
  selectedVideoIds?: Set<string>;
  onToggleSelect?: (videoId: string) => void;
}

export function PlaylistGroup({
  playlist,
  videos,
  onVideoClick,
  onVideoDelete,
  onPlaylistDelete,
  getIntentLabel,
  selectionMode,
  selectedVideoIds,
  onToggleSelect,
}: PlaylistGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort videos by playlist_order (chronological order from playlist)
  const sortedVideos = [...videos].sort((a, b) => 
    (a.playlist_order ?? 0) - (b.playlist_order ?? 0)
  );

  const totalDuration = videos.reduce((sum, v) => sum + v.duration_seconds, 0);
  const watchedDuration = videos.reduce((sum, v) => sum + (v.current_position_seconds || 0), 0);
  const completedCount = videos.filter(v => v.status === 'completed').length;
  const progress = totalDuration > 0 ? Math.round((watchedDuration / totalDuration) * 100) : 0;

  const handlePlaylistClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleDeletePlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlaylistDelete?.(playlist.id);
  };

  return (
    <div className="space-y-2">
      {/* Playlist Header Card */}
      <Card
        className="overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-lg"
        onClick={handlePlaylistClick}
      >
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Thumbnail */}
            <div className="relative sm:w-48 flex-shrink-0 group">
              <img
                src={playlist.thumbnail_url || sortedVideos[0]?.thumbnail_url || '/placeholder.svg'}
                alt={playlist.title}
                className="w-full h-32 sm:h-full object-cover"
              />
              {/* Playlist overlay */}
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <div className="text-center">
                  <ListVideo className="h-8 w-8 text-primary mx-auto mb-1" />
                  <span className="text-xs font-medium text-foreground">{videos.length} videos</span>
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-medium">
                {formatDuration(totalDuration)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <h4 className="font-medium text-foreground line-clamp-2">{playlist.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 ml-6">
                    {completedCount} of {videos.length} videos completed
                  </p>
                  <div className="flex items-center gap-2 mb-3 ml-6">
                    <Badge variant="secondary" className="text-xs">
                      {getIntentLabel(playlist.intent || "curiosity", playlist.custom_intent)}
                    </Badge>
                    <Badge
                      variant={completedCount === videos.length ? "default" : "outline"}
                      className="text-xs"
                    >
                      {completedCount === videos.length
                        ? "Completed"
                        : completedCount > 0
                          ? "In progress"
                          : "Not started"}
                    </Badge>
                  </div>
                  <div className="space-y-1 ml-6">
                    <Progress value={progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{progress}% complete</p>
                  </div>
                </div>

                {onPlaylistDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={handleDeletePlaylist}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Videos List */}
      {isExpanded && (
        <div className="ml-4 pl-4 border-l-2 border-border/50 space-y-3">
          <SortableContext
            items={sortedVideos.map(v => v.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedVideos.map((video, index) => (
              <div key={video.id} className="relative">
                <div className="absolute -left-[1.35rem] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[8px] font-medium text-muted-foreground">{index + 1}</span>
                </div>
                <SortableVideoCard
                  video={video}
                  onDelete={onVideoDelete}
                  onClick={onVideoClick}
                  getIntentLabel={getIntentLabel}
                  selectionMode={selectionMode}
                  isSelected={selectedVideoIds?.has(video.id)}
                  onToggleSelect={onToggleSelect}
                />
              </div>
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}
