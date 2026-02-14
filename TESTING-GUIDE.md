# Testing Guide - Roster Management System

## 🎯 Quick Start Testing

This guide will walk you through testing all the new features that have been implemented.

---

## Prerequisites

The application should already be running on `http://localhost:3001`

---

## 1. Initial Setup (If Not Done)

### A. Create Super Admin Account

1. Go to `http://localhost:3001`
2. Click **"Create Account"**
3. Fill in:
   - First Name: `Admin`
   - Last Name: `User`
   - Email: `admin@test.com`
   - Password: `password123`
4. Click "Sign Up"

### B. Make Yourself Super Admin

Open Supabase SQL Editor and run:

```sql
-- Update your account to super_admin
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'admin@test.com';

-- Verify it worked
SELECT email, first_name, last_name, role FROM profiles;
```

### C. Create a Restaurant

```sql
-- Create test restaurant
INSERT INTO restaurants (name, timezone)
VALUES ('Main Restaurant', 'Australia/Sydney')
RETURNING id, name;

-- Verify
SELECT * FROM restaurants;
```

---

## 2. Test Restaurant Management

### Create Restaurants

1. Log in as super admin (`admin@test.com`)
2. Click **"Manage Restaurants"** button
3. Click **"New Restaurant"**
4. Enter:
   - Name: `Downtown Branch`
   - Timezone: `Australia/Sydney`
5. Click **"Create Restaurant"**
6. You should see success message and the new restaurant in the list

### Test Multiple Restaurants

1. Create another restaurant:
   - Name: `Uptown Branch`
2. Try switching between restaurants in the dropdown
3. Verify each restaurant has its own roster

---

## 3. Test Worker Management

### Create Worker Accounts

1. **Log out** from admin account
2. Go to `http://localhost:3001`
3. Click **"Create Account"**
4. Create multiple workers:
   - Worker 1: `john@test.com` / `password123` (John Doe)
   - Worker 2: `jane@test.com` / `password123` (Jane Smith)
   - Worker 3: `bob@test.com` / `password123` (Bob Wilson)

### Assign Workers to Restaurant

1. **Log back in as super admin**
2. Select a restaurant (e.g., "Main Restaurant")
3. Click **"Manage Workers"** button
4. You should see all workers in the "Available Workers" section
5. Click **"Assign"** next to each worker
6. Workers should move to "Assigned Workers" section
7. Try removing a worker by clicking **"Remove"**
8. Worker should move back to "Available Workers"

---

## 4. Test Roster Builder

### View the Roster Grid

1. Log in as super admin
2. Select "Main Restaurant"
3. Select "Current Week" or "Next Week"
4. You should see:
   - **Dashboard Stats** showing: Workers, Draft Shifts, Published, Total Hours
   - **Availability Legend** explaining the color codes
   - **Roster Grid** with workers on rows and days on columns

### Create a Shift

1. Click on a cell (intersection of worker and day)
2. A **"Create New Shift"** modal should appear
3. Set times (e.g., 09:00 - 17:00)
4. Click **"Create Shift"**
5. Shift should appear in the cell with a "Draft" badge
6. Check the stats - "Draft Shifts" should increase

### Edit a Shift

1. Click the **pencil icon** on any shift
2. Modal changes to **"Edit Shift"**
3. Change the times (e.g., 10:00 - 18:00)
4. Click **"Update Shift"**
5. Shift times should update

### Delete a Shift

1. Click the **X icon** on any shift
2. Shift should be removed immediately
3. Stats should update

### Test Availability Colors

The cells have color backgrounds:
- 🟢 **Green** = Worker is available (default)
- 🟠 **Orange** = Worker marked unavailable (admin can still override)
- 🔴 **Red** = Worker has shift at another restaurant (cannot add shift)

To test this:

1. Log in as a **worker** account
2. Go to worker dashboard
3. Change availability for next week (uncheck some periods)
4. Log back in as **admin**
5. Select "Next Week"
6. Cells where worker is unavailable should be **orange**

### Test Conflict Detection

