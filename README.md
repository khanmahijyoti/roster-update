# Roster Management System

A multi-tenant workforce management SaaS for hospitality businesses in Australia.

## Features

- Multi-location restaurant management
- Worker availability tracking (Morning/Afternoon toggles)
- Admin roster builder with drag-and-drop
- Strict operational hours (08:00 - 23:00)
- Automatic availability lockout (Saturday 23:00)
- Weekly payroll reports
- Global shift conflict detection

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **State Management**: React Query (TanStack Query)
- **Date/Time**: date-fns
- **UI Components**: Shadcn/UI, Lucide Icons

## Getting Started

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (https://supabase.com)

### 2. Set up Supabase

1. Create a new Supabase project at https://supabase.com
2. Copy your project URL and anon key from Settings > API
3. Go to the SQL Editor in your Supabase dashboard
4. Copy and paste the contents of `supabase/schema.sql`
5. Run the script to create all tables, triggers, and policies

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
roster-app/
├── app/                    # Next.js 14 App Router
│   ├── auth/              # Authentication pages
│   ├── worker/            # Worker dashboard
│   ├── admin/             # Admin roster builder
│   └── api/               # API routes
├── components/            # React components
│   └── ui/                # Shadcn/UI components
├── lib/                   # Libraries and utilities
│   └── supabase/          # Supabase clients
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
└── supabase/             # Database schema
```

## Key Concepts

### Week Definitions

- **Current Week**: The ongoing Monday-Sunday period containing today (read-only for workers)
- **Next Week**: The upcoming Monday-Sunday period (editable until Saturday 23:00)

### Availability System

- **Default**: Workers are available by default (opt-out model)
- **No row in database** = Available for both Morning (08:00-14:00) and Afternoon (14:00-23:00)
- Workers toggle specific periods when they're unavailable

### Shift Status

- **Draft**: Admin is building the roster (workers cannot see)
- **Published**: Workers can view their assigned shifts

### Conflict Detection

- **Available** (🟢): No conflicts, worker marked available
- **Preference Warning** (🟠): Worker unavailable but admin can override
- **Globally Busy** (🔴): Worker has shift at another restaurant (blocked)

## Development Roadmap

### Phase 1: Core MVP ✅
- [x] Project setup
- [x] Database schema
- [ ] Authentication
- [ ] Availability input UI
- [ ] Basic shift creation

### Phase 2: Business Logic
- [ ] Shift time constraints
- [ ] Draft/Publish workflow
- [ ] Lockout validation

### Phase 3: Advanced Features
- [ ] Drag-and-drop roster builder
- [ ] Weekly report automation
- [ ] Notification system

### Phase 4: Polish
- [ ] Mobile responsive design
- [ ] Report exports (CSV/PDF)
- [ ] Performance optimization

## Database Schema

See `supabase/schema.sql` for the complete database schema with:
- Tables for profiles, restaurants, memberships, availability, shifts, and reports
- Row Level Security (RLS) policies
- Triggers for shift time validation
- Indexes for performance

## Contributing

This is a private project for development purposes.

## License

Proprietary - All rights reserved
