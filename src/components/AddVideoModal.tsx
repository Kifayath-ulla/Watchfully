import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVideos } from '@/hooks/useVideos';
import { extractVideoId, extractPlaylistId, fetchVideoDetails, isPlaylistUrl } from '@/lib/youtube';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Film, ListVideo } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AddVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlaylistVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  durationSeconds: number;
  position: number;
}

interface PlaylistData {
  playlistTitle: string;
  playlistThumbnail: string;
  channelTitle: string;
  videos: PlaylistVideo[];
  totalResults: number;
}

export function AddVideoModal({ open, onOpenChange }: AddVideoModalProps) {
  const [url, setUrl] = useState('');
  const [intent, setIntent] = useState<string>('curiosity');
  const [customIntent, setCustomIntent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [urlType, setUrlType] = useState<'video' | 'playlist' | null>(null);
  const { addVideo } = useVideos();
  const { toast } = useToast();

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.trim()) {
      if (isPlaylistUrl(value)) {
        setUrlType('playlist');
      } else if (extractVideoId(value)) {
        setUrlType('video');
      } else {
        setUrlType(null);
      }
    } else {
      setUrlType(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a YouTube video or playlist URL',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (urlType === 'playlist') {
        // Directly fetch and import playlist
        const playlistId = extractPlaylistId(url);
        if (!playlistId) {
          toast({
            title: 'Invalid playlist URL',
            description: 'Could not extract playlist ID from the URL',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('fetch-playlist', {
          body: { playlistId }
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch playlist');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        const playlistData = data as PlaylistData;
        let addedCount = 0;
        let failedCount = 0;

        for (const video of playlistData.videos) {
          try {
            await addVideo.mutateAsync({
              youtube_video_id: video.videoId,
              title: video.title,
              thumbnail_url: video.thumbnail,
              channel_name: video.channelTitle,
              duration_seconds: video.durationSeconds,
              intent: intent as 'learning' | 'career' | 'curiosity' | 'leisure' | 'custom',
              custom_intent: intent === 'custom' ? customIntent : undefined,
              playlist_order: video.position,
            });
            addedCount++;
          } catch {
            failedCount++;
          }
        }

        toast({
          title: 'Playlist imported',
          description: `Added ${addedCount} videos from "${playlistData.playlistTitle}"${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        });
      } else {
        // Handle single video
        const videoId = extractVideoId(url);
        if (!videoId) {
          toast({
            title: 'Invalid URL',
            description: 'Please enter a valid YouTube video URL',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        const videoDetails = await fetchVideoDetails(videoId);
        
        await addVideo.mutateAsync({
          youtube_video_id: videoId,
          title: videoDetails.title,
          thumbnail_url: videoDetails.thumbnail,
          channel_name: videoDetails.channelTitle,
          duration_seconds: videoDetails.durationSeconds,
          intent: intent as 'learning' | 'career' | 'curiosity' | 'leisure' | 'custom',
          custom_intent: intent === 'custom' ? customIntent : undefined,
        });
      }

      setUrl('');
      setIntent('curiosity');
      setCustomIntent('');
      setUrlType(null);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Could not import from YouTube',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a video or playlist</DialogTitle>
          <DialogDescription>
            Paste a YouTube video URL or playlist URL to add to your queue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">YouTube URL</Label>
            <div className="relative">
              <Input
                id="url"
                type="url"
                placeholder="https://youtube.com/watch?v=... or /playlist?list=..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={isLoading}
                className="pr-24"
              />
              {urlType && (
                <Badge 
                  variant={urlType === 'playlist' ? 'secondary' : 'outline'} 
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {urlType === 'playlist' ? (
                    <><ListVideo className="h-3 w-3 mr-1" /> Playlist</>
                  ) : (
                    <><Film className="h-3 w-3 mr-1" /> Video</>
                  )}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="intent">Why are you watching?</Label>
            <Select value={intent} onValueChange={setIntent} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="learning">Learning something new</SelectItem>
                <SelectItem value="career">Career development</SelectItem>
                <SelectItem value="curiosity">Following curiosity</SelectItem>
                <SelectItem value="leisure">Leisure & entertainment</SelectItem>
                <SelectItem value="custom">Custom intent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {intent === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customIntent">Your intent</Label>
              <Input
                id="customIntent"
                placeholder="What's your purpose for watching?"
                value={customIntent}
                onChange={(e) => setCustomIntent(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !url.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? 'Importing...' : urlType === 'playlist' ? 'Import playlist' : 'Add video'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
