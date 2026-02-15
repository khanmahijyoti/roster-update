// Date utility functions for roster management
// All dates use Australia/Sydney timezone as per spec

import { WeekBoundary } from '@/types/database';

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get the end of the week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999); // Set to end of Sunday
  return end;
}

/**
 * Get the current week boundary (Monday - Sunday containing today)
 * Special case: After Saturday 23:00, "current week" is next Monday-Sunday
 */
export function getCurrentWeek(): WeekBoundary {
  const now = new Date();
  
  // Check if we're after Saturday 23:00 of current week
  if (isAfterSaturdayLockout()) {
    // Return next week as "current week"
    const nextMonday = new Date(getWeekStart(now));
    nextMonday.setDate(nextMonday.getDate() + 7);
    return {
      start: nextMonday,
      end: getWeekEnd(nextMonday),
    };
  }
  
  return {
    start: getWeekStart(now),
    end: getWeekEnd(now),
  };
}

/**
 * Get the next week boundary (Monday - Sunday after current week)
 * Special case: After Saturday 23:00, "next week" is week after next
 */
export function getNextWeek(): WeekBoundary {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  
  // Check if we're after Saturday 23:00
  if (isAfterSaturdayLockout()) {
    // Return week after next as "next week"
    const nextNextMonday = new Date(currentWeekStart);
    nextNextMonday.setDate(currentWeekStart.getDate() + 14);
    return {
      start: nextNextMonday,
      end: getWeekEnd(nextNextMonday),
    };
  }
  
  // Normal case: return next week
  const nextMonday = new Date(currentWeekStart);
  nextMonday.setDate(currentWeekStart.getDate() + 7);
  return {
    start: nextMonday,
    end: getWeekEnd(nextMonday),
  };
}

/**
 * Helper function to check if we're after Saturday 23:00 of current calendar week
 */
function isAfterSaturdayLockout(): boolean {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  
  // Calculate Saturday 23:00 of current calendar week
  const lockoutTime = new Date(currentWeekStart);
  lockoutTime.setDate(currentWeekStart.getDate() + 5); // Saturday (Monday + 5 days)
  lockoutTime.setHours(23, 0, 0, 0);
  
  return now >= lockoutTime;
}

/**
 * Check if availability editing is locked (after Saturday 23:00)
 * This function checks if the lockout time for editing the displayed "next week" has passed
 */
export function isAvailabilityLocked(): boolean {
  // Get the displayed next week (which shifts after Saturday 23:00)
  const nextWeek = getNextWeek();
  const now = new Date();
  
  // Calculate Saturday 23:00 of the week BEFORE the displayed next week
  // This is the lockout time for editing that next week's availability
  const lockoutWeekStart = new Date(nextWeek.start);
  lockoutWeekStart.setDate(lockoutWeekStart.getDate() - 7); // Go back to previous week
  
  const lockoutTime = new Date(lockoutWeekStart);
  lockoutTime.setDate(lockoutWeekStart.getDate() + 5); // Saturday
  lockoutTime.setHours(23, 0, 0, 0);
  
  return now >= lockoutTime;
}

/**
 * Check if a specific date can be edited for availability
 */
export function canEditAvailability(date: Date): boolean {
  const nextWeek = getNextWeek();
  
  // Compare just the date part (ignore time)
  const dateStr = formatDateISO(date);
  const startStr = formatDateISO(nextWeek.start);
  const endStr = formatDateISO(nextWeek.end);
  
  // Date must be within next week
  if (dateStr < startStr || dateStr > endStr) {
    return false;
  }
  
  // Check if we're past the lockout time
  return !isAvailabilityLocked();
}

/**
 * Format date as YYYY-MM-DD (for database)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get day name from date
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-AU', { weekday: 'long' });
}

/**
 * Get short day name from date
 */
export function getShortDayName(date: Date): string {
  return date.toLocaleDateString('en-AU', { weekday: 'short' });
}

/**
 * Format time as HH:MM
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-AU', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

/**
 * Calculate hours between two timestamps
 */
export function calculateHours(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Check if shift is within allowed hours (08:00 - 23:00)
 */
export function isValidShiftTime(startTime: Date, endTime: Date): boolean {
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();
  const endMinute = endTime.getMinutes();
  
  // Start must be >= 08:00
  if (startHour < 8) return false;
  
  // End must be <= 23:00
  if (endHour > 23 || (endHour === 23 && endMinute > 0)) return false;
  
  return true;
}

/**
 * Get all dates in a week boundary
 */
export function getDatesInWeek(week: WeekBoundary): Date[] {
  const dates: Date[] = [];
  const current = new Date(week.start);
  
  while (current <= week.end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}
