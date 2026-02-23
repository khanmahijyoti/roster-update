'use client';

import { Card } from '@/components/ui/card';
import { FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface RosterActionsProps {
  restaurantId: string;
  weekStart: Date;
  weekEnd: Date;
  draftCount: number;
  publishedCount: number;
  onPublishComplete?: () => void;
}

export function RosterActions({
  restaurantId,
  weekStart,
  weekEnd,
  draftCount,
  publishedCount,
  onPublishComplete,
}: RosterActionsProps) {
  return (
    <Card className="p-4 sm:p-6 shadow-lg border-0 bg-card w-full sm:w-auto">
      <div className="space-y-3 sm:space-y-4">
        {/* Status Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-shrink">
            <h3 className="font-semibold text-lg sm:text-xl text-primary">
              Roster Status
            </h3>
            <motion.p 
              className="text-xs sm:text-sm text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                {publishedCount} shift{publishedCount !== 1 ? 's' : ''} scheduled
              </span>
            </motion.p>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary/10 text-primary rounded-2xl font-semibold text-xs sm:text-sm flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <FileCheck className="w-3 h-3 sm:w-4 sm:h-4" />
              Auto-Published
            </div>
          </motion.div>
        </div>

        {/* Info */}
        <div className="bg-muted/50 rounded-xl p-3 sm:p-4 border border-primary/20">
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold flex-shrink-0">•</span>
              <span>All shifts are automatically published when created</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold flex-shrink-0">•</span>
              <span>Workers can see shifts immediately on their dashboard</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold flex-shrink-0">•</span>
              <span>Changes to shifts are reflected instantly</span>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
