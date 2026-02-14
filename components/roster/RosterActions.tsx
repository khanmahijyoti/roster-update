'use client';

import { useState } from 'react';
import { Button as MovingBorderButton } from '@/components/ui/moving-border';
import { Card } from '@/components/ui/card';
import { FileCheck, Send, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  async function handlePublishAllDrafts() {
    try {
      setPublishing(true);
      setError(null);
      setSuccess(null);

      // Create end of week timestamp (Sunday 23:59:59)
      const weekEndTimestamp = new Date(weekEnd);
      weekEndTimestamp.setHours(23, 59, 59, 999);

      // Update all draft shifts to published for this restaurant and week
      const { data, error: updateError } = await supabase
        .from('shifts')
        .update({ status: 'published' })
        .eq('restaurant_id', restaurantId)
        .eq('status', 'draft')
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEndTimestamp.toISOString())
        .select();

      if (updateError) throw updateError;

      setSuccess(`Successfully published ${data?.length || 0} shifts!`);
      onPublishComplete?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error publishing shifts:', err);
      setError('Failed to publish shifts. Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Card className="p-6 shadow-lg border-0 bg-card">
      <div className="space-y-4">
        {/* Status Summary */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-xl text-primary">
              Roster Status
            </h3>
            <motion.p 
              className="text-sm text-gray-600 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                {draftCount} draft{draftCount !== 1 ? 's' : ''}
              </span>
              {' • '}
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                {publishedCount} published
              </span>
            </motion.p>
          </div>

          {draftCount > 0 ? (
            <MovingBorderButton
              onClick={handlePublishAllDrafts}
              disabled={publishing}
              borderRadius="1.5rem"
              containerClassName="h-14 w-48"
              className="bg-primary text-primary-foreground font-semibold"
              borderClassName="bg-[radial-gradient(var(--primary)_40%,transparent_60%)]"
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                {publishing ? 'Publishing...' : 'Publish All Drafts'}
              </div>
            </MovingBorderButton>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-6 py-3 bg-gray-100 text-gray-400 rounded-2xl font-semibold text-sm"
            >
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                No drafts to publish
              </div>
            </motion.div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <motion.div 
            className="flex items-start gap-2 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div 
            className="flex items-start gap-2 bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <FileCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{success}</p>
          </motion.div>
        )}

        {/* Info */}
        <div className="bg-muted/50 rounded-xl p-4 border border-primary/20">
          <div className="text-xs text-gray-600 space-y-1.5">
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Draft shifts are only visible to admins</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Published shifts are visible to workers</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Workers will see published shifts on their dashboard</span>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
