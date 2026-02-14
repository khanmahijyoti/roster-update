# Weekly Reports Testing Guide

## Quick Start

### 1. Add CRON_SECRET to .env.local

Generate a secure secret and add it to your `.env.local`:

```bash
# Generate a random secret (choose one method):

# Method 1 - OpenSSL (Linux/Mac/Git Bash):
openssl rand -base64 32

# Method 2 - PowerShell (Windows):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Method 3 - Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to `.env.local`:
```
CRON_SECRET=your-generated-secret-here
```

### 2. Start Development Server

```bash
cd roster-app
npm run dev
```

Server should start on `http://localhost:3001`

### 3. Get Your Restaurant ID

You'll need a restaurant ID to test. You can get this from:

**Option A - From the Admin Dashboard:**
1. Open browser dev tools (F12)
2. Go to http://localhost:3001/admin
3. Log in as super admin
4. Open the Console tab
5. Type: `localStorage` or check the Network tab when the page loads
6. Find the restaurant ID in the API requests

**Option B - Query Supabase directly:**
```sql
SELECT id, name FROM restaurants LIMIT 1;
```

### 4. Test Manual Report Generation

Replace `YOUR_RESTAURANT_ID` with your actual restaurant ID:

```bash
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "YOUR_RESTAURANT_ID",
    "weekStart": "2026-02-09",
    "weekEnd": "2026-02-15"
  }'
```

**Expected Success Response:**
```json
{
  "success": true,
  "report": {
    "id": "uuid-here",
    "restaurant_id": "uuid-here",
    "week_start": "2026-02-09",
    "week_end": "2026-02-15",
    "report_data": { ... },
    "created_at": "2026-02-14T...",
    "updated_at": "2026-02-14T..."
  }
}
```

**Expected Error Responses:**

No authentication:
```json
{
  "error": "Unauthorized"
}
```

No shifts in that week:
```json
{
  "success": true,
  "report": {
    ...
    "report_data": {
      "workers": [],
      "totalHours": 0,
      "totalShifts": 0
    }
  }
}
```

### 5. Test Cron Endpoint (Auto-Generate)

Replace `YOUR_SECRET` with the secret from your `.env.local`:

```bash
curl -X POST http://localhost:3001/api/reports/auto-generate \
  -H "x-cron-secret: YOUR_SECRET"
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Reports generated successfully",
  "results": [
    {
      "restaurantId": "uuid-here",
      "restaurantName": "Restaurant Name",
      "weekStart": "2026-02-09",
      "weekEnd": "2026-02-15",
      "success": true,
      "reportId": "uuid-here"
    }
  ]
}
```

**Expected Error Response (wrong secret):**
```json
{
  "error": "Unauthorized"
}
```

### 6. View Reports in UI

1. Go to http://localhost:3001/admin
2. Log in as super admin
3. Click **"View Reports"** button in the header
4. Select a restaurant from the dropdown
5. You should see the generated reports listed by week
6. Click **"Show Details"** to expand worker information

## Testing Checklist

- [ ] CRON_SECRET added to .env.local
- [ ] Dev server running on port 3001
- [ ] Can access admin dashboard at /admin
- [ ] Can access reports page at /reports
- [ ] Manual report generation works via API
- [ ] Auto-generate endpoint works with correct secret
- [ ] Auto-generate endpoint rejects wrong secret
- [ ] Reports appear in the UI at /reports
- [ ] Can expand/collapse worker details
- [ ] Reports show correct hours and shift counts
- [ ] "View Reports" button appears in admin header

## Common Issues

### "Unauthorized" on manual generation
- **Cause**: Not authenticated as super admin
- **Solution**: Test must be done from browser with valid session, or pass auth cookies in curl

### "Unauthorized" on auto-generate endpoint
- **Cause**: Missing or incorrect CRON_SECRET
- **Solution**: 
  1. Check `.env.local` has `CRON_SECRET=...`
  2. Restart dev server after adding env var
  3. Ensure secret in header matches .env.local exactly

### Empty reports
- **Cause**: No published shifts in the date range
- **Solution**: 
  1. Create and publish shifts in the admin dashboard
  2. Try a different date range that includes shifts
  3. Check that shifts have `status = 'published'`

### Can't find restaurant ID
- **Solution**: Use this curl to list all restaurants:
```bash
# You'll need to be authenticated, easier to check in Supabase dashboard
# Or check the network tab in browser dev tools when viewing /admin
```

