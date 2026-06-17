import { test, expect } from '@playwright/test';

test.describe('E2E actions test (Pre/Post Refactor)', () => {
  test('Teacher can login and view dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'sylvie');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.getByText('Sylvie Dupont').first()).toBeVisible();
  });
});