1. Create a shift for a worker at "Main Restaurant"
2. Switch to another restaurant (e.g., "Downtown Branch")
3. Assign the same worker to this restaurant
4. Try to create a shift for the same worker on the same day/time
5. The cell should be **red** and show "Conflict: Working elsewhere"
6. You should **NOT** be able to add a shift

---

## 5. Test Publish Workflow

### Publish Draft Shifts

1. Create several draft shifts
2. Check the **"Roster Status"** card
3. Click **"Publish All Drafts"**
4. All shifts should change from "Draft" badge to no badge
5. Stats should update: Draft → 0, Published → increased
6. Success message should appear

### Verify Workers Can See Published Shifts

1. Log out from admin
2. Log in as a **worker** account
3. Go to worker dashboard
4. You should see published shifts under "Current Week Shifts"
5. Draft shifts should NOT be visible to workers

---

## 6. Test Worker Availability

### Set Availability for Next Week

1. Log in as worker
2. Go to `/worker` dashboard
3. Under "Next Week Availability" section:
   - Days should show Morning/Afternoon toggle buttons
   - Green = Available, Red = Unavailable
4. Click a button to toggle availability
5. Click **"Save Availability"**
6. Changes should persist after refresh

### Test Lockout (Saturday 23:00)

The system should lock availability editing after Saturday 23:00. To test:

1. Check current date/time
2. If it's after Saturday 23:00:
   - Next week section should be read-only
   - Save button should be disabled
3. If before Saturday 23:00:
   - Everything should be editable

---

## 7. Test Statistics Dashboard

The **Dashboard Stats** cards should update in real-time:

1. **Workers**: Should match number of assigned workers
2. **Draft Shifts**: Should increase when you create shifts
3. **Published**: Should increase when you publish
4. **Total Hours**: Should calculate total shift hours for the week

Example:
- Create 2 shifts: 09:00-17:00 (8 hours each)
- Total Hours should show 16.0

---

## 8. Edge Cases to Test

### Test Time Validation

1. Try creating a shift from 07:00 - 09:00
2. Should show error: "Shifts must be between 08:00 and 23:00"

3. Try creating a shift from 20:00 - 23:30
4. Should show error: "Shifts must be between 08:00 and 23:00"

5. Try end time before start time (e.g., 17:00 - 09:00)
6. Should show error: "End time must be after start time"

### Test Shift Overlap

1. Create a shift: Monday 09:00 - 17:00 for John
2. Try creating another shift: Monday 15:00 - 20:00 for John
3. Should show error: "Shift conflicts with another shift for this worker"

### Test Global Conflicts

1. Assign worker to Restaurant A
2. Create shift at Restaurant A: Monday 09:00 - 17:00
3. Assign same worker to Restaurant B
4. Try creating shift at Restaurant B: Monday 10:00 - 18:00
5. Cell should be red, cannot create shift

---

## 9. Visual Testing Checklist

### Admin Dashboard

- [ ] Clean gradient background (blue to indigo)
- [ ] Header with username and action buttons
- [ ] Restaurant selector dropdown working
- [ ] Week selector buttons (Current/Next) with dates
- [ ] Dashboard stats cards with icons and numbers
- [ ] Roster Actions card with status and publish button
- [ ] Roster Grid with worker names and date headers
- [ ] Color-coded cells (green/orange/red)
- [ ] Shift cards with time and status badge
- [ ] Edit/Delete icons on shifts
- [ ] "Add" button on available cells

### Worker Dashboard

- [ ] Current week shifts displayed correctly
- [ ] Next week availability with toggle buttons
- [ ] Lockout message if after Saturday 23:00
- [ ] Save button functional

### Restaurant Manager

- [ ] List of restaurants with timezone
- [ ] Create form with validation
- [ ] Delete confirmation dialog
- [ ] Success/error messages

### Worker Manager

- [ ] Assigned workers section (green background)
- [ ] Available workers section
- [ ] Assign/Remove buttons functional
- [ ] Real-time updates after actions

---

## 10. Performance Testing

### Test with Multiple Workers

1. Create 10+ worker accounts
2. Assign all to a restaurant
3. Roster grid should render smoothly
4. Scrolling should be responsive

