-- ============================================================================
-- 0. CLEAN SLATE (RUN THIS FIRST TO WIPE OLD DATA)
-- ============================================================================

-- 1. Drop Triggers on SYSTEM tables (Must be done explicitly)
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Drop Functions (Logic)
drop function if exists public.handle_new_user();
drop function if exists public.is_availability_open(date);
drop function if exists public.enforce_shift_constraints();

-- 3. Drop Tables (CASCADE automatically removes table-triggers and policies)
drop table if exists public.weekly_reports cascade;
drop table if exists public.shifts cascade;
drop table if exists public.availability cascade;
drop table if exists public.restaurants cascade;
drop table if exists public.profiles cascade;

-- 4. Drop Types
drop type if exists shift_status cascade;
drop type if exists user_role cascade;

-- ============================================================================
-- 1. SETUP EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist";

-- ============================================================================
-- 2. ENUMS
-- ============================================================================
create type user_role as enum ('super_admin', 'worker');
create type shift_status as enum ('draft', 'published');

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- PROFILES
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  role user_role not null default 'worker',
  avatar_url text,
  created_at timestamptz default now()
);

-- RESTAURANTS
create table public.restaurants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  timezone text not null default 'Australia/Sydney',
  created_at timestamptz default now()
);

-- AVAILABILITY
create table public.availability (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  can_work_morning boolean not null default true,
  can_work_afternoon boolean not null default true,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- SHIFTS
create table public.shifts (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  worker_id uuid references public.profiles(id) on delete cascade not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status shift_status default 'draft',
  created_at timestamptz default now(),
  
  -- Prevent double booking globally
  exclude using gist (
    worker_id with =,
    tstzrange(start_time, end_time) with &&
  ),
  
  check (end_time > start_time)
);

-- WEEKLY REPORTS
create table public.weekly_reports (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  week_start_date date not null,
  week_end_date date not null,
  summary_data jsonb not null,
  total_hours decimal(10, 2) not null,
  created_at timestamptz default now(),
  unique(restaurant_id, week_start_date)
);

-- ============================================================================
-- 4. TRIGGERS & FUNCTIONS
-- ============================================================================

-- A. AUTO-CREATE PROFILE
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'User'),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'worker'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- B. LOCKOUT LOGIC
create or replace function public.is_availability_open(target_date date)
returns boolean as $$
declare
  week_start date;
  lockout_time timestamptz;
  current_ts timestamptz;
begin
  -- Get Monday of the target week
  week_start := target_date - ((extract(dow from target_date)::int + 6) % 7);
  -- Lockout is Saturday 11pm of the PREVIOUS week
  lockout_time := (week_start - interval '1 day')::timestamptz + time '23:00:00';
  
  current_ts := now();
  
  return current_ts < lockout_time;
end;
$$ language plpgsql;

-- C. SHIFT CONSTRAINTS
create or replace function public.enforce_shift_constraints()
returns trigger as $$
declare
  start_hour int;
  end_hour int;
  end_minute int;
begin
  start_hour := extract(hour from new.start_time at time zone 'Australia/Sydney');
  end_hour := extract(hour from new.end_time at time zone 'Australia/Sydney');
  end_minute := extract(minute from new.end_time at time zone 'Australia/Sydney');
  
  if start_hour < 8 then
    raise exception 'Shifts must start at or after 08:00';
  end if;
  
  if end_hour > 23 or (end_hour = 23 and end_minute > 0) then
    raise exception 'Shifts must end at or before 23:00';
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger check_shift_times
  before insert or update on public.shifts
  for each row execute procedure public.enforce_shift_constraints();

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.availability enable row level security;
alter table public.shifts enable row level security;
alter table public.weekly_reports enable row level security;

-- SUPER ADMIN POLICIES
create policy "Super Admin: Full access to profiles"
  on public.profiles for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

create policy "Super Admin: Full access to restaurants"
  on public.restaurants for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

create policy "Super Admin: Full access to availability"
  on public.availability for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

create policy "Super Admin: Full access to shifts"
  on public.shifts for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

create policy "Super Admin: Full access to weekly_reports"
  on public.weekly_reports for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

-- WORKER POLICIES

-- Profiles
create policy "Workers: View own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Workers: Update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = 'worker'); 

-- Restaurants
create policy "Workers: View all restaurants"
  on public.restaurants for select
  using (auth.uid() is not null);

-- Availability
create policy "Workers: View own availability"
  on public.availability for select
  using (user_id = auth.uid());

create policy "Workers: Insert availability (Time Locked)"
  on public.availability for insert
  with check (user_id = auth.uid() and public.is_availability_open(date));

create policy "Workers: Update availability (Time Locked)"
  on public.availability for update
  using (user_id = auth.uid() and public.is_availability_open(date))
  with check (user_id = auth.uid() and public.is_availability_open(date));

create policy "Workers: Delete availability (Time Locked)"
  on public.availability for delete
  using (user_id = auth.uid() and public.is_availability_open(date));

-- Shifts
create policy "Workers: View own published shifts"
  on public.shifts for select
  using (worker_id = auth.uid() and status = 'published');

-- Reports
create policy "Workers: View reports for all restaurants"
  on public.weekly_reports for select
  using (auth.uid() is not null);

-- ============================================================================
-- 6. INDEXES
-- ============================================================================
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_role on public.profiles(role);
create index idx_availability_user_date on public.availability(user_id, date);
create index idx_shifts_worker on public.shifts(worker_id);
create index idx_shifts_restaurant on public.shifts(restaurant_id);
create index idx_shifts_start_time on public.shifts(start_time);
create index idx_shifts_status on public.shifts(status);
create index idx_weekly_reports_restaurant on public.weekly_reports(restaurant_id);
create index idx_weekly_reports_week on public.weekly_reports(week_start_date);

-- ============================================================================
-- 7. HELPER VIEWS
-- ============================================================================
create or replace view public.worker_roster_view as
select 
  p.id as worker_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role
from public.profiles p
where p.role = 'worker';