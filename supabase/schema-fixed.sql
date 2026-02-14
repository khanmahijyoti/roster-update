-- Roster Management System - Database Schema v1.1
-- Run this script in your Supabase SQL Editor
-- FIXED: Resolves circular dependency issues

-- 1. Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist"; -- Required for global shift conflict detection

-- 2. Create custom types
create type user_role as enum ('super_admin', 'admin', 'worker');
create type shift_status as enum ('draft', 'published');

-- 3. PROFILES TABLE (Global Identity)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- 4. RESTAURANTS TABLE (Tenants)
create table public.restaurants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  timezone text not null default 'Australia/Sydney',
  created_at timestamptz default now()
);

-- 5. RESTAURANT_MEMBERS TABLE (Access Control)
create table public.restaurant_members (
  user_id uuid references public.profiles(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  role user_role not null default 'worker',
  primary key (user_id, restaurant_id)
);

-- 6. AVAILABILITY TABLE (Worker Input)
create table public.availability (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  date date not null,
  
  -- FALSE = Worker is UNAVAILABLE for this period
  -- TRUE = Worker is available (explicit confirmation)
  -- NULL row = Available (implicit default)
  can_work_morning boolean not null default true,   -- 08:00 - 14:00
  can_work_afternoon boolean not null default true, -- 14:00 - 23:00
  
  unique(user_id, date)
);

-- 7. SHIFTS TABLE (The Roster)
create table public.shifts (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) not null,
  worker_id uuid references public.profiles(id) not null,
  
  start_time timestamptz not null,
  end_time timestamptz not null,
  
  -- draft = Admin is building roster (hidden from workers)
  -- published = Workers can see this shift
  status shift_status default 'draft',
  created_at timestamptz default now(),

  -- CONSTRAINT: No overlapping shifts for same worker across ALL restaurants
  exclude using gist (
    worker_id with =, 
    tstzrange(start_time, end_time) with &&
  ),

  -- CONSTRAINT: End > Start
  check (end_time > start_time)
);

-- 8. WEEKLY_REPORTS TABLE (Frozen Snapshot)
create table public.weekly_reports (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id),
  week_start_date date not null, -- Always a Monday
  week_end_date date not null,   -- Always a Sunday
  summary_data jsonb not null,   -- Payroll JSON: {worker_id: {hours, shifts}}
  total_hours decimal(10, 2) not null,
  created_at timestamptz default now(),
  unique(restaurant_id, week_start_date)
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.availability enable row level security;
alter table public.shifts enable row level security;
alter table public.weekly_reports enable row level security;

-- PROFILES POLICIES
create policy "Profiles are viewable by authenticated users" 
  on public.profiles for select 
  to authenticated 
  using (true);

create policy "Users can update own profile" 
  on public.profiles for update 
  to authenticated 
  using (auth.uid() = id);

-- RESTAURANTS POLICIES
create policy "Users can view their restaurants" 
  on public.restaurants for select 
  to authenticated 
  using (
    exists (
      select 1 from public.restaurant_members 
      where restaurant_members.restaurant_id = id 
      and restaurant_members.user_id = auth.uid()
    )
  );

create policy "Super admins can create restaurants" 
  on public.restaurants for insert 
  to authenticated 
  with check (
    exists (
      select 1 from public.restaurant_members 
      where restaurant_members.user_id = auth.uid() 
      and restaurant_members.role = 'super_admin'
    )
  );

-- RESTAURANT_MEMBERS POLICIES
create policy "Users can view members of their restaurants" 
  on public.restaurant_members for select 
  to authenticated 
  using (
    exists (
      select 1 from public.restaurant_members rm 
      where rm.restaurant_id = restaurant_id 
      and rm.user_id = auth.uid()
    )
  );

create policy "Admins can manage members" 
  on public.restaurant_members for all 
  to authenticated 
  using (
    exists (
      select 1 from public.restaurant_members 
      where restaurant_members.restaurant_id = restaurant_id 
      and restaurant_members.user_id = auth.uid() 
      and restaurant_members.role in ('admin', 'super_admin')
    )
  );

-- AVAILABILITY POLICIES
create policy "Workers can manage own availability" 
  on public.availability for all 
  to authenticated 
  using (auth.uid() = user_id);

create policy "Admins can view worker availability" 
  on public.availability for select 
  to authenticated 
  using (
    exists (
      select 1 from public.restaurant_members rm1
      join public.restaurant_members rm2 on rm1.restaurant_id = rm2.restaurant_id
      where rm1.user_id = auth.uid() 
      and rm1.role in ('admin', 'super_admin')
      and rm2.user_id = availability.user_id
    )
  );

-- SHIFTS POLICIES
create policy "Workers can view own published shifts" 
  on public.shifts for select 
  to authenticated 
  using (
    worker_id = auth.uid() 
    and status = 'published'
  );

create policy "Admins can manage restaurant shifts" 
  on public.shifts for all 
  to authenticated 
  using (
    exists (
      select 1 from public.restaurant_members 
      where restaurant_members.restaurant_id = shifts.restaurant_id 
      and restaurant_members.user_id = auth.uid() 
      and restaurant_members.role in ('admin', 'super_admin')
    )
  );

-- WEEKLY_REPORTS POLICIES
create policy "Admins can view restaurant reports" 
  on public.weekly_reports for select 
  to authenticated 
  using (
    exists (
      select 1 from public.restaurant_members 
      where restaurant_members.restaurant_id = weekly_reports.restaurant_id 
      and restaurant_members.user_id = auth.uid() 
      and restaurant_members.role in ('admin', 'super_admin')
    )
  );

-- =====================================================
-- BUSINESS LOGIC TRIGGERS
-- =====================================================

-- Enforce shift time constraints (08:00 - 23:00)
create or replace function enforce_shift_constraints()
returns trigger as $$
declare
  local_start time;
  local_end time;
  rest_tz text;
begin
  -- 1. Get Restaurant Timezone
  select timezone into rest_tz from restaurants where id = new.restaurant_id;

  -- 2. Convert to Local Time
  local_start := (new.start_time at time zone rest_tz)::time;
  local_end := (new.end_time at time zone rest_tz)::time;

  -- 3. Check Operational Hours (08:00 - 23:00)
  if local_start < '08:00:00' or local_end > '23:00:00' then
    raise exception 'Shifts must be between 08:00 and 23:00 local time';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger tr_enforce_hours
  before insert or update on public.shifts
  for each row execute procedure enforce_shift_constraints();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'New User'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

create index idx_availability_user_date on public.availability(user_id, date);
create index idx_shifts_restaurant on public.shifts(restaurant_id);
create index idx_shifts_worker on public.shifts(worker_id);
create index idx_shifts_time_range on public.shifts using gist (tstzrange(start_time, end_time));
create index idx_restaurant_members_user on public.restaurant_members(user_id);
create index idx_restaurant_members_restaurant on public.restaurant_members(restaurant_id);

-- =====================================================
-- DONE! Database is ready to use.
-- =====================================================
