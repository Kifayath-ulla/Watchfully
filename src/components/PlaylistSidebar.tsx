import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Playlist } from '@/types/video';
import { formatDuration, calculateProgress } from '@/lib/youtube';
import { ChevronRight, MoreVertical, Check, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface PlaylistSidebarProps {
  currentVideoId: string;
  videos: Video[];
  playlist: Playlist | null;
  onMarkComplete: (videoId: string) => void;
  onDeleteVideo: (videoId: string) => void;
}

export function PlaylistSidebar({
  currentVideoId,
  videos,
  playlist,
  onMarkComplete,
  onDeleteVideo
}: PlaylistSidebarProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  // Sort videos by playlist_order
  const sortedVideos = [...videos].sort((a, b) => 
    (a.playlist_order ?? 0) - (b.playlist_order ?? 0)
  );

  // Calculate totals
  const totalDuration = videos.reduce((sum, v) => sum + v.duration_seconds, 0);
  const completedCount = videos.filter(v => v.status === 'completed').length;

  const handleVideoClick = (videoId: string) => {
    if (videoId !== currentVideoId) {
      navigate(`/watch/${videoId}`);
    }
  };

  const getStatusIcon = (video: Video) => {
    if (video.status === 'completed') {
      return <Check className="h-4 w-4 text-primary" />;
    }
    if (video.id === currentVideoId) {
      return <Play className="h-4 w-4 text-primary fill-primary" />;
    }
    if (video.status === 'in_progress') {
      return (
        <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
      );
    }
    return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
  };

  return (
    <div className="h-full bg-card border-r border-border overflow-y-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left">
            <ChevronRight 
              className={cn(
                "h-5 w-5 mt-0.5 text-muted-foreground transition-transform flex-shrink-0",
                isOpen && "rotate-90"
              )} 
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground leading-tight line-clamp-2">
                {playlist?.title || 'Your Queue'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {videos.length} Video{videos.length !== 1 ? 's' : ''} 
                <span className="mx-1">|</span>
                Total: {formatDuration(totalDuration)}
              </p>
              {completedCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedCount}/{videos.length} completed
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/')}>
                  Back to dashboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border">
            {sortedVideos.map((video, index) => {
              const isActive = video.id === currentVideoId;
              const progress = calculateProgress(
                video.current_position_seconds || 0, 
                video.duration_seconds
              );

              return (
                <div
                  key={video.id}
                  className={cn(
                    "group relative flex items-start gap-3 p-3 cursor-pointer transition-colors",
                    isActive 
                      ? "bg-primary/10 border-l-2 border-l-primary" 
                      : "hover:bg-muted/50 border-l-2 border-l-transparent"
                  )}
                  onClick={() => handleVideoClick(video.id)}
                >
                  {/* Video number and status */}
                  <div className="flex-shrink-0 w-6 flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      {index + 1}
                    </span>
                    {getStatusIcon(video)}
                  </div>

                  {/* Thumbnail */}
                  <div className="flex-shrink-0 relative">
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt="" 
                        className="w-24 h-14 object-cover rounded"
                      />
                    ) : (
                      <div className="w-24 h-14 bg-muted rounded flex items-center justify-center">
                        <Play className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {/* Duration badge */}
                    <span className="absolute bottom-1 right-1 text-[10px] bg-black/80 text-white px-1 rounded">
                      {formatDuration(video.duration_seconds)}
                    </span>
                    {/* Progress bar overlay */}
                    {video.status !== 'not_started' && video.status !== 'completed' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 rounded-b">
                        <div 
                          className="h-full bg-primary rounded-b"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                    {video.status === 'completed' && (
                      <div className="absolute inset-0 bg-black/30 rounded flex items-center justify-center">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Video info */}
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "text-sm font-medium leading-tight line-clamp-2",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {video.title}
                    </h4>
                    {video.channel_name && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {video.channel_name}
                      </p>
                    )}
                  </div>

                  {/* Actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {video.status !== 'completed' && (
                        <DropdownMenuItem onClick={() => onMarkComplete(video.id)}>
                          Mark as complete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => onDeleteVideo(video.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        Remove from queue
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
