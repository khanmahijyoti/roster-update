// Database Types for Single-Admin System

export type UserRole = 'super_admin' | 'worker';
export type ShiftStatus = 'draft' | 'published';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole; // Role is now on the profile directly
  avatar_url?: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
}

// Replaces RestaurantMember - simpler table
export interface WorkerAssignment {
  worker_id: string;
  restaurant_id: string;
  created_at: string;
}

export interface Availability {
  id: string;
  user_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  can_work_morning: boolean;
  can_work_afternoon: boolean;
}

export interface Shift {
  id: string;
  restaurant_id: string;
  worker_id: string;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  status: ShiftStatus;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  restaurant_id: string;
  week_start_date: string; // ISO date string (Monday)
  week_end_date: string; // ISO date string (Sunday)
  summary_data: {
    [worker_id: string]: {
      hours: number;
      shifts: Array<{
        date: string;
        start_time: string;
        end_time: string;
      }>;
    };
  };
  total_hours: number;
  created_at: string;
}

// UI Helper Types

export interface AvailabilityInput {
  date: string;
  morning: boolean;
  afternoon: boolean;
}

export interface ShiftWithWorker extends Shift {
  worker: Profile;
}

export interface ShiftWithRestaurant extends Shift {
  restaurant: Restaurant;
}

export type WeekBoundary = {
  start: Date; // Monday
  end: Date; // Sunday
};

export type AvailabilityStatus = 'available' | 'unavailable' | 'partial';
export type ConflictStatus = 'available' | 'preference_warning' | 'globally_busy';
