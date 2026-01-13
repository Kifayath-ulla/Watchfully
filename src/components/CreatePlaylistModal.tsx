import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Video, VideoIntent } from '@/types/video';
import { usePlaylists } from '@/hooks/usePlaylists';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FolderPlus } from 'lucide-react';

interface CreatePlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  standaloneVideos: Video[];
  preSelectedVideoIds?: string[];
}

export function CreatePlaylistModal({
  open,
  onOpenChange,
  standaloneVideos,
  preSelectedVideoIds = [],
}: CreatePlaylistModalProps) {
  const { user } = useAuth();
  const { addPlaylist } = usePlaylists();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [intent, setIntent] = useState<VideoIntent>('learning');
  const [customIntent, setCustomIntent] = useState('');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set(preSelectedVideoIds));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleVideo = (videoId: string) => {
    setSelectedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedVideos(new Set(standaloneVideos.map((v) => v.id)));
  };

  const clearSelection = () => {
    setSelectedVideos(new Set());
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a playlist title.',
        variant: 'destructive',
      });
      return;
    }
    if (selectedVideos.size === 0) {
      toast({
        title: 'No videos selected',
        description: 'Please select at least one video.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the playlist
      const playlist = await addPlaylist.mutateAsync({
        youtube_playlist_id: `custom-${Date.now()}`, // Custom playlist identifier
        title: title.trim(),
        thumbnail_url: standaloneVideos.find((v) => selectedVideos.has(v.id))?.thumbnail_url || null,
        total_videos: selectedVideos.size,
        intent,
        custom_intent: intent === 'custom' ? customIntent : null,
      });

      // Update all selected videos to belong to this playlist
      const videoIds = Array.from(selectedVideos);
      for (let i = 0; i < videoIds.length; i++) {
        await supabase
          .from('videos')
          .update({
            playlist_id: playlist.id,
            playlist_order: i + 1,
            intent,
            custom_intent: intent === 'custom' ? customIntent : null,
          })
          .eq('id', videoIds[i])
          .eq('user_id', user.id);
      }

      toast({
        title: 'Playlist created',
        description: `"${title}" with ${selectedVideos.size} videos`,
      });

      // Reset and close
      setTitle('');
      setIntent('learning');
      setCustomIntent('');
      setSelectedVideos(new Set());
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to create playlist',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create Playlist
          </DialogTitle>
          <DialogDescription className="text-sm">
            Group videos together for organized watching
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="playlist-title" className="text-sm font-medium">Title</Label>
            <Input
              id="playlist-title"
              placeholder="e.g., JavaScript Fundamentals"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Intent */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Intent</Label>
            <Select value={intent} onValueChange={(v) => setIntent(v as VideoIntent)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="learning">🎓 Learning</SelectItem>
                <SelectItem value="career">💼 Career</SelectItem>
                <SelectItem value="curiosity">🔍 Curiosity</SelectItem>
                <SelectItem value="leisure">🎮 Leisure</SelectItem>
                <SelectItem value="custom">✏️ Custom</SelectItem>
              </SelectContent>
            </Select>
            {intent === 'custom' && (
              <Input
                placeholder="Enter custom intent..."
                value={customIntent}
                onChange={(e) => setCustomIntent(e.target.value)}
                className="h-10"
              />
            )}
          </div>

          {/* Video Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Videos <span className="text-muted-foreground font-normal">({selectedVideos.size} selected)</span>
              </Label>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAll} 
                  className="h-7 px-2 text-xs hover:bg-primary/10"
                >
                  Select all
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearSelection} 
                  className="h-7 px-2 text-xs hover:bg-destructive/10"
                  disabled={selectedVideos.size === 0}
                >
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="border border-border rounded-lg overflow-hidden">
              <ScrollArea className="h-52">
                <div className="divide-y divide-border">
                  {standaloneVideos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 px-4">
                      No videos available to add
                    </p>
                  ) : (
                    standaloneVideos.map((video) => (
                      <div
                        key={video.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                          selectedVideos.has(video.id)
                            ? 'bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleVideo(video.id)}
                      >
                        <Checkbox
                          checked={selectedVideos.has(video.id)}
                          onCheckedChange={() => toggleVideo(video.id)}
                          className="flex-shrink-0"
                        />
                        <img
                          src={video.thumbnail_url || '/placeholder.svg'}
                          alt=""
                          className="w-14 h-8 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate leading-tight">{video.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {video.channel_name} · {formatDuration(video.duration_seconds)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || selectedVideos.size === 0}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? 'Creating...' : `Create (${selectedVideos.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
