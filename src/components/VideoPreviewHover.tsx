import { useState, useRef, useEffect } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Clock, Eye } from 'lucide-react';
import { Video } from '@/types/video';
import { formatDuration, calculateProgress } from '@/lib/youtube';

interface VideoPreviewHoverProps {
  video: Video;
  children: React.ReactNode;
}

export function VideoPreviewHover({ video, children }: VideoPreviewHoverProps) {
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

  const videoUrl = `https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1&mute=1&start=${Math.floor(video.current_position_seconds || 0)}&controls=0&modestbranding=1`;

  return (
    <HoverCard openDelay={400} closeDelay={200} onOpenChange={setShowPreview}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side="right" 
        align="start" 
        className="w-80 p-0 overflow-hidden"
        sideOffset={8}
      >
        {/* Video Preview */}
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
          <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-medium">
            {formatDuration(video.duration_seconds)}
          </div>
        </div>

        {/* Video Info */}
        <div className="p-3 space-y-2">
          <h4 className="font-medium text-sm line-clamp-2 text-foreground">
            {video.title}
          </h4>
          <p className="text-xs text-muted-foreground">{video.channel_name}</p>
          
          {/* Progress */}
          <div className="space-y-1">
            <Progress value={progress} className="h-1" />
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
          
          {/* Quick action hint */}
          <div className="flex items-center gap-1.5 text-xs text-primary pt-1">
            <Play className="h-3 w-3" />
            <span>Click to watch</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