### Dev server not starting
- **Cause**: Port 3001 already in use
- **Solution**: 
  1. Kill process on port 3001
  2. Or change port in package.json dev script

### Module not found errors
- **Cause**: Dependencies not installed
- **Solution**: 
```bash
cd roster-app
npm install
```

## Advanced Testing

### Test with Different Date Ranges

Test last week:
```bash
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "YOUR_RESTAURANT_ID",
    "weekStart": "2026-02-02",
    "weekEnd": "2026-02-08"
  }'
```

Test future week (should return empty):
```bash
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "YOUR_RESTAURANT_ID",
    "weekStart": "2026-02-16",
    "weekEnd": "2026-02-22"
  }'
```

### Test Multiple Restaurants

If you have multiple restaurants, the auto-generate endpoint will create reports for all of them:

```bash
curl -X POST http://localhost:3001/api/reports/auto-generate \
  -H "x-cron-secret: YOUR_SECRET"
```

Check the response to see reports generated for each restaurant.

### Test Report Overwriting

Generate the same report twice - it should update the existing report:

```bash
# Generate first time
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "YOUR_ID", "weekStart": "2026-02-09", "weekEnd": "2026-02-15"}'

# Generate again - should update, not create duplicate
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "YOUR_ID", "weekStart": "2026-02-09", "weekEnd": "2026-02-15"}'
```

### Check Database

Query Supabase to verify reports are being stored:

```sql
-- View all reports
SELECT 
  id,
  restaurant_id,
  week_start,
  week_end,
  (report_data->>'totalHours')::float as total_hours,
  (report_data->>'totalShifts')::int as total_shifts,
  created_at
FROM weekly_reports
ORDER BY week_start DESC;

-- View report details for specific week
SELECT 
  report_data
FROM weekly_reports
WHERE week_start = '2026-02-09'
LIMIT 1;
```

## Performance Testing

### Test with Many Workers

Create a restaurant with 50+ workers and many shifts to test performance:

```bash
# This should still complete within a few seconds
time curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "YOUR_ID", "weekStart": "2026-02-09", "weekEnd": "2026-02-15"}'
```

### Test Auto-Generate with Multiple Restaurants

If you have 10+ restaurants:

```bash
time curl -X POST http://localhost:3001/api/reports/auto-generate \
  -H "x-cron-secret: YOUR_SECRET"
```

This will generate reports for all restaurants in parallel.

## Integration Testing

### Full Workflow Test

1. **Create shifts** in admin dashboard for current week
2. **Publish shifts** using the Publish button
3. **Wait until Saturday 23:00** (or adjust date range to past week)
4. **Generate report** via API or wait for cron
5. **View report** in the reports UI
6. **Verify data** matches the shifts you created

### Browser Testing

Test the UI manually:

1. Navigate to /reports
2. Select different restaurants
3. Expand/collapse worker details
4. Check responsive design on mobile
5. Verify date formatting
6. Check that hours calculations are correct

## Production Testing (Vercel)

Once deployed to Vercel:

### Test Cron Job

1. Check Vercel dashboard → Project → Settings → Crons
2. Verify cron job is listed: `/api/reports/auto-generate` at `30 23 * * 6`
3. Manually trigger or wait for Saturday 23:30
4. Check Vercel logs for execution

### Test in Production

```bash
# Test manual generation (requires auth)
curl -X POST https://your-domain.com/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"restaurantId": "YOUR_ID", "weekStart": "2026-02-09", "weekEnd": "2026-02-15"}'

# Test cron endpoint
curl -X POST https://your-domain.com/api/reports/auto-generate \
  -H "x-cron-secret: YOUR_SECRET"
```

## Cleanup After Testing

Remove test reports from database:

```sql
-- Delete all test reports
DELETE FROM weekly_reports WHERE created_at > NOW() - INTERVAL '1 day';

-- Or delete specific report
DELETE FROM weekly_reports WHERE id = 'uuid-here';
```

## Next Steps

After testing locally:

1. ✅ Verify all tests pass
2. ✅ Add CRON_SECRET to Vercel environment variables
3. ✅ Deploy to Vercel
4. ✅ Verify cron job is registered in Vercel
5. ✅ Wait for first automatic report on Saturday night
6. ✅ Check Vercel logs for any errors
7. ✅ View generated reports in production UI

## Support

If you encounter issues not covered here:

1. Check the main setup guide: `WEEKLY_REPORTS_SETUP.md`
2. Check Vercel logs for errors
3. Check Supabase logs for database errors
4. Verify environment variables are set correctly
5. Ensure you're testing with super admin account
