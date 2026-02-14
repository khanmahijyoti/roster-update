-- ============================================================================
-- HELPER QUERIES FOR SINGLE-ADMIN SYSTEM
-- ============================================================================

-- 1. VIEW ALL USERS AND THEIR ROLES
-- Shows all profiles with their role
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 2. VIEW WORKER ASSIGNMENTS
-- Shows which workers are assigned to which restaurants
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  r.name as restaurant_name,
  wa.created_at as assigned_date
FROM worker_assignments wa
JOIN profiles p ON p.id = wa.worker_id
JOIN restaurants r ON r.id = wa.restaurant_id
ORDER BY r.name, p.last_name;

-- 3. MAKE A USER SUPER ADMIN
-- Replace 'user-email@example.com' with actual email
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'user-email@example.com';

-- 4. MAKE THE FIRST USER SUPER ADMIN
-- Use this if you have exactly 1 user and want to make them admin
UPDATE profiles
SET role = 'super_admin'
WHERE id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1);

-- 5. CREATE A NEW RESTAURANT
INSERT INTO restaurants (name, timezone)
VALUES ('My Restaurant', 'Australia/Sydney')
RETURNING id, name;

-- 6. ASSIGN A WORKER TO A RESTAURANT
-- Replace the email and restaurant name with actual values
INSERT INTO worker_assignments (worker_id, restaurant_id)
SELECT 
  p.id,
  r.id
FROM profiles p, restaurants r
WHERE p.email = 'worker-email@example.com'
  AND r.name = 'My Restaurant'
ON CONFLICT (worker_id, restaurant_id) DO NOTHING;

-- 7. ASSIGN ALL WORKERS TO A RESTAURANT
-- Replace 'My Restaurant' with actual restaurant name
INSERT INTO worker_assignments (worker_id, restaurant_id)
SELECT 
  p.id,
  r.id
FROM profiles p, restaurants r
WHERE p.role = 'worker'
  AND r.name = 'My Restaurant'
ON CONFLICT (worker_id, restaurant_id) DO NOTHING;

-- 8. REMOVE A WORKER FROM A RESTAURANT
DELETE FROM worker_assignments
WHERE worker_id = (SELECT id FROM profiles WHERE email = 'worker-email@example.com')
  AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'My Restaurant');

-- 9. VIEW ALL SHIFTS FOR A RESTAURANT
-- Replace 'My Restaurant' with actual restaurant name
SELECT 
  s.id,
  s.start_time,
  s.end_time,
  s.status,
  p.first_name || ' ' || p.last_name as worker_name,
  p.email as worker_email
FROM shifts s
JOIN profiles p ON s.worker_id = p.id
JOIN restaurants r ON s.restaurant_id = r.id
WHERE r.name = 'My Restaurant'
ORDER BY s.start_time DESC
LIMIT 50;

-- 10. VIEW WORKER AVAILABILITY FOR CURRENT WEEK
-- Shows availability for all workers this week
SELECT 
  p.first_name || ' ' || p.last_name as worker_name,
  a.date,
  CASE 
    WHEN a.can_work_morning AND a.can_work_afternoon THEN 'All Day'
    WHEN a.can_work_morning THEN 'Morning Only'
    WHEN a.can_work_afternoon THEN 'Afternoon Only'
    ELSE 'Unavailable'
  END as availability
FROM availability a
JOIN profiles p ON a.user_id = p.id
WHERE a.date >= date_trunc('week', CURRENT_DATE)
  AND a.date < date_trunc('week', CURRENT_DATE) + interval '7 days'
ORDER BY p.last_name, a.date;

-- 11. COUNT USERS BY ROLE
SELECT 
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role;

-- 12. COUNT WORKERS PER RESTAURANT
SELECT 
  r.name as restaurant_name,
  COUNT(wa.worker_id) as worker_count
FROM restaurants r
LEFT JOIN worker_assignments wa ON r.id = wa.restaurant_id
GROUP BY r.id, r.name
ORDER BY worker_count DESC;

-- 13. FIND WORKERS WITHOUT RESTAURANT ASSIGNMENT
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name
FROM profiles p
LEFT JOIN worker_assignments wa ON p.id = wa.worker_id
WHERE p.role = 'worker'
  AND wa.worker_id IS NULL;

-- 14. VIEW SHIFT CONFLICTS (DOUBLE BOOKINGS)
-- Shows workers who have overlapping shifts
SELECT 
  p.first_name || ' ' || p.last_name as worker_name,
  s1.start_time as shift1_start,
  s1.end_time as shift1_end,
  r1.name as restaurant1,
  s2.start_time as shift2_start,
  s2.end_time as shift2_end,
  r2.name as restaurant2
FROM shifts s1
JOIN shifts s2 ON s1.worker_id = s2.worker_id 
  AND s1.id < s2.id
  AND tstzrange(s1.start_time, s1.end_time) && tstzrange(s2.start_time, s2.end_time)
JOIN profiles p ON s1.worker_id = p.id
JOIN restaurants r1 ON s1.restaurant_id = r1.id
JOIN restaurants r2 ON s2.restaurant_id = r2.id;

-- 15. DELETE ALL DATA (RESET DATABASE - USE WITH CAUTION!)
-- Uncomment to use - this will delete ALL data
-- TRUNCATE TABLE weekly_reports, shifts, availability, worker_assignments, restaurants, profiles CASCADE;

-- ============================================================================
-- QUICK SETUP FOR NEW SYSTEM
-- ============================================================================

-- Run these in order to set up a fresh system:

-- Step 1: Make yourself super admin (replace email)
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';

-- Step 2: Create your first restaurant
-- INSERT INTO restaurants (name, timezone) VALUES ('Main Restaurant', 'Australia/Sydney');

-- Step 3: Create some test workers (optional)
-- Workers will be created automatically when they sign up

-- Step 4: Assign workers to restaurant (after they sign up)
-- INSERT INTO worker_assignments (worker_id, restaurant_id)
-- SELECT p.id, r.id FROM profiles p, restaurants r 
-- WHERE p.role = 'worker' AND r.name = 'Main Restaurant'
-- ON CONFLICT DO NOTHING;

-- ============================================================================
