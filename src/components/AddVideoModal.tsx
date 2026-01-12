import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVideos } from '@/hooks/useVideos';
import { extractVideoId, fetchVideoDetails } from '@/lib/youtube';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddVideoModal({ open, onOpenChange }: AddVideoModalProps) {
  const [url, setUrl] = useState('');
  const [intent, setIntent] = useState<string>('curiosity');
  const [customIntent, setCustomIntent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addVideo } = useVideos();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a YouTube video URL',
        variant: 'destructive'
      });
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube video URL',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
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

      setUrl('');
      setIntent('curiosity');
      setCustomIntent('');
      onOpenChange(false);
    } catch (error) {
      // Error is already handled in useVideos hook
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a video</DialogTitle>
          <DialogDescription>
            Paste a YouTube video URL to add it to your queue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">YouTube URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add video
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}