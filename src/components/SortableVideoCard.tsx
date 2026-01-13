import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, PlayCircle, GripVertical } from 'lucide-react';
import { Video } from '@/types/video';
import { formatDuration, calculateProgress } from '@/lib/youtube';

interface SortableVideoCardProps {
  video: Video;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onClick: (video: Video) => void;
  getIntentLabel: (intent: string, customIntent?: string | null) => string;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (videoId: string) => void;
}

export function SortableVideoCard({ 
  video, 
  onDelete, 
  onClick, 
  getIntentLabel,
  selectionMode,
  isSelected,
  onToggleSelect,
}: SortableVideoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const progress = calculateProgress(video.current_position_seconds || 0, video.duration_seconds);

  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(video.id);
    } else {
      onClick(video);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(video.id);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-lg ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Selection Checkbox or Drag Handle */}
          {selectionMode ? (
            <div
              className="hidden sm:flex items-center justify-center w-10 bg-muted/50 hover:bg-muted"
              onClick={handleCheckboxClick}
            >
              <Checkbox checked={isSelected} />
            </div>
          ) : (
            <div
              className="hidden sm:flex items-center justify-center w-10 bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {/* Thumbnail */}
          <div className="relative sm:w-48 flex-shrink-0 group">
            <img
              src={
                video.thumbnail_url ||
                `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`
              }
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
            {/* Mobile drag handle */}
            <div
              className="sm:hidden absolute top-2 left-2 p-1.5 bg-background/80 backdrop-blur-sm rounded cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground line-clamp-2 mb-1">{video.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{video.channel_name}</p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {getIntentLabel(video.intent || "curiosity", video.custom_intent)}
                  </Badge>
                  <Badge
                    variant={video.status === "completed" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {video.status === "not_started"
                      ? "Not started"
                      : video.status === "in_progress"
                        ? "In progress"
                        : "Completed"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{progress}% complete</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => onDelete(e, video.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
