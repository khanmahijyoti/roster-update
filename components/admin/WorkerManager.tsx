'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, UserMinus, Check, X, AlertCircle } from 'lucide-react';
import { Profile, Restaurant } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface WorkerManagerProps {
  restaurant: Restaurant;
  onAssignmentsChange?: () => void;
}

interface WorkerWithAssignment extends Profile {
  isAssigned: boolean;
}

export function WorkerManager({ restaurant, onAssignmentsChange }: WorkerManagerProps) {
  const [workers, setWorkers] = useState<WorkerWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadWorkers();
  }, [restaurant.id]);

  async function loadWorkers() {
    try {
      setLoading(true);
      setError(null);

      // Get all worker profiles
      const { data: allWorkers, error: workersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'worker')
        .order('last_name');

      if (workersError) throw workersError;

      // Get current assignments for this restaurant
      const { data: assignments, error: assignmentsError } = await supabase
        .from('worker_assignments')
        .select('worker_id')
        .eq('restaurant_id', restaurant.id);

      if (assignmentsError) throw assignmentsError;

      const assignedWorkerIds = new Set(assignments?.map(a => a.worker_id) || []);

      // Combine the data
      const workersWithStatus: WorkerWithAssignment[] = (allWorkers || []).map(worker => ({
        ...worker,
        isAssigned: assignedWorkerIds.has(worker.id),
      }));

      setWorkers(workersWithStatus);
    } catch (err: any) {
      console.error('Error loading workers:', err);
      setError('Failed to load workers');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAssignment(worker: WorkerWithAssignment) {
    try {
      setUpdating(worker.id);
      setError(null);
      setSuccess(null);

      if (worker.isAssigned) {
        // Remove assignment
        const { error: deleteError } = await supabase
          .from('worker_assignments')
          .delete()
          .eq('worker_id', worker.id)
          .eq('restaurant_id', restaurant.id);

        if (deleteError) throw deleteError;

        setSuccess(`${worker.first_name} ${worker.last_name} removed from ${restaurant.name}`);
      } else {
        // Add assignment
        const { error: insertError } = await supabase
          .from('worker_assignments')
          .insert({
            worker_id: worker.id,
            restaurant_id: restaurant.id,
          });

        if (insertError) throw insertError;

        setSuccess(`${worker.first_name} ${worker.last_name} assigned to ${restaurant.name}`);
      }

      // Refresh the workers list
      await loadWorkers();
      onAssignmentsChange?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error toggling assignment:', err);
      setError(err.message || 'Failed to update assignment');
    } finally {
      setUpdating(null);
    }
  }

  const assignedWorkers = workers.filter(w => w.isAssigned);
  const availableWorkers = workers.filter(w => !w.isAssigned);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Loading workers...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker Assignments - {restaurant.name}</CardTitle>
        <CardDescription>
          Assign workers to this restaurant to include them in the roster
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start gap-2">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        {/* Assigned Workers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">
              Assigned Workers ({assignedWorkers.length})
            </h3>
          </div>
          
          {assignedWorkers.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No workers assigned yet. Assign workers from the list below.
            </p>
          ) : (
            <div className="space-y-2">
              {assignedWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200"
                >
                  <div>
                    <p className="font-medium">
                      {worker.first_name} {worker.last_name}
                    </p>
                    <p className="text-xs text-gray-600">{worker.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAssignment(worker)}
                    disabled={updating === worker.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {updating === worker.id ? (
                      'Removing...'
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Workers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold">
              Available Workers ({availableWorkers.length})
            </h3>
          </div>

          {availableWorkers.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              All workers are assigned to this restaurant.
            </p>
          ) : (
            <div className="space-y-2">
              {availableWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">
                      {worker.first_name} {worker.last_name}
                    </p>
                    <p className="text-xs text-gray-600">{worker.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAssignment(worker)}
                    disabled={updating === worker.id}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    {updating === worker.id ? (
                      'Assigning...'
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Assign
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {workers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No workers found</p>
            <p className="text-sm">Create worker accounts to assign them to restaurants</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
