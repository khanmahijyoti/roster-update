'use client';

import { Shift, Profile } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/utils/date-utils';
import { X, Edit2, Clock } from 'lucide-react';

interface ShiftCardProps {
  shift: Shift & { worker_profile?: Profile };
  onEdit?: (shift: Shift) => void;
  onDelete?: (shiftId: string) => void;
  isEditable?: boolean;
  statusIndicator?: 'available' | 'warning' | 'busy';
}

export function ShiftCard({
  shift,
  onEdit,
  onDelete,
  isEditable = true,
  statusIndicator,
}: ShiftCardProps) {
  const getStatusColor = () => {
    if (!statusIndicator) return 'bg-muted/50';
    switch (statusIndicator) {
      case 'available':
        return 'bg-primary/20 border-primary/40';
      case 'warning':
        return 'bg-chart-4/20 border-chart-4/40';
      case 'busy':
        return 'bg-destructive/20 border-destructive/40';
    }
  };

  const getStatusIcon = () => {
    if (!statusIndicator) return null;
    return (
      <div
        className={`w-2 h-2 rounded-full ${
          statusIndicator === 'available'
            ? 'bg-primary'
            : statusIndicator === 'warning'
            ? 'bg-chart-4'
            : 'bg-destructive'
        }`}
      />
    );
  };

  const workerName = shift.worker_profile
    ? `${shift.worker_profile.first_name} ${shift.worker_profile.last_name}`
    : 'Unassigned';

  const now = new Date();
  const endTime = new Date(shift.end_time);
  const isPast = endTime < now;
  const isLocked = !isEditable;

  return (
    <Card
      className={`p-3 border-l-4 transition-all hover:shadow-md ${getStatusColor()} ${
        shift.status === 'draft' ? 'opacity-80' : ''
      } ${isLocked ? 'opacity-60 grayscale bg-muted border-muted-foreground/30 pointer-events-none select-none' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon()}
            <p className="font-medium text-sm truncate">{workerName}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {shift.status === 'draft' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                DRAFT
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted-foreground/10 text-muted-foreground border border-border/50">
                {isPast ? 'COMPLETED' : 'ONGOING'}
              </span>
            )}
          </div>
        </div>

        {!isLocked && (
          <div className="flex gap-1">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(shift)}
                className="h-7 w-7 p-0"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(shift.id)}
                className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
