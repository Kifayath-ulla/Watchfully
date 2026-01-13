import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Check, Trash2, X, Tag, CheckSquare } from 'lucide-react';
import { VideoIntent } from '@/types/video';
import { useState } from 'react';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  onSelectAll: () => void;
  onMarkComplete: () => void;
  onDelete: () => void;
  onChangeIntent: (intent: VideoIntent, customIntent?: string) => void;
  isLoading?: boolean;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onClear,
  onSelectAll,
  onMarkComplete,
  onDelete,
  onChangeIntent,
  isLoading,
}: BulkActionBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [intentValue, setIntentValue] = useState<string>('');
  const allSelected = selectedCount === totalCount && totalCount > 0;

  const handleIntentChange = (value: string) => {
    setIntentValue(value);
    onChangeIntent(value as VideoIntent);
    setIntentValue('');
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg flex-wrap">
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2">
          <X className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-medium text-foreground">
          {selectedCount} video{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          disabled={allSelected}
          className="h-8 text-xs"
        >
          <CheckSquare className="h-3.5 w-3.5 mr-1" />
          {allSelected ? 'All selected' : 'Select all'}
        </Button>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onMarkComplete}
            disabled={isLoading}
            className="h-8"
          >
            <Check className="h-4 w-4 mr-1" />
            Complete
          </Button>
          
          <Select value={intentValue} onValueChange={handleIntentChange}>
            <SelectTrigger className="w-32 h-8">
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span className="text-xs">Intent</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="learning">Learning</SelectItem>
              <SelectItem value="career">Career</SelectItem>
              <SelectItem value="curiosity">Curiosity</SelectItem>
              <SelectItem value="leisure">Leisure</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setShowDeleteDialog(true)}
            disabled={isLoading}
            className="h-8"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} video{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected videos will be permanently removed from your queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
