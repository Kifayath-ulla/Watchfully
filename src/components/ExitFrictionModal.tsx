import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Play, LogOut, BookOpen, Edit3 } from 'lucide-react';

interface ExitFrictionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onLogSkip: (reason?: string, manualMinutes?: number) => void;
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
  'Saving for later',
  'Watched externally on YouTube'
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
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualMinutes, setManualMinutes] = useState<number>(watchedMinutes);

  const handleLogSkip = () => {
    const finalMinutes = showManualInput ? manualMinutes : undefined;
    onLogSkip(selectedReason || undefined, finalMinutes);
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

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(selectedReason === reason ? null : reason);
    // Show manual input if they watched externally
    if (reason === 'Watched externally on YouTube') {
      setShowManualInput(true);
    } else if (selectedReason === 'Watched externally on YouTube') {
      setShowManualInput(false);
    }
  };

  const remainingMinutes = committedMinutes ? Math.max(0, committedMinutes - watchedMinutes) : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md p-6">
        <AlertDialogHeader className="text-left">
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
                onClick={() => handleReasonSelect(reason)}
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

          {/* Manual time input for external watching */}
          {showManualInput && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <Edit3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Actual time watched:</span>
              <input
                type="number"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                max={committedMinutes || 999}
                className="w-16 h-7 px-2 text-center rounded border border-input bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          )}

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

        {/* Action buttons - perfectly centered */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 w-full pt-2">
          <Button 
            variant="default" 
            onClick={onContinue} 
            className="gap-2 flex-1 sm:flex-initial"
          >
            <Play className="h-4 w-4" />
            Continue
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleLogSkip}
            disabled={!selectedReason}
            className="flex-1 sm:flex-initial"
          >
            Log & exit
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExit} 
            className="gap-2 flex-1 sm:flex-initial"
          >
            <LogOut className="h-4 w-4" />
            Just exit
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
