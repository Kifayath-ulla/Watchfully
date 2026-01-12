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
import { Loader2, Film, ListVideo, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const { addVideo } = useVideos();
  const { toast } = useToast();

  // Detect URL type as user types
  const handleUrlChange = (value: string) => {
    setUrl(value);
    setPlaylistData(null);
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

  const fetchPlaylist = async () => {
    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      toast({
        title: 'Invalid playlist URL',
        description: 'Could not extract playlist ID from the URL',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching playlist:', playlistId);
      
      const { data, error } = await supabase.functions.invoke('fetch-playlist', {
        body: { playlistId }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to fetch playlist');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('Playlist data received:', data);
      setPlaylistData(data as PlaylistData);
      
      toast({
        title: 'Playlist loaded',
        description: `Found ${data.videos.length} videos in "${data.playlistTitle}"`,
      });
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast({
        title: 'Failed to load playlist',
        description: error instanceof Error ? error.message : 'Could not fetch playlist from YouTube',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
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
      if (urlType === 'playlist' && playlistData) {
        // Import all videos from the fetched playlist
        const videos = playlistData.videos;
        setImportProgress({ current: 0, total: videos.length });
        
        let addedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          setImportProgress({ current: i + 1, total: videos.length });
          
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
          description: `Added ${addedCount} videos${failedCount > 0 ? `, ${failedCount} failed or duplicates` : ''}`,
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

      // Reset form
      setUrl('');
      setIntent('curiosity');
      setCustomIntent('');
      setPlaylistData(null);
      setUrlType(null);
      setImportProgress({ current: 0, total: 0 });
      onOpenChange(false);
    } catch (error) {
      // Error is already handled in useVideos hook
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercent = importProgress.total > 0 
    ? Math.round((importProgress.current / importProgress.total) * 100) 
    : 0;

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

          {/* Playlist fetch button */}
          {urlType === 'playlist' && !playlistData && (
            <Button 
              type="button" 
              variant="secondary" 
              className="w-full" 
              onClick={fetchPlaylist}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading playlist...
                </>
              ) : (
                <>
                  <ListVideo className="h-4 w-4 mr-2" />
                  Load playlist videos
                </>
              )}
            </Button>
          )}

          {/* Playlist preview */}
          {playlistData && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img 
                  src={playlistData.playlistThumbnail} 
                  alt={playlistData.playlistTitle}
                  className="w-20 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{playlistData.playlistTitle}</h4>
                  <p className="text-sm text-muted-foreground">{playlistData.channelTitle}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{playlistData.videos.length} videos ready to import</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setPlaylistData(null)}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Import progress */}
          {importProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Importing videos...</span>
                <span className="text-foreground">{importProgress.current} / {importProgress.total}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
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
            <Button 
              type="submit" 
              disabled={isLoading || (urlType === 'playlist' && !playlistData)}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {urlType === 'playlist' ? `Import ${playlistData?.videos.length || 0} videos` : 'Add video'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
