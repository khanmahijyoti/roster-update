# Roster Mobile (Expo)

This is the React Native mobile client for the roster platform.

## Prerequisites

- Node.js 18+
- Expo Go app on your phone (or Android/iOS emulator)

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Fill in your Supabase values in `.env`:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the app:

   ```bash
   npm run start
   ```

## Current Screens

- Sign in (`/(auth)/login`)
- Create account (`/(auth)/signup`)
- Authenticated home (`/(app)`) with sign out

## Notes

- Routing is powered by Expo Router.
- Auth state is persisted using AsyncStorage.
- Supabase session handling is in `context/session-context.tsx`.
