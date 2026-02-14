# Migration Guide: Single-Admin Architecture

## Overview

We've simplified the system from a multi-tenant SaaS to a **centralized single-admin** management system. This means:

- ✅ One super admin manages ALL restaurants
- ✅ Workers only see their own shifts
- ✅ Simpler database schema (no complex permission layers)
- ✅ Role stored directly on profile (not in separate table)

## What Changed

### Database Changes

| Old Table | New Table | Change |
|-----------|-----------|--------|
| `restaurant_members` | `worker_assignments` | Simplified - only tracks worker-to-restaurant links, no roles |
| `profiles.full_name` | `profiles.first_name`, `profiles.last_name` | Split into two fields |
| N/A | `profiles.role` | Role now lives on profile directly (`super_admin` or `worker`) |

### Removed

- ❌ `admin` role (only `super_admin` and `worker` now exist)
- ❌ Complex RLS policies for per-restaurant admins
- ❌ `restaurant_members` table

### Added

- ✅ `worker_assignments` table (simpler, just links workers to restaurants)
- ✅ `profiles.role` field (role is now part of the profile)
- ✅ Super admin has god-mode access to all restaurants

## Migration Steps

### Option 1: Fresh Start (Recommended if you have no data)

1. **Drop existing tables** in Supabase SQL Editor:
   ```sql
   DROP TABLE IF EXISTS weekly_reports CASCADE;
   DROP TABLE IF EXISTS shifts CASCADE;
   DROP TABLE IF EXISTS availability CASCADE;
   DROP TABLE IF EXISTS restaurant_members CASCADE;
   DROP TABLE IF EXISTS restaurants CASCADE;
   DROP TABLE IF EXISTS profiles CASCADE;
   DROP TYPE IF EXISTS user_role CASCADE;
   DROP TYPE IF EXISTS shift_status CASCADE;
   DROP FUNCTION IF EXISTS handle_new_user CASCADE;
   DROP FUNCTION IF EXISTS is_availability_open CASCADE;
   DROP FUNCTION IF EXISTS enforce_shift_constraints CASCADE;
   ```

2. **Run the new schema**:
   - Copy contents of `supabase/schema-single-admin.sql`
   - Paste into Supabase SQL Editor
   - Execute

3. **Make yourself super admin**:
   ```sql
   -- After signing up, run this query with your email
   UPDATE profiles 
   SET role = 'super_admin' 
   WHERE email = 'your-email@example.com';
   ```

4. **Create a restaurant**:
   ```sql
   INSERT INTO restaurants (name, timezone)
   VALUES ('Main Restaurant', 'Australia/Sydney');
   ```

5. **Done!** Refresh your app and log in as super admin.

### Option 2: Migrate Existing Data

If you have existing data you want to keep:

1. **Backup your data** (export from Supabase dashboard)

2. **Add new columns to profiles**:
   ```sql
   ALTER TABLE profiles 
   ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'worker',
   ADD COLUMN IF NOT EXISTS first_name text,
   ADD COLUMN IF NOT EXISTS last_name text;
   
   -- Migrate full_name to first_name/last_name
   UPDATE profiles 
   SET first_name = split_part(full_name, ' ', 1),
       last_name = split_part(full_name, ' ', 2)
   WHERE first_name IS NULL;
   ```

3. **Create worker_assignments from restaurant_members**:
   ```sql
   CREATE TABLE IF NOT EXISTS worker_assignments (
     worker_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
     restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
     created_at timestamptz DEFAULT now(),
     PRIMARY KEY (worker_id, restaurant_id)
   );
   
   -- Migrate workers only (not admins)
   INSERT INTO worker_assignments (worker_id, restaurant_id)
   SELECT user_id, restaurant_id 
   FROM restaurant_members 
   WHERE role = 'worker'
   ON CONFLICT DO NOTHING;
   ```

4. **Update roles on profiles**:
   ```sql
   -- Set super admin
   UPDATE profiles SET role = 'super_admin' 
   WHERE id IN (
     SELECT user_id FROM restaurant_members WHERE role IN ('admin', 'super_admin')
   );
   
   -- Everyone else is worker
   UPDATE profiles SET role = 'worker' WHERE role IS NULL;
   ```

5. **Drop old table**:
   ```sql
   DROP TABLE restaurant_members CASCADE;
   ```

6. **Update RLS policies** - run the policies from `schema-single-admin.sql`

## Code Changes Made

All code has been updated to work with the new schema:

### ✅ Updated Files

- `types/database.ts` - Profile now has `role`, `first_name`, `last_name`
- `hooks/useAuth.tsx` - Reads role from profile directly
- `components/roster/RosterGrid.tsx` - Uses `worker_assignments` instead of `restaurant_members`
- `app/admin/page.tsx` - Super admin sees ALL restaurants
- `supabase/helper-queries-single-admin.sql` - New helper queries

### No Changes Needed

- `middleware.ts` - Just checks auth, not roles
- `app/worker/page.tsx` - Already uses profile-based queries
- All UI components - Work the same way

## Testing the New System

1. **Sign up a new account** (or use existing)

2. **Make yourself super admin**:
   ```sql
   UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
   ```

3. **Create a restaurant**:
   ```sql
   INSERT INTO restaurants (name, timezone) 
   VALUES ('Test Restaurant', 'Australia/Sydney');
   ```

4. **Create a worker account** (sign up normally)

5. **Assign worker to restaurant**:
   ```sql
   INSERT INTO worker_assignments (worker_id, restaurant_id)
   SELECT p.id, r.id 
   FROM profiles p, restaurants r
   WHERE p.email = 'worker@email.com' AND r.name = 'Test Restaurant';
   ```

6. **Test the roster builder**:
   - Log in as super admin
   - Select restaurant from dropdown
   - Add shifts for workers
   - Publish shifts
   - Log in as worker and verify they can see published shifts

## Rollback

If you need to rollback, you can run the old schema from `supabase/schema-fixed.sql`. However, you'll need to:

1. Manually migrate data back to `restaurant_members`
2. Update `profiles` to have roles in `restaurant_members` again
3. The code changes are backward compatible (just update the DB)

## Questions?

Check `supabase/helper-queries-single-admin.sql` for useful queries to:
- View all users and roles
- Assign workers to restaurants
- View shifts and availability
- Debug conflicts

## Summary

**Before**: Complex multi-tenant SaaS with restaurant-level admins
**After**: Simple centralized system with one super admin

This makes the system:
- Easier to understand
- Faster to develop
- Simpler to maintain
- Perfect for a single business managing multiple locations
