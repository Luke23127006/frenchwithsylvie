# Supabase Local Development Commands

This document contains useful commands for managing the Supabase local environment and database.

## Essential Commands

### Start Local Database
Starts the local Supabase environment (database, API, Studio, etc.).
```bash
supabase start
```

### Stop Local Database
Stops all running local Supabase containers.
```bash
supabase stop
```

### View Status
Shows the status of the local Supabase containers and provides the local URL and keys.
```bash
supabase status
```

## Database Migrations

### Apply Migrations Locally
Applies any pending migrations to your local database.
```bash
supabase migration up
```

### Apply Migrations to Production
Pushes local database migrations to the remote (production) database.
```bash
supabase db push
```

### Create a New Migration
Creates a new empty migration file in the `supabase/migrations` directory.
```bash
supabase migration new <migration_name>
```

### Reset Local Database
Resets the local database to the current migrations (drops all data and schemas, then reapplies migrations). Useful for testing a clean state.
```bash
supabase db reset
```

## Type Generation

### Generate TypeScript Types
Generates TypeScript types from your local database schema, useful for Next.js and Supabase client typing.
```bash
supabase gen types typescript --local > types/supabase.ts
```
*(Adjust the output path `types/supabase.ts` depending on where your project expects the types file).*

## Linking Project

### Link to Remote Project
Links your local repository to a remote Supabase project. Required before pushing database changes.
```bash
supabase link --project-ref <project-id>
```