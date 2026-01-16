import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import {
  Play,
  Plus,
  Target,
  Clock,
  FolderPlus,
  Search,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: 'Welcome to Watchfully!',
    description:
      'Your personal video tracking companion. Watch with intention, track your progress, and never lose your place again.',
    tip: 'No more endless scrolling. Start watching with purpose.',
  },
  {
    icon: <Plus className="h-8 w-8 text-primary" />,
    title: 'Add Videos & Playlists',
    description:
      'Paste any YouTube video or playlist URL to add it to your queue. We\'ll fetch all the details automatically.',
    tip: 'Tip: You can also use our bookmarklet for quick adding!',
  },
  {
    icon: <Target className="h-8 w-8 text-primary" />,
    title: 'Set Your Intent',
    description:
      'Tag each video with an intent: Learning, Career, Curiosity, or Leisure. Stay mindful about what you watch.',
    tip: 'Knowing your "why" helps you stay focused.',
  },
  {
    icon: <Clock className="h-8 w-8 text-primary" />,
    title: 'Commit Your Time',
    description:
      'Before starting a session, choose how many minutes you want to commit. We\'ll track your real watch time.',
    tip: 'Start small. Even 15 minutes of focused watching counts!',
  },
  {
    icon: <FolderPlus className="h-8 w-8 text-primary" />,
    title: 'Organize with Playlists',
    description:
      'Create custom playlists by grouping standalone videos. Perfect for courses or themed collections.',
    tip: 'Use the "Create Playlist" button to group videos together.',
  },
  {
    icon: <Search className="h-8 w-8 text-primary" />,
    title: 'Search & Filter',
    description:
      'Quickly find any video using search. Filter by status (not started, in progress, completed) or by intent.',
    tip: 'The search bar searches titles and channel names.',
  },
  {
    icon: <CheckCircle2 className="h-8 w-8 text-primary" />,
    title: 'Track Your Progress',
    description:
      'See your daily stats, build a streak, and celebrate when you complete your goals. Your progress is saved automatically.',
    tip: 'Aim for 80% of your daily goal to maintain your streak!',
  },
];

const TUTORIAL_STORAGE_KEY = 'watchfully-tutorial-completed';
const NEW_USER_KEY = 'watchfully-new-user';

interface OnboardingTutorialProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function OnboardingTutorial({ forceOpen = false, onClose }: OnboardingTutorialProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Handle forced open from parent
  useEffect(() => {
    if (forceOpen) {
      setCurrentStep(0);
      setOpen(true);
    }
  }, [forceOpen]);

  useEffect(() => {
    if (!user || forceOpen) return;

    // Check if user has already completed the tutorial
    const tutorialCompleted = localStorage.getItem(`${TUTORIAL_STORAGE_KEY}-${user.id}`);
    
    // If tutorial is already completed, never show it again
    if (tutorialCompleted === 'true') {
      return;
    }

    // Check if this is a brand new user (flag set during signup in AuthContext)
    const isNewUser = localStorage.getItem(`${NEW_USER_KEY}-${user.id}`);
    
    // Only show tutorial for new users who haven't completed it
    if (isNewUser === 'true') {
      // Small delay to let the page load first
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user, forceOpen]);

  const handleComplete = () => {
    if (user) {
      localStorage.setItem(`${TUTORIAL_STORAGE_KEY}-${user.id}`, 'true');
      // Clear the new user flag after completing tutorial
      localStorage.removeItem(`${NEW_USER_KEY}-${user.id}`);
    }
    setOpen(false);
    onClose?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">{step.icon}</div>
          <DialogTitle className="text-xl">{step.title}</DialogTitle>
          <DialogDescription className="text-base pt-2">{step.description}</DialogDescription>
        </DialogHeader>

        {step.tip && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            💡 {step.tip}
          </div>
        )}

        <div className="py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>
              Step {currentStep + 1} of {tutorialSteps.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrev} className="flex-1 sm:flex-none">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1 sm:flex-none">
              {isLastStep ? (
                <>
                  Get Started
                  <Play className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
          {!isLastStep && (
            <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
              Skip tutorial
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
