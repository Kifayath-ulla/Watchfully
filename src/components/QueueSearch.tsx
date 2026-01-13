import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface QueueSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
  totalCount?: number;
}

export function QueueSearch({ value, onChange, resultCount, totalCount }: QueueSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  const isSearching = localValue.trim().length > 0;

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search videos..."
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="h-8 w-48 pl-8 pr-8 text-xs bg-background"
        />
        {isSearching && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
      </div>
      {isSearching && resultCount !== undefined && totalCount !== undefined && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {resultCount} of {totalCount}
        </span>
      )}
    </div>
  );
}
