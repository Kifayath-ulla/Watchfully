import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Copy, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Bookmarklet code that extracts video URLs from a YouTube playlist page
const BOOKMARKLET_CODE = `javascript:(function(){
  const videos = Array.from(document.querySelectorAll('a#video-title, ytd-playlist-panel-video-renderer a#wc-endpoint, a.yt-simple-endpoint.ytd-playlist-video-renderer'));
  const urls = [...new Set(videos.map(a => {
    const href = a.href;
    if (href && href.includes('watch?v=')) {
      const url = new URL(href);
      return 'https://www.youtube.com/watch?v=' + url.searchParams.get('v');
    }
    return null;
  }).filter(Boolean))];
  
  if (urls.length === 0) {
    alert('No videos found. Make sure you are on a YouTube playlist page.');
    return;
  }
  
  const text = urls.join('\\n');
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied ' + urls.length + ' video URLs to clipboard!\\n\\nPaste them in Watchfully to add the videos.');
  }).catch(() => {
    prompt('Copy these URLs:', text);
  });
})();`;

export function BookmarkletHelper() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(BOOKMARKLET_CODE).then(() => {
      setCopied(true);
      toast({
        title: 'Bookmarklet copied!',
        description: 'Create a new bookmark and paste this as the URL.',
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Playlist Extractor</CardTitle>
          <Badge variant="secondary" className="text-xs">Helper</Badge>
        </div>
        <CardDescription>
          Extract video URLs from YouTube playlists with one click
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <strong>Option 1:</strong> Drag this button to your bookmarks bar:
          </p>
          <a
            href={BOOKMARKLET_CODE}
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 cursor-grab active:cursor-grabbing"
            draggable="true"
          >
            <Bookmark className="h-4 w-4" />
            📋 Extract Playlist
          </a>
          <p className="text-xs text-muted-foreground">
            Drag this to your bookmarks bar, then click it on any YouTube playlist page.
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <strong>Option 2:</strong> Manually create a bookmarklet:
          </p>
          <Button 
            variant="outline" 
            className="w-full gap-2" 
            onClick={copyBookmarklet}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy bookmarklet code
              </>
            )}
          </Button>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Copy the code above</li>
            <li>Create a new bookmark in your browser</li>
            <li>Name it "Extract Playlist"</li>
            <li>Paste the code as the URL/address</li>
          </ol>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Works on YouTube playlist pages, channels, and search results.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
