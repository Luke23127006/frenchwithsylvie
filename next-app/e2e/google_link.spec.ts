import { test, expect } from '@playwright/test';

test.describe('Notification Settings Google Linking', () => {
  test('Cross-site redirect from Google OAuth should not lose session', async ({ page }) => {
    // 1. Log in as a student to establish a session
    await page.goto('/login');
    await page.fill('input[name="username"]', 'luke');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    // Wait for the dashboard to load, ensuring the cookie is set
    await expect(page).toHaveURL(/\/student/);

    // Verify the auth_token cookie is present
    const cookies = await page.context().cookies();
    const authTokenCookie = cookies.find(c => c.name === 'auth_token');
    expect(authTokenCookie).toBeDefined();

    // 2. Simulate a cross-site navigation (like Google OAuth)
    // We navigate to a completely different origin (example.com)
    await page.goto('https://example.com');

    // Now navigate back to the callback route as if Google redirected us back
    // We add a mock code. Since we don't actually hit Google, the token exchange will fail, 
    // but the point is we should hit the "google_token_exchange_failed" error, NOT the "/login" redirect!
    // If the cookie is dropped (e.g. SameSite: strict), it will redirect to /login.
    // If the cookie is sent (SameSite: lax), it will reach the exchange step and redirect to /student?error=google_token_exchange_failed (actually /dashboard?error=...)
    
    await page.goto('http://localhost:3000/api/auth/google/callback?code=mock_code');

    // 3. Verify the outcome
    // If the bug exists (auth_token dropped), we will be at /login
    // If the bug is fixed, we will be at /dashboard?error=google_token_exchange_failed
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/error=google_token_exchange_failed/);
  });
});
