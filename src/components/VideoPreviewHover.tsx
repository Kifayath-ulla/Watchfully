import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Play, Clock, Eye } from 'lucide-react';
import { Video } from '@/types/video';
import { formatDuration, calculateProgress } from '@/lib/youtube';
import { useIsMobile } from '@/hooks/use-mobile';

interface VideoPreviewHoverProps {
  video: Video;
  children: React.ReactNode;
}

export function VideoPreviewHover({ video, children }: VideoPreviewHoverProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showPreview, setShowPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const progress = calculateProgress(video.current_position_seconds || 0, video.duration_seconds);
  const remainingSeconds = Math.max(0, video.duration_seconds - (video.current_position_seconds || 0));

  // Clean up iframe when hover ends
  useEffect(() => {
    if (!showPreview && iframeRef.current) {
      iframeRef.current.src = '';
    }
  }, [showPreview]);

  // Disable hover on mobile devices
  if (isMobile) {
    return <>{children}</>;
  }

  const videoUrl = `https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1&mute=1&start=${Math.floor(video.current_position_seconds || 0)}&controls=0&modestbranding=1`;

  const handleWatchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/watch/${video.id}`);
  };

  return (
    <HoverCard openDelay={400} closeDelay={200} onOpenChange={setShowPreview}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side="left" 
        align="center" 
        className="w-72 p-0 overflow-hidden z-[100] shadow-xl animate-in fade-in-0 zoom-in-95"
        sideOffset={20}
        collisionPadding={{ top: 20, right: 20, bottom: 20, left: 20 }}
        avoidCollisions={true}
        sticky="partial"
      >
        {/* Video Preview - Larger */}
        <div className="relative aspect-video bg-muted">
          {showPreview ? (
            <iframe
              ref={iframeRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={video.title}
            />
          ) : (
            <img
              src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
            {formatDuration(video.duration_seconds)}
          </div>
          {/* Status badge */}
          {video.status === 'completed' && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-primary/90 text-primary-foreground text-xs">
                Completed
              </Badge>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-4 space-y-3">
          <div>
            <h4 className="font-medium text-sm line-clamp-2 text-foreground leading-snug">
              {video.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">{video.channel_name}</p>
          </div>
          
          {/* Progress */}
          <div className="space-y-1.5">
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {progress}% watched
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(remainingSeconds)} left
              </span>
            </div>
          </div>

          {/* Intent Badge */}
          {video.intent && (
            <Badge variant="secondary" className="text-xs">
              {video.intent === 'custom' ? video.custom_intent : video.intent}
            </Badge>
          )}
          
          {/* Click to watch button */}
          <Button 
            size="sm" 
            className="w-full gap-2" 
            onClick={handleWatchClick}
          >
            <Play className="h-4 w-4" />
            Click to watch
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
