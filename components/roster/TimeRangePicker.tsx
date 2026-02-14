'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  minTime?: string;
  maxTime?: string;
  error?: string;
}

export function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  minTime = '08:00',
  maxTime = '23:00',
  error,
}: TimeRangePickerProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-time">Start Time</Label>
          <Input
            id="start-time"
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            min={minTime}
            max={maxTime}
            step="900"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-time">End Time</Label>
          <Input
            id="end-time"
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            min={minTime}
            max={maxTime}
            step="900"
            className="w-full"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">
        Shifts must be between {minTime} and {maxTime}
      </p>
    </div>
  );
}
