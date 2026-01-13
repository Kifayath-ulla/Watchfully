import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { VideoStatus, VideoIntent, Video, Playlist } from '@/types/video';

interface QueueFiltersProps {
  statusFilter: VideoStatus | 'all';
  intentFilter: VideoIntent | 'all';
  videoFilter: string | 'all';
  onStatusChange: (value: VideoStatus | 'all') => void;
  onIntentChange: (value: VideoIntent | 'all') => void;
  onVideoFilterChange: (value: string | 'all') => void;
  onClear: () => void;
  videos: Video[];
  playlists: Playlist[];
}

export function QueueFilters({
  statusFilter,
  intentFilter,
  videoFilter,
  onStatusChange,
  onIntentChange,
  onVideoFilterChange,
  onClear,
  videos,
  playlists,
}: QueueFiltersProps) {
  const hasActiveFilters = statusFilter !== 'all' || intentFilter !== 'all' || videoFilter !== 'all';

  // Get standalone videos for the dropdown
  const standaloneVideos = videos.filter(v => !v.playlist_id);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Video/Playlist Selector */}
      <Select value={videoFilter} onValueChange={onVideoFilterChange}>
        <SelectTrigger className="w-40 h-8 text-xs bg-background">
          <SelectValue placeholder="All Videos" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Videos</SelectItem>
          {playlists.length > 0 && (
            <>
              <SelectItem value="playlists-only" className="font-medium">📁 Playlists Only</SelectItem>
              <SelectItem value="standalone-only" className="font-medium">📹 Standalone Only</SelectItem>
              <div className="px-2 py-1 text-xs text-muted-foreground border-t border-border mt-1 pt-1">
                Playlists
              </div>
              {playlists.map((playlist) => (
                <SelectItem key={playlist.id} value={`playlist:${playlist.id}`}>
                  📁 {playlist.title}
                </SelectItem>
              ))}
            </>
          )}
          {standaloneVideos.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs text-muted-foreground border-t border-border mt-1 pt-1">
                Videos
              </div>
              {standaloneVideos.slice(0, 10).map((video) => (
                <SelectItem key={video.id} value={`video:${video.id}`}>
                  📹 {video.title.slice(0, 30)}{video.title.length > 30 ? '...' : ''}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as VideoStatus | 'all')}>
        <SelectTrigger className="w-28 h-8 text-xs bg-background">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="not_started">Not Started</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={intentFilter} onValueChange={(v) => onIntentChange(v as VideoIntent | 'all')}>
        <SelectTrigger className="w-28 h-8 text-xs bg-background">
          <SelectValue placeholder="Intent" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All Intents</SelectItem>
          <SelectItem value="learning">Learning</SelectItem>
          <SelectItem value="career">Career</SelectItem>
          <SelectItem value="curiosity">Curiosity</SelectItem>
          <SelectItem value="leisure">Leisure</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2 text-xs">
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
