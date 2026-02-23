'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Archive as ArchiveIcon, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateISO, getShortDayName, getDatesInWeek } from '@/utils/date-utils';
import { Shift, Profile, Restaurant, WeekBoundary } from '@/types/database';
import { AdminNav } from '@/components/layout/AdminNav';

interface ArchivedWeek {
  weekStart: Date;
  weekEnd: Date;
  label: string;
}

export default function ArchivePage() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [availableWeeks, setAvailableWeeks] = useState<ArchivedWeek[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [shifts, setShifts] = useState<(Shift & { worker_profile?: Profile })[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (role !== 'super_admin') {
        router.push('/worker');
      } else {
        loadRestaurants();
        generateAvailableWeeks();
      }
    }
  }, [user, role, authLoading]);

  useEffect(() => {
    if (selectedRestaurant && availableWeeks.length > 0) {
      loadArchivedData();
    }
  }, [selectedRestaurant, selectedWeekIndex]);

  async function generateAvailableWeeks() {
    try {
      // Find the earliest shift in the database
      const { data: earliestShift, error } = await supabase
        .from('shifts')
        .select('start_time')
        .order('start_time', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (!earliestShift || earliestShift.length === 0) {
        // No shifts yet, just show current week
        setAvailableWeeks([]);
        return;
      }

      const firstShiftDate = new Date(earliestShift[0].start_time);
      const today = new Date();
      
      // Find the Monday of the week containing the first shift
      const firstShiftDay = firstShiftDate.getDay();
      const daysFromMonday = firstShiftDay === 0 ? 6 : firstShiftDay - 1;
      const firstWeekStart = new Date(firstShiftDate);
      firstWeekStart.setDate(firstShiftDate.getDate() - daysFromMonday);
      firstWeekStart.setHours(0, 0, 0, 0);
      
      // Find the Sunday of the most recent completed week
      const todayDay = today.getDay();
      const daysToLastSunday = todayDay === 0 ? 7 : todayDay;
      const lastCompletedWeekEnd = new Date(today);
      lastCompletedWeekEnd.setDate(today.getDate() - daysToLastSunday);
      lastCompletedWeekEnd.setHours(23, 59, 59, 999);
      
      // Generate all weeks from first week to last completed week
      const weeks: ArchivedWeek[] = [];
      let currentWeekStart = new Date(firstWeekStart);
      
      while (currentWeekStart <= lastCompletedWeekEnd) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        weeks.push({
          weekStart: new Date(currentWeekStart),
          weekEnd: new Date(weekEnd),
          label: `${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`,
        });
        
        // Move to next week
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }
      
      // Reverse so most recent weeks are first
      weeks.reverse();
      
      setAvailableWeeks(weeks);
    } catch (error) {
      console.error('Error generating available weeks:', error);
      setAvailableWeeks([]);
    }
  }

  async function loadRestaurants() {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');

      if (error) throw error;

      setRestaurants(data || []);
      if (data && data.length > 0) {
        setSelectedRestaurant(data[0].id);
      }
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadArchivedData() {
    if (!selectedRestaurant || availableWeeks.length === 0) return;

    try {
      setLoading(true);
      const selectedWeek = availableWeeks[selectedWeekIndex];
      
      // Create end of week timestamp
      const weekEndTimestamp = new Date(selectedWeek.weekEnd);
      weekEndTimestamp.setHours(23, 59, 59, 999);

      // Load all workers
      const { data: workerData, error: workerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'worker')
        .order('first_name');

      if (workerError) throw workerError;
      setWorkers(workerData || []);

      // Load shifts for the selected week and restaurant
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('restaurant_id', selectedRestaurant)
        .gte('start_time', selectedWeek.weekStart.toISOString())
        .lte('start_time', weekEndTimestamp.toISOString())
        .order('start_time');

      if (shiftError) throw shiftError;

      // Attach worker profiles to shifts
      const shiftsWithProfiles = (shiftData || []).map(shift => {
        const worker = workerData?.find(w => w.id === shift.worker_id);
        return { ...shift, worker_profile: worker };
      });

      setShifts(shiftsWithProfiles);
    } catch (error) {
      console.error('Error loading archived data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: Date) {
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  function getShiftsForCell(workerId: string, date: Date): (Shift & { worker_profile?: Profile })[] {
    const dateStr = formatDateISO(date);
    return shifts.filter((s) => {
      const shiftDate = formatDateISO(new Date(s.start_time));
      return s.worker_id === workerId && shiftDate === dateStr;
    });
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedWeek = availableWeeks[selectedWeekIndex];
  const weekDates = selectedWeek ? getDatesInWeek({ start: selectedWeek.weekStart, end: selectedWeek.weekEnd }) : [];
  const currentRestaurant = restaurants.find(r => r.id === selectedRestaurant);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <AdminNav onSignOut={signOut} />

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary flex items-center gap-3">
              <ArchiveIcon className="w-8 h-8" />
              Roster Archive
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              View past weeks' roster snapshots
            </p>
          </div>

        {/* Controls */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Restaurant Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Restaurant</label>
                <select
                  value={selectedRestaurant}
                  onChange={(e) => setSelectedRestaurant(e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Week Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Week</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedWeekIndex(Math.min(selectedWeekIndex + 1, availableWeeks.length - 1))}
                    disabled={selectedWeekIndex >= availableWeeks.length - 1}
                    className="shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <select
                    value={selectedWeekIndex}
                    onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
                    className="flex-1 h-10 rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {availableWeeks.map((week, index) => (
                      <option key={index} value={index}>
                        {week.label}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedWeekIndex(Math.max(selectedWeekIndex - 1, 0))}
                    disabled={selectedWeekIndex <= 0}
                    className="shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archived Roster Grid */}
        {selectedWeek && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-muted/50">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {currentRestaurant?.name} - {selectedWeek.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {workers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No workers found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[1000px]">
                    {/* Header */}
                    <div className="grid grid-cols-8 gap-3 mb-4 pb-3 border-b-2 border-primary/20">
                      <div className="font-bold text-base p-3 bg-primary text-primary-foreground rounded-lg">
                        Worker
                      </div>
                      {weekDates.map((date) => (
                        <div key={date.toISOString()} className="font-bold text-sm p-3 text-center bg-muted/50 rounded-lg border border-primary/30">
                          <div className="text-foreground">{getShortDayName(date)}</div>
                          <div className="text-xs text-primary mt-1">{date.getDate()}</div>
                        </div>
                      ))}
                    </div>

                    {/* Worker Rows */}
                    {workers.map((worker) => (
                      <div key={worker.id} className="grid grid-cols-8 gap-3 mb-3">
                        {/* Worker Name */}
                        <div className="p-3 font-semibold text-sm flex items-center bg-muted/30 rounded-lg border-2 border-border">
                          <div className="flex items-center gap-2 min-w-0 w-full">
                            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                              {worker.first_name[0]}{worker.last_name[0]}
                            </div>
                            <span className="truncate">{worker.first_name} {worker.last_name}</span>
                          </div>
                        </div>

                        {/* Day Cells */}
                        {weekDates.map((date) => {
                          const cellShifts = getShiftsForCell(worker.id, date);

                          return (
                            <div
                              key={`${worker.id}-${date.toISOString()}`}
                              className="min-h-[100px] p-2 rounded-xl border bg-muted/10"
                            >
                              <div className="space-y-1">
                                {cellShifts.map((shift) => (
                                  <div
                                    key={shift.id}
                                    className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-xs"
                                  >
                                    <div className="font-semibold text-primary">
                                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {shift.status === 'published' ? '✓ Published' : '○ Draft'}
                                    </div>
                                  </div>
                                ))}
                                {cellShifts.length === 0 && (
                                  <div className="text-xs text-muted-foreground text-center py-3">
                                    No shifts
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
              )}
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
