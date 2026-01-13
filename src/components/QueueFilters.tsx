import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { VideoStatus, VideoIntent } from '@/types/video';

interface QueueFiltersProps {
  statusFilter: VideoStatus | 'all';
  intentFilter: VideoIntent | 'all';
  onStatusChange: (value: VideoStatus | 'all') => void;
  onIntentChange: (value: VideoIntent | 'all') => void;
  onClear: () => void;
}

export function QueueFilters({
  statusFilter,
  intentFilter,
  onStatusChange,
  onIntentChange,
  onClear,
}: QueueFiltersProps) {
  const hasActiveFilters = statusFilter !== 'all' || intentFilter !== 'all';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as VideoStatus | 'all')}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="not_started">Not Started</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={intentFilter} onValueChange={(v) => onIntentChange(v as VideoIntent | 'all')}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue placeholder="Intent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Intents</SelectItem>
          <SelectItem value="learning">Learning</SelectItem>
          <SelectItem value="career">Career</SelectItem>
          <SelectItem value="curiosity">Curiosity</SelectItem>
          <SelectItem value="leisure">Leisure</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2">
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
