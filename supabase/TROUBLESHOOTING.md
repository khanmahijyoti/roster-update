# 🔧 Supabase Setup Troubleshooting

## Issue: "relation restaurant_members does not exist"

This means the SQL didn't run properly. Here's how to fix it:

## Solution 1: Use the Fixed Schema (RECOMMENDED)

1. **Delete any existing tables** (if you ran the old script):
   - In Supabase dashboard, go to **Table Editor**
   - Delete these tables if they exist: profiles, restaurants, restaurant_members, availability, shifts, weekly_reports
   - Or run this in SQL Editor:
   ```sql
   drop table if exists public.weekly_reports cascade;
   drop table if exists public.shifts cascade;
   drop table if exists public.availability cascade;
   drop table if exists public.restaurant_members cascade;
   drop table if exists public.restaurants cascade;
   drop table if exists public.profiles cascade;
   drop type if exists shift_status cascade;
   drop type if exists user_role cascade;
   ```

2. **Run the fixed schema**:
   - Open `supabase/schema-fixed.sql`
   - Copy ALL of it
   - Go to Supabase → SQL Editor → New Query
   - Paste and click **RUN**

3. **Verify tables were created**:
   - Go to **Table Editor**
   - You should see: profiles, restaurants, restaurant_members, availability, shifts, weekly_reports

## Solution 2: Step-by-Step Setup

If the full script still fails, use the step-by-step version:

1. Open `supabase/schema-step-by-step.sql`
2. Copy **STEP 1** only (extensions and types)
3. Run it in SQL Editor
4. Then copy and run **STEP 2** (tables)
5. Continue with steps 3-6

This way you'll see exactly where it fails.

## Solution 3: Manual Table Creation

If automation fails, create tables manually:

### 1. Create Types First
```sql
create type user_role as enum ('super_admin', 'admin', 'worker');
create type shift_status as enum ('draft', 'published');
```

### 2. Create Tables in Order

**Profiles:**
```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);
```

**Restaurants:**
```sql
create table public.restaurants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  timezone text not null default 'Australia/Sydney',
  created_at timestamptz default now()
);
```

**Restaurant Members:**
```sql
create table public.restaurant_members (
  user_id uuid references public.profiles(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  role user_role not null default 'worker',
  primary key (user_id, restaurant_id)
);
```

**Availability:**
```sql
create table public.availability (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  date date not null,
  can_work_morning boolean not null default true,
  can_work_afternoon boolean not null default true,
  unique(user_id, date)
);
```

**Shifts:**
```sql
create extension if not exists "btree_gist";

create table public.shifts (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) not null,
  worker_id uuid references public.profiles(id) not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status shift_status default 'draft',
  created_at timestamptz default now(),
  check (end_time > start_time)
);
```

**Weekly Reports:**
```sql
create table public.weekly_reports (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id),
  week_start_date date not null,
  week_end_date date not null,
  summary_data jsonb not null,
  total_hours decimal(10, 2) not null,
  created_at timestamptz default now()
);
```

### 3. Enable RLS (for testing - simple version)
```sql
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.availability enable row level security;
alter table public.shifts enable row level security;
alter table public.weekly_reports enable row level security;

-- Allow all for testing
create policy "test_profiles" on public.profiles for all to authenticated using (true);
create policy "test_restaurants" on public.restaurants for all to authenticated using (true);
create policy "test_members" on public.restaurant_members for all to authenticated using (true);
create policy "test_availability" on public.availability for all to authenticated using (true);
create policy "test_shifts" on public.shifts for all to authenticated using (true);
create policy "test_reports" on public.weekly_reports for all to authenticated using (true);
```

### 4. Add Auto-Profile Trigger
```sql
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
```

## Common Errors and Fixes

### Error: "type user_role already exists"
**Fix:** The types already exist, skip creating them or drop first:
```sql
drop type if exists user_role cascade;
drop type if exists shift_status cascade;
```

### Error: "table already exists"
**Fix:** Drop the table first:
```sql
drop table if exists public.table_name cascade;
```

### Error: "extension btree_gist does not exist"
**Fix:** Some Supabase projects need to request this extension. Use this instead:
```sql
-- Skip the GIST constraint for now
create table public.shifts (
  -- ... columns ...
  -- remove the "exclude using gist" line
);
```

### Error: "permission denied"
**Fix:** Make sure you're using the SQL Editor in Supabase (not trying to run from your app)

## Verification Checklist

After running the schema, verify:

- ✅ Go to **Table Editor** → see 6 tables
- ✅ Click **profiles** → has columns: id, email, full_name, avatar_url, created_at
- ✅ Click **restaurants** → has columns: id, name, timezone, created_at
- ✅ Click **restaurant_members** → has columns: user_id, restaurant_id, role
- ✅ Click **availability** → has columns: id, user_id, date, can_work_morning, can_work_afternoon
- ✅ Click **shifts** → has columns: id, restaurant_id, worker_id, start_time, end_time, status, created_at
- ✅ Click **weekly_reports** → has columns: id, restaurant_id, week_start_date, week_end_date, summary_data, total_hours, created_at

## Still Having Issues?

1. **Screenshot the error** from Supabase SQL Editor
2. Check which table is mentioned in the error
3. Manually create that table first using the SQL above
4. Then try running the rest

## Quick Test

After setup, test if it works:

1. Sign up in your app
2. Go to Supabase → **Table Editor** → **profiles**
3. You should see your new user profile automatically created!

If this works, your database is ready! 🎉
