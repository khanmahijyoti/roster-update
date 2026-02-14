# Enhanced Middleware - Role-Based Redirects

## ✅ What's Improved

The middleware now automatically redirects users based on their role:

### Super Admin Users
- **After Login**: Redirected directly to `/admin` (Roster Builder)
- **Cannot Access**: `/worker` route (auto-redirected to `/admin`)
- **Dashboard**: `/dashboard` redirects to `/admin`

### Worker Users
- **After Login**: Redirected directly to `/worker` (View Shifts)
- **Cannot Access**: `/admin` route (auto-redirected to `/worker`)
- **Dashboard**: `/dashboard` redirects to `/worker`

## How It Works

The middleware (`middleware.ts`) now:

1. **Checks authentication** - Unauthenticated users go to `/auth/login`

2. **After login** - Fetches user role from `profiles` table and redirects:
   - `super_admin` → `/admin`
   - `worker` → `/worker`

3. **Protects routes** - Prevents unauthorized access:
   - Workers trying to access `/admin` → Redirected to `/worker`
   - Super admins trying to access `/worker` → Redirected to `/admin`

4. **Dashboard redirect** - `/dashboard` always goes to correct page based on role

## Testing

### Test Super Admin Access
1. Make your account super_admin:
   ```sql
   UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
   ```

2. Log in → Should auto-redirect to `/admin`

3. Try to manually visit `/worker` → Should auto-redirect back to `/admin`

### Test Worker Access
1. Create a worker account (sign up normally)

2. Log in → Should auto-redirect to `/worker`

3. Try to manually visit `/admin` → Should auto-redirect back to `/worker`

## Role Assignment

Remember: Roles are in the `profiles` table, not auth.users

```sql
-- Make someone super admin
UPDATE profiles SET role = 'super_admin' WHERE email = 'admin@example.com';

-- Make someone a worker (or they're already worker by default)
UPDATE profiles SET role = 'worker' WHERE email = 'worker@example.com';

-- Check current roles
SELECT email, first_name, last_name, role FROM profiles;
```

## Benefits

✅ **Automatic**: No manual navigation needed
✅ **Secure**: Can't bypass role restrictions by typing URLs
✅ **Clean UX**: Users always see the right dashboard
✅ **Single Login**: One login page for everyone, smart redirect based on role

Your system is now fully secured with role-based access control!
