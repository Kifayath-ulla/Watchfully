import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Play, LogOut, BookOpen } from 'lucide-react';

interface ExitFrictionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onLogSkip: (reason?: string) => void;
  onExit: () => void;
  committedMinutes?: number;
  watchedMinutes: number;
  onDisableExitFriction?: () => void;
}

const SKIP_REASONS = [
  'Got distracted',
  'Need a break',
  'Not what I expected',
  'Something urgent came up',
  'Saving for later'
];

export function ExitFrictionModal({
  open,
  onOpenChange,
  onContinue,
  onLogSkip,
  onExit,
  committedMinutes,
  watchedMinutes,
  onDisableExitFriction
}: ExitFrictionModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [disableFriction, setDisableFriction] = useState(false);

  const handleLogSkip = () => {
    onLogSkip(selectedReason || undefined);
    if (disableFriction && onDisableExitFriction) {
      onDisableExitFriction();
    }
  };

  const handleExit = () => {
    onExit();
    if (disableFriction && onDisableExitFriction) {
      onDisableExitFriction();
    }
  };

  const remainingMinutes = committedMinutes ? Math.max(0, committedMinutes - watchedMinutes) : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Leaving so soon?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You've watched <span className="font-medium text-foreground">{watchedMinutes} minutes</span>
              {committedMinutes && (
                <> of your <span className="font-medium text-foreground">{committedMinutes} minute</span> commitment</>
              )}.
            </p>
            {remainingMinutes > 0 && (
              <p className="text-sm">
                Just {remainingMinutes} more minutes to honor your commitment.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm font-medium text-foreground">What would you like to do?</p>
          
          <div className="space-y-2">
            {SKIP_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(selectedReason === reason ? null : reason)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedReason === reason
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="disable-friction"
              checked={disableFriction}
              onCheckedChange={(checked) => setDisableFriction(checked === true)}
            />
            <Label htmlFor="disable-friction" className="text-xs text-muted-foreground cursor-pointer">
              Don't ask me again
            </Label>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="default" onClick={onContinue} className="gap-2">
            <Play className="h-4 w-4" />
            Continue watching
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleLogSkip}
            disabled={!selectedReason}
          >
            Log & exit
          </Button>
          <AlertDialogCancel asChild>
            <Button variant="ghost" onClick={handleExit} className="gap-2">
              <LogOut className="h-4 w-4" />
              Just exit
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
