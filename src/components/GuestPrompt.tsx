import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuest } from '@/contexts/GuestContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Cloud, Shield, Smartphone, X } from 'lucide-react';

interface GuestPromptProps {
  videoCount: number;
}

const GUEST_PROMPT_DISMISSED_KEY = 'watchfully-guest-prompt-dismissed';

export function GuestPrompt({ videoCount }: GuestPromptProps) {
  const navigate = useNavigate();
  const { exitGuestMode } = useGuest();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(GUEST_PROMPT_DISMISSED_KEY) === 'true';
  });

  // Only show if guest has 3+ videos and hasn't dismissed
  const shouldShow = videoCount >= 3 && !dismissed;

  if (!shouldShow) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(GUEST_PROMPT_DISMISSED_KEY, 'true');
  };

  const handleCreateAccount = () => {
    exitGuestMode();
    navigate('/auth');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="pr-8">
        <h4 className="font-medium text-foreground mb-1">
          Your progress is temporary
        </h4>
        <p className="text-sm text-muted-foreground mb-3">
          You have {videoCount} videos in your queue. Create a free account to save them permanently.
        </p>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Cloud className="h-3.5 w-3.5" />
            Saved in the cloud
          </span>
          <span className="flex items-center gap-1">
            <Smartphone className="h-3.5 w-3.5" />
            Access on any device
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" />
            Never lose progress
          </span>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleCreateAccount}>
            Create free account
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

// Restriction dialog for when guests try to use locked features
interface GuestRestrictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  reason: string;
}

export function GuestRestrictionDialog({
  open,
  onOpenChange,
  feature,
  reason,
}: GuestRestrictionDialogProps) {
  const navigate = useNavigate();
  const { exitGuestMode } = useGuest();

  const handleCreateAccount = () => {
    exitGuestMode();
    navigate('/auth');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account required for {feature}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{reason}</p>
            <p className="text-foreground">
              Create a free account to unlock this feature and save your progress permanently.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue exploring</AlertDialogCancel>
          <AlertDialogAction onClick={handleCreateAccount}>
            Create free account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
