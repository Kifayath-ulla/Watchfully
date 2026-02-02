import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, X, ChevronDown, ChevronUp, Copy, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

interface TranscriptPanelProps {
  videoId: string;
  youtubeVideoId: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function TranscriptPanel({ videoId, youtubeVideoId, currentTime, onSeek }: TranscriptPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLButtonElement>(null);

  const fetchTranscript = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to view transcripts');
        return;
      }

      const { data, error: funcError } = await supabase.functions.invoke('fetch-transcript', {
        body: { videoId: youtubeVideoId },
      });

      if (funcError) {
        throw funcError;
      }

      if (data.unavailable) {
        setError(data.error || 'Transcript not available');
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setTranscript(data.transcript);
    } catch (err) {
      console.error('Failed to fetch transcript:', err);
      setError('Failed to load transcript. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !transcript && !isLoading && !error) {
      fetchTranscript();
    }
  }, [isOpen, youtubeVideoId]);

  // Auto-scroll to current segment
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && isOpen) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, autoScroll, isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentSegmentIndex = () => {
    if (!transcript) return -1;
    return transcript.findIndex((seg, index) => {
      const nextSeg = transcript[index + 1];
      const segEnd = nextSeg ? nextSeg.start : seg.start + seg.duration;
      return currentTime >= seg.start && currentTime < segEnd;
    });
  };

  const copyFullTranscript = async () => {
    if (!transcript) return;
    
    const fullText = transcript.map(seg => seg.text).join(' ');
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Transcript copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const currentSegmentIndex = getCurrentSegmentIndex();

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Transcript
      </Button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Transcript</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          >
            {autoScroll ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          {transcript && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={copyFullTranscript}
              title="Copy full transcript"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-64" ref={scrollRef}>
        <div className="p-3 space-y-1">
          {isLoading && (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={fetchTranscript}
              >
                Try again
              </Button>
            </div>
          )}

          {transcript && transcript.map((segment, index) => {
            const isActive = index === currentSegmentIndex;
            return (
              <button
                key={index}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => onSeek(segment.start)}
                className={cn(
                  "w-full text-left flex gap-3 p-2 rounded-md transition-colors hover:bg-muted/80",
                  isActive && "bg-primary/10 border-l-2 border-primary"
                )}
              >
                <span className="text-xs text-muted-foreground font-mono shrink-0 pt-0.5">
                  {formatTime(segment.start)}
                </span>
                <span className={cn(
                  "text-sm",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {segment.text}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
