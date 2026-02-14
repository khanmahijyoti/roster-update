-- STEP-BY-STEP SETUP FOR SUPABASE
-- Copy and run each section separately if you encounter errors

-- =====================================================
-- STEP 1: Extensions and Types
-- =====================================================
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist";

create type user_role as enum ('super_admin', 'admin', 'worker');
create type shift_status as enum ('draft', 'published');

-- =====================================================
-- STEP 2: Create Tables (NO RLS YET)
-- =====================================================

-- Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Restaurants
create table public.restaurants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  timezone text not null default 'Australia/Sydney',
  created_at timestamptz default now()
);

-- Restaurant Members
create table public.restaurant_members (
  user_id uuid references public.profiles(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  role user_role not null default 'worker',
  primary key (user_id, restaurant_id)
);

-- Availability
create table public.availability (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  date date not null,
  can_work_morning boolean not null default true,
  can_work_afternoon boolean not null default true,
  unique(user_id, date)
);

-- Shifts
create table public.shifts (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) not null,
  worker_id uuid references public.profiles(id) not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status shift_status default 'draft',
  created_at timestamptz default now(),
  exclude using gist (
    worker_id with =, 
    tstzrange(start_time, end_time) with &&
  ),
  check (end_time > start_time)
);

-- Weekly Reports
create table public.weekly_reports (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id),
  week_start_date date not null,
  week_end_date date not null,
  summary_data jsonb not null,
  total_hours decimal(10, 2) not null,
  created_at timestamptz default now(),
  unique(restaurant_id, week_start_date)
);

-- =====================================================
-- STEP 3: Create Indexes
-- =====================================================

create index idx_availability_user_date on public.availability(user_id, date);
create index idx_shifts_restaurant on public.shifts(restaurant_id);
create index idx_shifts_worker on public.shifts(worker_id);
create index idx_shifts_time_range on public.shifts using gist (tstzrange(start_time, end_time));
create index idx_restaurant_members_user on public.restaurant_members(user_id);
create index idx_restaurant_members_restaurant on public.restaurant_members(restaurant_id);

-- =====================================================
-- STEP 4: Create Functions
-- =====================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'New User'));
  return new;
end;
$$ language plpgsql security definer;

-- Enforce shift hours
create or replace function enforce_shift_constraints()
returns trigger as $$
declare
  local_start time;
  local_end time;
  rest_tz text;
begin
  select timezone into rest_tz from restaurants where id = new.restaurant_id;
  local_start := (new.start_time at time zone rest_tz)::time;
  local_end := (new.end_time at time zone rest_tz)::time;
  
  if local_start < '08:00:00' or local_end > '23:00:00' then
    raise exception 'Shifts must be between 08:00 and 23:00 local time';
  end if;
  
  return new;
end;
$$ language plpgsql;

-- =====================================================
-- STEP 5: Create Triggers
-- =====================================================

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger tr_enforce_hours
  before insert or update on public.shifts
  for each row execute procedure enforce_shift_constraints();

-- =====================================================
-- STEP 6: Enable RLS (Simple version for testing)
-- =====================================================

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.availability enable row level security;
alter table public.shifts enable row level security;
alter table public.weekly_reports enable row level security;

-- Simple policies for testing (allow authenticated users)
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "restaurants_all" on public.restaurants for all to authenticated using (true);
create policy "members_all" on public.restaurant_members for all to authenticated using (true);
create policy "availability_all" on public.availability for all to authenticated using (true);
create policy "shifts_all" on public.shifts for all to authenticated using (true);
create policy "reports_all" on public.weekly_reports for all to authenticated using (true);

-- Done! This gives you a working setup for testing
-- Later you can drop these policies and add the secure ones from schema-fixed.sql
