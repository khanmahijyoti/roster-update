# ⚡ Quick Start Guide

Get the Roster Management System running in 5 minutes!

> **Note:** This system is now complete with full roster builder functionality!

## Step 1: Set Up Supabase (2 min)

1. Go to https://supabase.com and create a free account
2. Click **"New Project"**
3. Fill in:
   - Name: `roster-management`
   - Database Password: (choose a strong password)
   - Region: (closest to you)
4. Click **"Create new project"** and wait ~2 minutes

## Step 2: Create Database (1 min)

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Open `supabase/schema-single-admin.sql` from this project (this is the latest schema)
4. Copy the entire file and paste it into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

## Step 3: Get API Keys (30 seconds)

1. Click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"**
3. Copy these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (long string under "Project API keys")

## Step 4: Configure App (30 seconds)

1. In the `roster-app` folder, create a file called `.env.local`
2. Paste this and replace with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Save the file

## Step 5: Run the App (1 min)

Open terminal in the `roster-app` folder:

```bash
npm run dev
```

Open http://localhost:3001 in your browser!

---

## Test It Out

### Create Your First User:

1. Click **"Create Account"**
2. Fill in:
   - First Name: Admin
   - Last Name: User
   - Email: admin@test.com
   - Password: password123
3. Click **"Sign Up"**

### Make Yourself Super Admin:

Go to Supabase SQL Editor and run:

```sql
-- Make yourself super admin
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'admin@test.com';

-- Create a test restaurant
INSERT INTO restaurants (name, timezone)
VALUES ('Main Restaurant', 'Australia/Sydney');

-- Verify it worked
SELECT * FROM profiles;
SELECT * FROM restaurants;
```

### Try the Features:

**Log in** at `http://localhost:3001` with `admin@test.com` and you'll see the **Admin Dashboard**!

Now you can:
- ✅ **Manage Restaurants** - Create/delete restaurants
- ✅ **Manage Workers** - Assign workers to restaurants
- ✅ **Build Rosters** - Click cells to create shifts
- ✅ **Edit Shifts** - Click pencil icon to modify
- ✅ **Publish Shifts** - Make them visible to workers
- ✅ **View Statistics** - See real-time dashboard stats

---

## Create Worker Accounts

To test the full system:

1. **Log out** from admin account
2. Create worker accounts:
   - `john@test.com` / `password123` (John Doe)
   - `jane@test.com` / `password123` (Jane Smith)
3. **Log back in as admin**
4. Click **"Manage Workers"**
5. Assign the workers to your restaurant
6. Now they'll appear in the roster grid!

---

## Test the Roster Builder

### Create Shifts:

1. Log in as admin
2. Select "Main Restaurant"
3. Select "Current Week" or "Next Week"
4. **Click any cell** in the roster grid
5. Set times (e.g., 09:00 - 17:00)
6. Click **"Create Shift"**
7. Shift appears with "Draft" badge

### Publish Shifts:

1. Create a few more shifts
2. Check the **"Roster Status"** card
3. Click **"Publish All Drafts"**
4. Shifts are now visible to workers!

### Test as Worker:

1. Log out from admin
2. Log in as a worker (e.g., `john@test.com`)
3. You'll see published shifts on the worker dashboard
4. Try setting availability for next week

---

## Troubleshooting

### "Error: Supabase client not initialized"
- Check that `.env.local` exists and has correct values
- Restart the dev server (`Ctrl+C` then `npm run dev`)

### "No workers in roster grid"
- Create worker accounts first
- Use **"Manage Workers"** to assign them to the restaurant

### "Can't create shift"
- Make sure workers are assigned to the restaurant
- Check that the time is between 08:00 and 23:00
- Red cells indicate conflicts - cannot add shift there

### "Workers can't see shifts"
- Make sure shifts are **published**, not draft
- Verify worker is assigned to that restaurant
- Check that shifts are for the current week

---

## 🎉 You're All Set!

Your Roster Management System is now **fully functional** with:

✅ Complete roster builder
✅ Shift management (create, edit, delete)
✅ Worker assignments
✅ Conflict detection
✅ Draft/publish workflow
✅ Availability tracking
✅ Real-time statistics
✅ Multi-restaurant support

---

## 📚 Next Steps

- **TESTING-GUIDE.md** - Comprehensive testing guide
- **IMPLEMENTATION-COMPLETE.md** - Full feature list
- **README.md** - Project overview

---

## 🚀 Advanced Features

The system includes:
- **Color-coded availability** (green/orange/red)
- **Global conflict detection** (across all restaurants)
- **Time validation** (08:00-23:00 only)
- **Overlap prevention** (no double-booking)
- **Dashboard statistics** (workers, shifts, hours)
- **Professional UI** with gradients and animations

Enjoy your Roster Management System!
