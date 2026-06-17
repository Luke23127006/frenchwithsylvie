import { test, expect } from '@playwright/test';

test.describe('Auth Workflow', () => {
  test('User can change password and logout', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'luke');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/student/);

    // 2. Logout
    const userMenuButton = page.locator('button:has-text("luke")').or(page.locator('button:has-text("L")').first());
    await userMenuButton.click();
    await page.getByText('Logout').click();

    await expect(page).toHaveURL(/.*\/login/);
  });
});
