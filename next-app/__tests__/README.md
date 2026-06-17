# Testing & Database Operations

This document contains useful commands for running End-to-End tests and cleaning up the database if needed.

## Running Playwright E2E Tests

The Playwright tests are located in the `e2e/` directory and test the core application workflows (Teacher, Student, Auth) using your local Supabase database.

### 1. Run All Tests Headlessly
Run all test suites in the background. Results will be shown in the terminal.
```bash
npm run test:e2e
```

### 2. Run Tests with UI (Recommended for debugging)
Opens the Playwright UI mode, allowing you to step through tests visually.
```bash
npm run test:e2e:ui
```

### 3. Run a Specific Test File
```bash
npx playwright test e2e/teacher.spec.ts
```

---

## Database Cleanup (Optional)

As per your request, the E2E tests do not automatically clean up the database so that you can inspect the generated assignments and submissions. Over time, your local database might get cluttered with test assignments (e.g., "E2E Test Assignment...").

If you want to clear out this test data and start fresh, you can reset your local Supabase database and re-run your seed script.

### Reset Local Database
Run the following command in your terminal from the `next-app` directory:
```bash
npx supabase db reset
```
*Note: This command resets the local database and automatically applies your migrations and `supabase/seed.sql`.*

If you only want to manually clean up test data without resetting the whole database, you can use the Supabase Studio UI available locally (typically at `http://127.0.0.1:54323`).
