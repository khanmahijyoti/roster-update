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
    if (!statusIndicator) return 'bg-gray-100';
    switch (statusIndicator) {
      case 'available':
        return 'bg-green-100 border-green-300';
      case 'warning':
        return 'bg-orange-100 border-orange-300';
      case 'busy':
        return 'bg-red-100 border-red-300';
    }
  };

  const getStatusIcon = () => {
    if (!statusIndicator) return null;
    return (
      <div
        className={`w-2 h-2 rounded-full ${
          statusIndicator === 'available'
            ? 'bg-green-500'
            : statusIndicator === 'warning'
            ? 'bg-orange-500'
            : 'bg-red-500'
        }`}
      />
    );
  };

  const workerName = shift.worker_profile
    ? `${shift.worker_profile.first_name} ${shift.worker_profile.last_name}`
    : 'Unassigned';

  return (
    <Card
      className={`p-3 border-l-4 transition-all hover:shadow-md ${getStatusColor()} ${
        shift.status === 'draft' ? 'opacity-80' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon()}
            <p className="font-medium text-sm truncate">{workerName}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            <span>
              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
            </span>
          </div>
          {shift.status === 'draft' && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
              Draft
            </span>
          )}
        </div>

        {isEditable && (
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
                className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
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
