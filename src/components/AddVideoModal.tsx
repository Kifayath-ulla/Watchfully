import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVideos } from '@/hooks/useVideos';
import { extractVideoId, extractPlaylistId, fetchVideoDetails, isPlaylistUrl, fetchPlaylistVideos } from '@/lib/youtube';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Film, ListVideo, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AddVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddVideoModal({ open, onOpenChange }: AddVideoModalProps) {
  const [url, setUrl] = useState('');
  const [intent, setIntent] = useState<string>('curiosity');
  const [customIntent, setCustomIntent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [urlType, setUrlType] = useState<'video' | 'playlist' | null>(null);
  const [playlistVideoUrls, setPlaylistVideoUrls] = useState('');
  const { addVideo } = useVideos();
  const { toast } = useToast();

  // Detect URL type as user types
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
        // Handle playlist - parse video URLs from textarea
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

        // Get playlist info
        const playlistInfo = await fetchPlaylistVideos(playlistId);
        
        // Parse video URLs from the textarea
        const videoUrls = playlistVideoUrls
          .split('\n')
          .map(u => u.trim())
          .filter(u => u.length > 0);
        
        if (videoUrls.length === 0) {
          toast({
            title: 'No videos provided',
            description: 'Please paste the video URLs from the playlist',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        let addedCount = 0;
        let failedCount = 0;

        for (const videoUrl of videoUrls) {
          const videoId = extractVideoId(videoUrl);
          if (!videoId) {
            failedCount++;
            continue;
          }

          try {
            const videoDetails = await fetchVideoDetails(videoId);
            await addVideo.mutateAsync({
              youtube_video_id: videoId,
              title: videoDetails.title,
              thumbnail_url: videoDetails.thumbnail,
              channel_name: videoDetails.channelTitle,
              duration_seconds: videoDetails.durationSeconds,
              intent: intent as 'learning' | 'career' | 'curiosity' | 'leisure' | 'custom',
              custom_intent: intent === 'custom' ? customIntent : null
            });
            addedCount++;
          } catch {
            failedCount++;
          }
        }

        toast({
          title: 'Playlist videos added',
          description: `Added ${addedCount} videos${failedCount > 0 ? `, ${failedCount} failed` : ''}`
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
          custom_intent: intent === 'custom' ? customIntent : null
        });
      }

      setUrl('');
      setIntent('curiosity');
      setCustomIntent('');
      setPlaylistVideoUrls('');
      setUrlType(null);
      onOpenChange(false);
    } catch (error) {
      // Error is already handled in useVideos hook
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

          {urlType === 'playlist' && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 rounded-md bg-muted text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Paste video URLs from playlist</p>
                  <p>Due to YouTube restrictions, we need individual video URLs. Open the playlist, copy each video URL (or use a playlist exporter tool), and paste them below - one per line.</p>
                </div>
              </div>
              <Label htmlFor="playlistVideos">Video URLs (one per line)</Label>
              <textarea
                id="playlistVideos"
                className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y text-sm"
                placeholder={"https://youtube.com/watch?v=abc123\nhttps://youtube.com/watch?v=def456\nhttps://youtube.com/watch?v=ghi789"}
                value={playlistVideoUrls}
                onChange={(e) => setPlaylistVideoUrls(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {playlistVideoUrls.split('\n').filter(u => u.trim()).length} video URLs entered
              </p>
            </div>
          )}
          
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {urlType === 'playlist' ? 'Add videos' : 'Add video'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}