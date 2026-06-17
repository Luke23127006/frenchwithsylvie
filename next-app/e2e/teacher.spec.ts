import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Teacher Workflow', () => {
  const title = `E2E Test Assignment ${Date.now()}`;

  test('Teacher can create and verify an assignment', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'sylvie');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/);

    // 2. Create Assignment
    await page.fill('input[id="title"]', title);
    
    // Set file upload (PDF)
    const pdfPath = path.resolve(process.cwd(), '__tests__/assets/pdf/test_pdf_1.pdf');
    await page.setInputFiles('input[id="document"]', pdfPath);

    // Set audio upload (optional but good to test if supported, let's just stick to PDF for simplicity)
    // Select a student
    await page.check('label:has-text("phuonganh")');

    // Submit
    await page.click('button:has-text("Create Assignment")');

    // Wait for success toast or success state
    await expect(page.getByText('Assignment created successfully!')).toBeVisible({ timeout: 15000 });

    // 3. Verify it appears in the Active list
    const assignmentRow = page.locator('tr').filter({ hasText: title });
    await expect(assignmentRow).toBeVisible();

    // 4. View Assignment Details
    await assignmentRow.locator('a:has-text("View")').click();
    await expect(page).toHaveURL(/\/dashboard\/assignment\/.*/);

    // Verify title is rendered correctly on details page
    await expect(page.locator(`text=${title}`).first()).toBeVisible();
    
    // Clean up or move to trash isn't required by user, but nice to test Hide feature
    // Let's go back and hide it
    await page.goto('/dashboard');
    const rowToHide = page.locator('tr').filter({ hasText: title });
    // Assuming the first ghost button is the Hide button (EyeOff/Eye)
    // Based on DashboardClient.tsx: "Hide from students" or "Unhide"
    await rowToHide.getByRole('button', { name: /Hide from students/ }).click();
    
    // Toast should appear
    await expect(page.getByText('Assignment hidden from students.')).toBeVisible();
    await expect(rowToHide.getByText('Hidden')).toBeVisible();
  });
});
