# Setup Complete - Next Steps

## ✅ What's Fixed

1. **Landing Page**: Now shows a single "Sign In" button (no more confusing "Worker" vs "Admin" options)
2. **Signup Form**: Updated to collect first name and last name separately
3. **Dashboard Redirect**: Only super_admin users go to `/admin`, everyone else goes to `/worker`
4. **Clear Messaging**: Signup page now says "New accounts are created as workers by default"

## 🎯 Complete Setup Steps

### 1. Make Your Account Super Admin

In **Supabase SQL Editor**, run:

```sql
-- Replace with your email address
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your@email.com';

-- Verify it worked
SELECT email, first_name, last_name, role FROM profiles;
```

You should see your account with `role = 'super_admin'`.

---

### 2. Create Your First Restaurant

```sql
INSERT INTO restaurants (name, timezone)
VALUES ('Main Restaurant', 'Australia/Sydney')
RETURNING id, name;

-- Verify
SELECT * FROM restaurants;
```

---

### 3. Test Your Admin Access

1. Go to `http://localhost:3001`
2. Click **"Sign In"**
3. Log in with your account
4. You should automatically be redirected to **`/admin`** (Admin Dashboard)
5. You should see:
   - "Select Restaurant" dropdown with "Main Restaurant"
   - Week selector (Current Week / Next Week)
   - "Roster Status" card
   - Empty roster grid saying "No workers found"

✅ If you see this, your admin account is working!

---

### 4. Create Test Worker Accounts

#### Option A: Via Signup Form (Recommended)

1. Log out
2. Go to `http://localhost:3001`
3. Click **"Create Account"**
4. Fill in:
   - First Name: `Test`
   - Last Name: `Worker`
   - Email: `worker@test.com`
   - Password: `password123`
5. Click "Sign Up"
6. Log in with the worker account
7. You should see the **Worker Dashboard** (not admin)

#### Option B: Invite Workers

1. Go to Supabase Dashboard
2. **Authentication** → **Users** → **Invite User**
3. Enter worker email
4. They'll receive an invitation

---

### 5. Assign Workers to Restaurant

After workers sign up, assign them to your restaurant:

```sql
-- Assign a specific worker
INSERT INTO worker_assignments (worker_id, restaurant_id)
SELECT 
  p.id,
  r.id
FROM profiles p, restaurants r
WHERE p.email = 'worker@test.com'
  AND r.name = 'Main Restaurant';

-- OR assign ALL workers to restaurant
INSERT INTO worker_assignments (worker_id, restaurant_id)
SELECT 
  p.id,
  r.id
FROM profiles p, restaurants r
WHERE p.role = 'worker'
  AND r.name = 'Main Restaurant'
ON CONFLICT DO NOTHING;

-- Verify assignments
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name as worker_name,
  r.name as restaurant
FROM worker_assignments wa
JOIN profiles p ON p.id = wa.worker_id
JOIN restaurants r ON r.id = wa.restaurant_id;
```

---

### 6. Test the Roster Builder

Now log back in as **super admin**:

1. Go to `/admin`
2. Select "Main Restaurant"
3. Select "Current Week" or "Next Week"
4. You should now see workers in the roster grid!
5. **Add a shift**:
   - Click on a cell (intersection of worker × day)
   - Set times (e.g., 09:00 - 17:00)
   - Click "Save Shift"
   - Shift appears with "Draft" badge
6. **Publish shifts**:
   - Click "Publish All Drafts"
   - Shifts are now visible to workers

---

### 7. Test Worker View

Log in as the worker account:

1. You should see `/worker` dashboard
2. See "Current Week Shifts" (should show published shifts)
3. See "Next Week Availability" (can edit morning/afternoon)
4. Change some availability and click "Save"

---

## 🔍 Verification Checklist

Run these queries to verify everything:

```sql
-- 1. Check all users and roles
SELECT 
  email,
  first_name,
  last_name,
  role,
  created_at
FROM profiles
ORDER BY created_at;

-- 2. Check worker assignments
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name as worker_name,
  r.name as restaurant,
  p.role
FROM worker_assignments wa
JOIN profiles p ON p.id = wa.worker_id
JOIN restaurants r ON r.id = wa.restaurant_id
ORDER BY r.name, p.last_name;

-- 3. Check recent shifts
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
LIMIT 20;

-- 4. Count users by role
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role;
```

---

## 🎨 What You Should See

### Landing Page (`/`)
- Clean single-panel design
- "Sign In" button
- "Create Account" button
- Note: "New accounts are workers by default"

### Signup Page (`/auth/signup`)
- First Name field
- Last Name field
- Email field
- Password field
- Text: "New accounts are created as workers by default"

### After Login
- **Super Admin** → Redirected to `/admin` (Roster Builder)
- **Worker** → Redirected to `/worker` (View Shifts & Availability)

---

## 🚨 Troubleshooting

### Problem: Still seeing "Worker Login" and "Admin Login" buttons
**Solution**: Clear browser cache and hard refresh (Ctrl+Shift+R)

### Problem: Worker sees admin dashboard
**Solution**: 
```sql
UPDATE profiles SET role = 'worker' WHERE email = 'worker@test.com';
```

### Problem: Admin sees worker dashboard
**Solution**: 
```sql
UPDATE profiles SET role = 'super_admin' WHERE email = 'admin@test.com';
```

### Problem: "No workers found in this restaurant"
**Solution**: Assign workers using the SQL from Step 5

### Problem: Worker can't see published shifts
**Solution**: Make sure shifts are published (not draft) and the worker is assigned to that restaurant

---

## 📚 Useful Queries

See `supabase/helper-queries-single-admin.sql` for many more helpful queries including:
- View all workers with assignments
- Find workers without assignments
- View shift conflicts
- And more!

---

## ✨ System is Ready!

Your roster management system is now fully configured with:
- ✅ Single super admin (you)
- ✅ Worker accounts (default for new signups)
- ✅ Clean login flow (no confusion)
- ✅ Full roster builder with availability tracking
- ✅ Draft/publish workflow
- ✅ Global conflict detection

**Next**: Start adding your real workers and building rosters!
