# Weekly Reports Setup Guide

## Overview

The Weekly Reports system automatically generates detailed reports every Saturday night at 23:30, showing worker hours, shifts, and locations for the completed week.

## Features

- **Automatic Generation**: Reports are auto-generated every Saturday at 23:30 via Vercel cron job
- **Manual Generation**: Admin can also trigger report generation via API
- **Historical Reports**: View all past reports organized by week
- **Worker Details**: Each report shows total hours, shift count, and detailed shift breakdown per worker
- **Restaurant-Specific**: Reports are generated per restaurant

## Setup Instructions

### 1. Environment Variable

Add the following to your `.env.local` file (for local development) and Vercel environment variables (for production):

```bash
CRON_SECRET=your-random-secret-here
```

**Generate a secure random secret:**

```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use an online generator:
# https://generate-secret.vercel.app/32
```

### 2. Vercel Configuration

The `vercel.json` file is already configured with the cron schedule:

```json
{
  "crons": [
    {
      "path": "/api/reports/auto-generate",
      "schedule": "30 23 * * 6"
    }
  ]
}
```

This runs every **Saturday at 23:30** (cron format: `30 23 * * 6`)

### 3. Add Environment Variable to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: Your generated secret from step 1
   - **Environment**: Production (and Preview/Development if needed)
4. Click **Save**
5. Redeploy your application for changes to take effect

### 4. Deploy

After adding the environment variable:

```bash
git add .
git commit -m "Add weekly reports system with cron job"
git push
```

Vercel will automatically deploy and configure the cron job.

## API Endpoints

### Auto-Generate Reports (Cron Job)

**Endpoint**: `POST /api/reports/auto-generate`

**Authentication**: Requires `x-cron-secret` header matching `CRON_SECRET` env var

**Description**: Generates reports for all restaurants for the most recent completed week (Monday-Sunday).

**Usage**:
```bash
curl -X POST https://your-domain.com/api/reports/auto-generate \
  -H "x-cron-secret: your-secret-here"
```

### Manual Report Generation

**Endpoint**: `POST /api/reports/generate`

**Authentication**: Requires authenticated super admin user

**Body**:
```json
{
  "restaurantId": "uuid-here",
  "weekStart": "2026-02-09",
  "weekEnd": "2026-02-15"
}
```

**Description**: Generates a report for a specific restaurant and week range.

**Usage**:
```bash
curl -X POST https://your-domain.com/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "restaurantId": "uuid-here",
    "weekStart": "2026-02-09",
    "weekEnd": "2026-02-15"
  }'
```

## Viewing Reports

Admin users can view all historical reports:

1. Log in to the admin dashboard
2. Click the **"View Reports"** button in the header
3. Select a restaurant from the dropdown
4. Browse reports by week
5. Expand each worker to see detailed shift information

## Testing

### Test Report Generation Locally

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Generate a test report using curl or Postman:
   ```bash
   curl -X POST http://localhost:3001/api/reports/generate \
     -H "Content-Type: application/json" \
     -d '{
       "restaurantId": "your-restaurant-id",
       "weekStart": "2026-02-09",
       "weekEnd": "2026-02-15"
     }'
   ```

3. View the generated report at: http://localhost:3001/reports

### Test Cron Endpoint Locally

```bash
curl -X POST http://localhost:3001/api/reports/auto-generate \
  -H "x-cron-secret: your-local-secret"
```

## Troubleshooting

### Cron Job Not Running

- Verify `vercel.json` is in the root of your project
- Check Vercel dashboard → Project → Settings → Crons to see if it's registered
- Ensure the project is deployed (crons don't run in preview deployments by default)
- Check Vercel logs for any errors

### 401 Unauthorized on Cron Endpoint

- Verify `CRON_SECRET` environment variable is set in Vercel
- Ensure the `x-cron-secret` header matches the environment variable
- Check that the secret doesn't have extra whitespace or newlines

### Reports Not Generating

- Check Supabase logs for any database errors
- Verify the `weekly_reports` table exists in your database
- Ensure shifts exist for the week being reported
- Check API response for specific error messages

### Empty Reports

- Verify shifts have `status = 'published'` (draft shifts are excluded)
- Ensure shifts are assigned to workers (worker_id is not null)
- Check that the date range includes the shifts

## Database Schema

The `weekly_reports` table structure:

```sql
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

The `report_data` JSONB structure:

```typescript
{
  workers: [
    {
      workerId: string
      workerName: string
      workerEmail: string
      totalHours: number
      shiftCount: number
      shifts: [
        {
          date: string
          startTime: string
          endTime: string
          hours: number
          location: string
        }
      ]
    }
  ]
  totalHours: number
  totalShifts: number
}
```

## Maintenance

### Changing Cron Schedule

Edit `vercel.json` and update the `schedule` field:

```json
{
  "crons": [
    {
      "path": "/api/reports/auto-generate",
      "schedule": "0 0 * * 0"  // Example: Every Sunday at midnight
    }
  ]
}
```

Cron format: `minute hour day-of-month month day-of-week`

Common schedules:
- `0 0 * * 0` - Every Sunday at midnight
- `30 23 * * 6` - Every Saturday at 23:30
- `0 9 * * 1` - Every Monday at 9:00 AM

### Regenerating Reports

To regenerate a report for a specific week:

1. Delete the old report from the database (optional)
2. Call the `/api/reports/generate` endpoint with the desired date range
3. The new report will replace any existing report for that restaurant/week combination

## Security

- The cron endpoint is protected by a secret header to prevent unauthorized access
- Manual report generation requires super admin authentication
- Reports are only visible to authenticated super admin users
- All API calls are logged for audit purposes

## Performance

- Report generation is async and happens in the background
- Large restaurants with many workers may take a few seconds to generate
- Reports are cached in the database, so viewing historical reports is instant
- Consider adding pagination if you have hundreds of reports

## Future Enhancements

Potential improvements:
- Email notifications when reports are generated
- PDF export functionality
- Charts and visualizations for worker hours
- Comparison between weeks/months
- Worker performance metrics
- Export to CSV for payroll systems
