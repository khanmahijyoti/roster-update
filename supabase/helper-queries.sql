-- Helper Queries for Setting User Roles

-- 1. View all users and their current roles
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  rm.role,
  r.name as restaurant_name
FROM profiles p
LEFT JOIN restaurant_members rm ON p.id = rm.user_id
LEFT JOIN restaurants r ON rm.restaurant_id = r.id;

-- 2. Make a user an ADMIN
-- Replace 'user-email@example.com' with actual email
-- Replace 'restaurant-id-here' with actual restaurant ID
INSERT INTO public.restaurant_members (user_id, restaurant_id, role)
SELECT 
  p.id,
  'restaurant-id-here'::uuid,
  'admin'::user_role
FROM profiles p
WHERE p.email = 'user-email@example.com'
ON CONFLICT (user_id, restaurant_id) 
DO UPDATE SET role = 'admin';

-- 3. Make a user a WORKER
-- Replace 'user-email@example.com' with actual email
-- Replace 'restaurant-id-here' with actual restaurant ID
INSERT INTO public.restaurant_members (user_id, restaurant_id, role)
SELECT 
  p.id,
  'restaurant-id-here'::uuid,
  'worker'::user_role
FROM profiles p
WHERE p.email = 'user-email@example.com'
ON CONFLICT (user_id, restaurant_id) 
DO UPDATE SET role = 'worker';

-- 4. Quick: Make first user an admin of first restaurant
-- (Use this if you have exactly 1 user and 1 restaurant)
INSERT INTO public.restaurant_members (user_id, restaurant_id, role)
SELECT 
  p.id,
  r.id,
  'admin'::user_role
FROM profiles p, restaurants r
LIMIT 1
ON CONFLICT (user_id, restaurant_id) 
DO UPDATE SET role = 'admin';

-- 5. Change an existing user's role
UPDATE public.restaurant_members
SET role = 'admin'  -- or 'worker' or 'super_admin'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user-email@example.com');
