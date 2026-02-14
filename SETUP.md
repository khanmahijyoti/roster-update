# Setup Instructions

Follow these steps to get your Roster Management System running:

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: roster-management (or your choice)
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to Australia
4. Wait for the project to be created (~2 minutes)

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste it into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

This creates:
- All tables (profiles, restaurants, members, availability, shifts, reports)
- Row Level Security policies
- Triggers for shift time validation
- Indexes for performance
- Auto-profile creation on signup

## Step 3: Get API Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Find these two values:
   - **Project URL** (looks like: https://xxxxxxxxxxxxx.supabase.co)
   - **anon public** key (under "Project API keys")
3. Keep this tab open - you'll need these values in the next step

## Step 4: Configure Environment Variables

1. In this project folder, create a file called `.env.local`
2. Copy this template:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace the values with your actual credentials from Step 3
4. Save the file

**IMPORTANT**: Never commit `.env.local` to git (it's already in .gitignore)

## Step 5: Install Dependencies

Open terminal in the `roster-app` folder and run:

```bash
npm install
```

This installs:
- Next.js, React, TypeScript
- Supabase client
- TailwindCSS & Shadcn/UI
- React Query
- date-fns
- All other dependencies

## Step 6: Run Development Server

```bash
npm run dev
```

The app should now be running at **http://localhost:3000**

## Step 7: Test the Setup

1. Open http://localhost:3000 in your browser
2. You should see the landing page with "Worker Login" and "Admin Login" buttons
3. If you see this, the setup is successful!

## Next Steps

Now you're ready to:
1. Implement authentication (signup/login)
2. Create the worker availability UI
3. Build the admin roster builder
4. Add business logic and validations

## Troubleshooting

### Error: "supabase is not defined"
- Check that `.env.local` exists and has correct values
- Restart the dev server after creating/editing `.env.local`

### Error: Database connection failed
- Verify your Supabase URL and anon key are correct
- Check your Supabase project is active (not paused)

### Error: Tables not found
- Make sure you ran the entire `schema.sql` script
- Check the SQL Editor for any error messages
- Verify tables exist in **Table Editor** in Supabase dashboard

### Port 3000 already in use
- Run on a different port: `npm run dev -- -p 3001`

## Need Help?

Check the main README.md for more information about the project structure and architecture.
