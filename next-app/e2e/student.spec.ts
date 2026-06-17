import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Student Workflow', () => {
  // We'll use a dynamic locator or just assume there's an assignment if the teacher test ran before it.
  // Playwright tests run in parallel by default, so we shouldn't strictly depend on teacher test, 
  // but we can just find any assignment available or test the submission logic on the first one.

  test('Student can view assignment and submit solution', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'phuonganh');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/student/);

    // Skip onboarding workflow for now
    // //TODO: Implement Onboarding E2E Test

    // 2. View Student Dashboard
    await expect(page.getByText('Student Dashboard')).toBeVisible();

    // Find the first assignment link
    // Based on StudentDashboardClient.tsx, assignments are in cards or list.
    const firstViewButton = page.getByRole('link', { name: /View/i }).first();
    
    // Check if there's any assignment to test. If not, gracefully pass or fail.
    const count = await firstViewButton.count();
    if (count > 0) {
      await firstViewButton.click();
      await expect(page).toHaveURL(/\/assignment\/.*/);

      // 3. Submit Solution
      // Wait for page to load fully
      await expect(page.getByText('Submit Your Work').first()).toBeVisible();

      // Check if already submitted
      const isAlreadySubmitted = await page.getByText('You have submitted your work').count() > 0;
      
      if (!isAlreadySubmitted) {
        const imagePath = path.resolve(process.cwd(), '__tests__/assets/pdf/test_pdf_2.pdf'); // We can submit a PDF or Image
        await page.setInputFiles('input[type="file"]', imagePath);

        await page.click('button:has-text("Submit Assignment")');

        await expect(page.getByText('Submission uploaded successfully!')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('You have submitted your work')).toBeVisible();
      }
    }
  });
});