### Test with Many Shifts

1. Create 50+ shifts across the week
2. Grid should load within 2 seconds
3. Editing should be instant

---

## 11. Common Issues & Solutions

### Issue: Can't see roster grid
**Solution**: Make sure workers are assigned to the restaurant

### Issue: Shifts not appearing
**Solution**: Check that you're viewing the correct week

### Issue: Can't create shift
**Solution**: Check for red (busy) indicator - worker may have conflict

### Issue: Publish button disabled
**Solution**: No draft shifts exist to publish

### Issue: Worker can't see shifts
**Solution**: Shifts must be "published", not "draft"

---

## 12. Database Verification Queries

Use these in Supabase SQL Editor to verify data:

```sql
-- Check all users and roles
SELECT 
  email, 
  first_name, 
  last_name, 
  role 
FROM profiles 
ORDER BY role, last_name;

-- Check worker assignments
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name as worker_name,
  r.name as restaurant,
  wa.created_at
FROM worker_assignments wa
JOIN profiles p ON p.id = wa.worker_id
JOIN restaurants r ON r.id = wa.restaurant_id
ORDER BY r.name, p.last_name;

-- Check all shifts
SELECT 
  s.start_time::date as shift_date,
  s.start_time::time as start,
  s.end_time::time as end,
  s.status,
  p.first_name || ' ' || p.last_name as worker,
  r.name as restaurant
FROM shifts s
JOIN profiles p ON s.worker_id = p.id
JOIN restaurants r ON s.restaurant_id = r.id
ORDER BY s.start_time DESC
LIMIT 50;

-- Check availability
SELECT 
  p.first_name || ' ' || p.last_name as worker,
  a.date,
  a.can_work_morning,
  a.can_work_afternoon
FROM availability a
JOIN profiles p ON a.user_id = p.id
ORDER BY a.date, p.last_name;

-- Count everything
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role = 'super_admin') as admins,
  (SELECT COUNT(*) FROM profiles WHERE role = 'worker') as workers,
  (SELECT COUNT(*) FROM restaurants) as restaurants,
  (SELECT COUNT(*) FROM worker_assignments) as assignments,
  (SELECT COUNT(*) FROM shifts) as total_shifts,
  (SELECT COUNT(*) FROM shifts WHERE status = 'draft') as draft_shifts,
  (SELECT COUNT(*) FROM shifts WHERE status = 'published') as published_shifts;
```

---

## ✅ Feature Completion Checklist

- [x] Restaurant Management (Create/Delete)
- [x] Worker Management (Assign/Remove from restaurants)
- [x] Roster Grid with color-coded availability
- [x] Shift Creation with time picker
- [x] Shift Editing
- [x] Shift Deletion
- [x] Conflict Detection (same restaurant)
- [x] Global Conflict Detection (across restaurants)
- [x] Time Validation (08:00 - 23:00)
- [x] Overlap Prevention
- [x] Draft/Published Status
- [x] Publish All Drafts workflow
- [x] Dashboard Statistics
- [x] Worker Availability Input
- [x] Availability Lockout Logic
- [x] Success/Error Messages
- [x] Loading States
- [x] Responsive Design

---

## 🎊 Success!

If you've completed all these tests successfully, your Roster Management System is fully functional!

### What's Working:
✅ Multi-restaurant management
✅ Worker-restaurant assignments
✅ Complete roster builder with drag-free interface
✅ Full CRUD operations on shifts
✅ Conflict detection (local + global)
✅ Draft/Publish workflow
✅ Availability tracking
✅ Time validation
✅ Real-time statistics

### Optional Enhancements (Future):
- Drag-and-drop shift assignment
- Bulk shift operations
- Weekly report generation (Edge Function)
- Email/push notifications
- Export to CSV/PDF
- Shift templates
- Recurring shifts

---

## Need Help?

Check the helper queries in:
- `supabase/helper-queries-single-admin.sql`

Or review the documentation:
- `README.md` - General overview
- `MIGRATION-GUIDE.md` - Schema changes
- `SETUP-COMPLETE.md` - Initial setup
