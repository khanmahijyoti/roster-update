'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShiftCard } from './ShiftCard';
import { TimeRangePicker } from './TimeRangePicker';
import { Label } from '@/components/ui/label';
import { Plus, Save, X } from 'lucide-react';
import { Shift, Profile, Availability, WeekBoundary } from '@/types/database';
import { getDatesInWeek, getShortDayName, formatDateISO, isValidShiftTime } from '@/utils/date-utils';
import { createClient } from '@/lib/supabase/client';

interface WorkerWithAvailability extends Profile {
  availability: Map<string, Availability>; // key: date string
  shifts: Shift[];
  hasConflict: Map<string, boolean>; // key: date string - true if worker has shift elsewhere
}

interface RosterGridProps {
  week: WeekBoundary;
  restaurantId: string;
  onShiftsChange?: () => void;
}

interface NewShift {
  shiftId?: string; // For editing existing shifts
  workerId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export function RosterGrid({ week, restaurantId, onShiftsChange }: RosterGridProps) {
  const [workers, setWorkers] = useState<WorkerWithAvailability[]>([]);
  const [shifts, setShifts] = useState<(Shift & { worker_profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingShift, setEditingShift] = useState<NewShift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ workerId: string; date: string } | null>(null);

  const supabase = createClient();
  const weekDates = getDatesInWeek(week);

  useEffect(() => {
    loadRosterData();
  }, [week, restaurantId]);

  async function loadRosterData() {
    try {
      setLoading(true);
      setError(null);

      // 1. Get all workers in the system (global)
      const { data: workerProfiles, error: workersError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, avatar_url, created_at')
        .eq('role', 'worker');

      if (workersError) throw workersError;

      // 2. Get availability for the week
      const startDate = formatDateISO(week.start);
      const endDate = formatDateISO(week.end);

      const { data: availabilities, error: availError } = await supabase
        .from('availability')
        .select('*')
        .in('user_id', (workerProfiles || []).map((w) => w.id))
        .gte('date', startDate)
        .lte('date', endDate);

      if (availError) throw availError;

      // 3. Get all shifts for this week (all restaurants to check conflicts)
      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('worker_id', (workerProfiles || []).map((w) => w.id))
        .gte('start_time', week.start.toISOString())
        .lte('start_time', week.end.toISOString());

      if (shiftsError) throw shiftsError;

      // Attach worker profiles to shifts
      const shiftsWithProfiles = (allShifts || []).map(shift => {
        const worker = workerProfiles?.find(w => w.id === shift.worker_id);
        return { ...shift, worker_profile: worker };
      });

      // 4. Get shifts for THIS restaurant specifically
      const restaurantShifts = shiftsWithProfiles.filter((s) => s.restaurant_id === restaurantId);
      setShifts(restaurantShifts);

      // 5. Build worker data with availability and conflicts
      const workersWithData: WorkerWithAvailability[] = (workerProfiles || []).map((worker) => {
        const availMap = new Map<string, Availability>();
        availabilities
          ?.filter((a) => a.user_id === worker.id)
          .forEach((a) => {
            availMap.set(a.date, a);
          });

        const workerShifts = shiftsWithProfiles.filter((s) => s.worker_id === worker.id);
        const conflictMap = new Map<string, boolean>();

        // Check for conflicts (shifts at OTHER restaurants)
        workerShifts.forEach((shift) => {
          if (shift.restaurant_id !== restaurantId) {
            const shiftDate = formatDateISO(new Date(shift.start_time));
            conflictMap.set(shiftDate, true);
          }
        });

        return {
          ...worker,
          availability: availMap,
          shifts: workerShifts.filter((s) => s.restaurant_id === restaurantId),
          hasConflict: conflictMap,
        };
      });

      setWorkers(workersWithData);
    } catch (err) {
      console.error('Error loading roster data:', err);
      setError('Failed to load roster data');
    } finally {
      setLoading(false);
    }
  }

  function getAvailabilityStatus(
    worker: WorkerWithAvailability,
    date: Date
  ): 'available' | 'warning' | 'busy' {
    const dateStr = formatDateISO(date);

    // Check if worker has shift at another restaurant
    if (worker.hasConflict.get(dateStr)) {
      return 'busy';
    }

    const avail = worker.availability.get(dateStr);

    // No availability record = available (opt-out model from spec)
    if (!avail) {
      return 'available';
    }

    // Check if worker marked unavailable
    if (!avail.can_work_morning && !avail.can_work_afternoon) {
      return 'busy'; // Worker is unavailable - block assignment
    }

    return 'available';
  }

  function getShiftsForCell(workerId: string, date: Date): (Shift & { worker_profile?: Profile })[] {
    const dateStr = formatDateISO(date);
    return shifts.filter((s) => {
      const shiftDate = formatDateISO(new Date(s.start_time));
      return s.worker_id === workerId && shiftDate === dateStr;
    });
  }

  function handleCellClick(workerId: string, date: Date) {
    const dateStr = formatDateISO(date);
    const worker = workers.find(w => w.id === workerId);
    
    if (!worker) return;
    
    const status = getAvailabilityStatus(worker, date);
    
    // Prevent creating shifts when worker is busy or unavailable
    if (status === 'busy') {
      const avail = worker.availability.get(dateStr);
      
      // Check if it's a conflict or unavailability
      if (worker.hasConflict.get(dateStr)) {
        setError('Cannot create shift: Worker has conflict at another restaurant');
      } else if (avail && !avail.can_work_morning && !avail.can_work_afternoon) {
        setError('Cannot create shift: Worker marked themselves unavailable');
      } else {
        setError('Cannot create shift: Worker is unavailable');
      }
      return;
    }

    setSelectedCell({ workerId, date: dateStr });
    setEditingShift({
      workerId,
      date: dateStr,
      startTime: '09:00',
      endTime: '17:00',
    });
  }

  function handleEditShift(shift: Shift) {
    const startDate = new Date(shift.start_time);
    const endDate = new Date(shift.end_time);
    
    setEditingShift({
      shiftId: shift.id,
      workerId: shift.worker_id,
      date: formatDateISO(startDate),
      startTime: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
    });
    setSelectedCell({ workerId: shift.worker_id, date: formatDateISO(startDate) });
  }

  async function handleSaveShift() {
    if (!editingShift) return;

    try {
      setError(null);

      // Build full timestamps
      const startDateTime = new Date(`${editingShift.date}T${editingShift.startTime}:00`);
      const endDateTime = new Date(`${editingShift.date}T${editingShift.endTime}:00`);

      // Validate times
      if (!isValidShiftTime(startDateTime, endDateTime)) {
        setError('Shifts must be between 08:00 and 23:00');
        return;
      }

      if (endDateTime <= startDateTime) {
        setError('End time must be after start time');
        return;
      }

      if (editingShift.shiftId) {
        // Update existing shift
        const { data, error: updateError } = await supabase
          .from('shifts')
          .update({
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
          })
          .eq('id', editingShift.shiftId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Get worker profile from our loaded workers
        const worker = workers.find(w => w.id === editingShift.workerId);
        const updatedShift = { ...data, worker_profile: worker };

        // Update in local state
        setShifts(shifts.map(s => s.id === editingShift.shiftId ? updatedShift : s));
      } else {
        // Create new shift
        const { data, error: insertError } = await supabase
          .from('shifts')
          .insert({
            restaurant_id: restaurantId,
            worker_id: editingShift.workerId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            status: 'draft',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Get worker profile from our loaded workers
        const worker = workers.find(w => w.id === editingShift.workerId);
        const newShift = { ...data, worker_profile: worker };

        // Add to local state
        setShifts([...shifts, newShift]);
      }

      setEditingShift(null);
      setSelectedCell(null);
      onShiftsChange?.();
    } catch (err: any) {
      console.error('Error saving shift:', err);
      // Check if error is from shift overlap constraint
      if (err.message?.includes('exclude') || err.message?.includes('conflict')) {
        setError('Shift conflicts with another shift for this worker');
      } else if (err.code === 'PGRST116') {
        setError('Database connection error. Please try again.');
      } else {
        setError(err.message || 'Failed to save shift. Please try again.');
      }
    }
  }

  async function handleDeleteShift(shiftId: string) {
    try {
      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

      if (deleteError) throw deleteError;

      setShifts(shifts.filter((s) => s.id !== shiftId));
      onShiftsChange?.();
    } catch (err) {
      console.error('Error deleting shift:', err);
      setError('Failed to delete shift');
    }
  }

  function handleCancelEdit() {
    setEditingShift(null);
    setSelectedCell(null);
    setError(null);
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">Loading roster...</p>
      </Card>
    );
  }

  if (workers.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">
          No workers found in this restaurant. Add workers to start building the roster.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 text-red-700 px-6 py-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-100 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <h4 className="font-bold text-sm sm:text-base mb-3 text-purple-900">Availability Legend</h4>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex-shrink-0 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 shadow-sm"></div>
              <span className="font-medium">🟢 Available - Worker is available and free</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex-shrink-0 rounded-lg bg-gradient-to-br from-red-400 to-pink-500 shadow-sm"></div>
              <span className="font-medium">🔴 Unavailable - Worker marked unavailable OR has shift elsewhere</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Shift Dialog */}
      {editingShift && (
        <Card className="border-2 border-purple-500 bg-white shadow-2xl">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {editingShift.shiftId ? 'Edit Shift' : 'Create New Shift'}
              </h3>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="hover:bg-red-50">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-5">
              <div className="bg-purple-50 p-4 rounded-xl">
                <Label className="text-xs font-semibold text-purple-900">WORKER</Label>
                <p className="text-base font-bold mt-1">
                  {workers.find((w) => w.id === editingShift.workerId)?.first_name}{' '}
                  {workers.find((w) => w.id === editingShift.workerId)?.last_name}
                </p>
              </div>

              <div className="bg-indigo-50 p-4 rounded-xl">
                <Label className="text-xs font-semibold text-indigo-900">DATE</Label>
                <p className="text-base font-bold mt-1">
                  {new Date(editingShift.date).toLocaleDateString('en-AU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <TimeRangePicker
                startTime={editingShift.startTime}
                endTime={editingShift.endTime}
                onStartTimeChange={(time) => setEditingShift({ ...editingShift, startTime: time })}
                onEndTimeChange={(time) => setEditingShift({ ...editingShift, endTime: time })}
                error={error || undefined}
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button onClick={handleSaveShift} className="h-12 text-base font-semibold shadow-lg">
                  <Save className="w-5 h-5 mr-2" />
                  {editingShift.shiftId ? 'Update' : 'Create'}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit} className="h-12 text-base font-semibold">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roster Grid */}
      <div className="space-y-2">
        {/* Mobile scroll hint */}
        <div className="sm:hidden text-xs text-purple-600 font-medium px-2 flex items-center gap-2">
          <span>👉</span>
          <span>Swipe left/right to see all days</span>
        </div>
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border-2 border-purple-100">
          <div className="min-w-[1000px] p-4">
          {/* Header */}
          <div className="grid grid-cols-8 gap-3 mb-4 pb-3 border-b-2 border-purple-100">
            <div className="font-bold text-base p-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg">
              Worker
            </div>
            {weekDates.map((date) => (
              <div key={date.toISOString()} className="font-bold text-sm p-3 text-center bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <div className="text-purple-900">{getShortDayName(date)}</div>
                <div className="text-xs text-purple-600 mt-1">{date.getDate()}</div>
              </div>
            ))}
          </div>

          {/* Worker Rows */}
          {workers.map((worker) => (
            <div key={worker.id} className="grid grid-cols-8 gap-3 mb-3">
              {/* Worker Name */}
              <div className="p-3 font-semibold text-sm flex items-center bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border-2 border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0 w-full">
                  <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                    {worker.first_name[0]}{worker.last_name[0]}
                  </div>
                  <span className="truncate">{worker.first_name} {worker.last_name}</span>
                </div>
              </div>

              {/* Day Cells */}
              {weekDates.map((date) => {
                const cellShifts = getShiftsForCell(worker.id, date);
                const status = getAvailabilityStatus(worker, date);
                const isSelected =
                  selectedCell?.workerId === worker.id &&
                  selectedCell?.date === formatDateISO(date);

                return (
                  <div
                    key={`${worker.id}-${date.toISOString()}`}
                    className={`min-h-[120px] p-3 rounded-xl border-2 transition-all shadow-sm hover:shadow-md ${
                      isSelected
                        ? 'border-purple-500 shadow-lg scale-105'
                        : status === 'available'
                        ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50'
                        : 'border-red-300 bg-gradient-to-br from-red-50 to-pink-50'
                    }`}
                  >
                    <div className="space-y-2">
                      {cellShifts.map((shift) => (
                        <ShiftCard
                          key={shift.id}
                          shift={shift}
                          onEdit={handleEditShift}
                          onDelete={handleDeleteShift}
                          statusIndicator={status}
                        />
                      ))}

                      {/* Add Shift Button */}
                      {status !== 'busy' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCellClick(worker.id, date)}
                          className="w-full bg-white hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-400 font-semibold transition-all"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Shift
                        </Button>
                      )}

                      {status === 'busy' && (
                        <div className="text-xs text-red-700 font-semibold text-center bg-red-100 px-2 py-1 rounded-lg">
                          ⚠️ Unavailable
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
