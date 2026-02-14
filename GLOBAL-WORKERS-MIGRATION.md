# Global Workers Migration

**Date**: February 14, 2026  
**Status**: ✅ Complete

## Overview

Migrated the system from restaurant-specific worker assignments to **global workers**. Workers are no longer "assigned" to specific restaurants but are available globally across all restaurants in the system.

---

## What Changed

### 1. Database Schema (`supabase/schema-single-admin.sql`)

**Removed:**
- `worker_assignments` table (no longer needed)
- All related RLS policies for `worker_assignments`
- Indexes for `worker_assignments`

**Updated:**
- Workers can now view **all restaurants** (not just assigned ones)
- Workers can view **all weekly reports** 
- `worker_roster_view` simplified to just return all workers (no restaurant filtering)

### 2. Roster Grid (`components/roster/RosterGrid.tsx`)

**Changed:**
- Now fetches **all workers** from `profiles` table where `role = 'worker'`
- Removed dependency on `worker_assignments` table
- All workers appear in the roster grid for every restaurant
- Conflict detection still works globally (workers can't be double-booked)

### 3. Worker Dashboard (`app/worker/page.tsx`)

**No changes needed** - already only showed shifts assigned to the logged-in worker.

### 4. Admin Dashboard (`app/admin/page.tsx`)

**Removed:**
- `WorkerManager` component import and usage
- "Manage Workers" button from header
- Worker assignment functionality
- `showWorkerManager` state

**Updated:**
- `loadWorkerCount()` now counts **all workers globally** instead of per-restaurant
- Worker count now loads independently (not tied to restaurant selection)

### 5. Removed Components

- `components/admin/WorkerManager.tsx` - No longer needed (workers are global)

---

## Business Logic

### Before (Restaurant-Assigned Workers)
```
1. Super admin assigns workers to specific restaurants
2. Workers only appear in roster grids for assigned restaurants
3. Workers only see their assigned restaurants
4. Worker count is per-restaurant
```

### After (Global Workers)
```
1. All workers are global - no assignment needed
2. All workers appear in ALL restaurant roster grids
3. Workers can be scheduled at ANY restaurant
4. Workers only see shifts they're actually scheduled for
5. Worker count is system-wide
6. Availability applies globally across all restaurants
```

---

## Migration Steps

If you have existing data with `worker_assignments`:

1. **Backup your database** (important!)

2. **Run the updated schema** (`supabase/schema-single-admin.sql`)
   - This will drop the `worker_assignments` table
   - All worker assignment data will be lost (as intended)

3. **Deploy the updated application code**

4. **Verify:**
   - Admin can see all workers in every restaurant's roster grid
   - Workers can see only their assigned shifts (regardless of restaurant)
   - Conflict detection works across all restaurants

---

## Benefits

✅ **Simpler architecture** - No need to manage worker-restaurant relationships  
✅ **More flexible** - Any worker can be scheduled at any restaurant  
✅ **Less admin overhead** - No need to assign workers before scheduling  
✅ **Better for small-to-medium businesses** - Matches real-world hospitality workflows  
✅ **Global conflict detection** - Already built into the system  

---

## Testing Checklist

- [ ] Super admin can see all workers in roster grid
- [ ] Super admin can create shifts for any worker at any restaurant
- [ ] Conflict detection prevents double-booking across restaurants
- [ ] Workers see only their assigned shifts (published only)
- [ ] Workers can set availability that applies to all restaurants
- [ ] Dashboard stats show correct global worker count
- [ ] No "Manage Workers" button in admin dashboard

---

## Technical Notes

### RLS Policies Updated

**Workers can now:**
- View all restaurants (previously only assigned ones)
- View all weekly reports (previously only for assigned restaurants)

**Workers still cannot:**
- View draft shifts (only published)
- View other workers' shifts
- Create/edit/delete shifts
- Edit other workers' availability

### Database Changes

```sql
-- Removed table
DROP TABLE public.worker_assignments;

-- Updated policy (example)
CREATE POLICY "Workers: View all restaurants"
  ON public.restaurants FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

---

## Rollback Plan

If you need to revert to restaurant-specific assignments:

1. Restore from backup
2. Use the old schema file (`schema-fixed.sql` or similar)
3. Revert the code changes to this commit's parent

**Note**: This is a breaking schema change. Plan accordingly.

---

## Questions?

This migration aligns with the original requirement that workers should be global and not tied to specific restaurants. The system now operates as a true multi-restaurant scheduling platform where any worker can be scheduled anywhere.
