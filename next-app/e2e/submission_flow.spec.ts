import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Ensure env variables are loaded for the Supabase cleanup client
dotenv.config({ path: '.env.local' });

// Track titles created during the test for cleanup
const createdTitles: string[] = [];

test.describe.serial('Submission Format Workflows', () => {
  const audioTitle = `E2E Audio Submission ${Date.now()}`;
  const bothTitle = `E2E Both Submission ${Date.now()}`;

  test.afterAll(async () => {
    // Teardown using raw fetch to avoid Playwright ESM issues with Supabase SDK
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey || createdTitles.length === 0) {
      return;
    }

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    for (const title of createdTitles) {
      // Get assignment
      const res = await fetch(`${supabaseUrl}/rest/v1/assignments?title=eq.${encodeURIComponent(title)}&select=id`, { headers });
      if (!res.ok) continue;
      const assignments = await res.json();
      
      for (const assignment of assignments) {
        // Get submissions
        const subRes = await fetch(`${supabaseUrl}/rest/v1/submissions?assignment_id=eq.${assignment.id}&select=id,file_url,audio_url`, { headers });
        if (subRes.ok) {
          const submissions = await subRes.json();
          for (const sub of submissions) {
            // Delete from storage
            const deleteStorage = async (url: string) => {
              const parts = url.split('/submissions/');
              if (parts.length > 1) {
                const pathPart = parts[1].split('?')[0];
                await fetch(`${supabaseUrl}/storage/v1/object/submissions/${pathPart}`, { method: 'DELETE', headers });
              }
            };
            if (sub.file_url) await deleteStorage(sub.file_url);
            if (sub.audio_url) await deleteStorage(sub.audio_url);
          }
          // Delete submissions rows
          await fetch(`${supabaseUrl}/rest/v1/submissions?assignment_id=eq.${assignment.id}`, { method: 'DELETE', headers });
        }
        
        // Delete assignees
        await fetch(`${supabaseUrl}/rest/v1/assignment_assignees?assignment_id=eq.${assignment.id}`, { method: 'DELETE', headers });
        
        // Delete assignment
        await fetch(`${supabaseUrl}/rest/v1/assignments?id=eq.${assignment.id}`, { method: 'DELETE', headers });
      }
    }
  });

  test('Flow 1: Audio-Only Assignment Workflow', async ({ browser }) => {
    createdTitles.push(audioTitle);

    // Context 1: Teacher creates assignment
    const teacherContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();

    await teacherPage.goto('/login');
    await teacherPage.fill('input[name="username"]', 'sylvie');
    await teacherPage.fill('input[name="password"]', '123456');
    await teacherPage.click('button[type="submit"]');
    await expect(teacherPage).toHaveURL(/.*\/dashboard/);

    await teacherPage.fill('input[id="title"]', audioTitle);
    
    // Select AUDIO format
    await teacherPage.locator('div').filter({ hasText: /^AudioVoice recording$/ }).first().click();

    // Set file upload (PDF) so backend validation passes
    const pdfPath = path.resolve(process.cwd(), '__tests__/assets/pdf/test_pdf_1.pdf');
    await teacherPage.setInputFiles('input[id="document"]', pdfPath);

    // Select student
    await teacherPage.locator('label:has-text("phuonganh")').click();

    // Submit
    await teacherPage.click('button:has-text("Create Assignment")');
    try {
      await expect(teacherPage.getByText('Assignment created successfully!')).toBeVisible({ timeout: 15000 });
    } catch (e) {
      await teacherPage.screenshot({ path: 'teacher-error.png', fullPage: true });
      throw e;
    }
    const teacherViewLink = teacherPage.locator('tr').filter({ hasText: audioTitle }).locator('a:has-text("View")');
    await expect(teacherViewLink).toBeVisible({ timeout: 15000 });
    const dashboardHref = await teacherViewLink.getAttribute('href');
    const assignmentUrl = dashboardHref?.replace('/dashboard', '');

    // Context 2: Student logs in and submits audio
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();

    await studentPage.goto('/login');
    await studentPage.fill('input[name="username"]', 'phuonganh');
    await studentPage.fill('input[name="password"]', '123456');
    await studentPage.click('button[type="submit"]');
    await expect(studentPage).toHaveURL(/.*\/student/);

    // Navigate directly to the assignment page to bypass dashboard flakiness
    await studentPage.goto(assignmentUrl as string);
    await expect(studentPage).toHaveURL(new RegExp(assignmentUrl as string));

    // Verify "Submit Audio" card is visible, and "Submit Document" is NOT
    await expect(studentPage.getByText('Submit Audio')).toBeVisible();
    await expect(studentPage.getByText('Submit Document')).not.toBeVisible();

    // Switch to Upload File tab
    await studentPage.getByRole('tab', { name: 'Upload File' }).click();

    // Upload audio
    const audioPath = path.resolve(process.cwd(), '__tests__/assets/audio/test_audio_1.mp3');
    await studentPage.setInputFiles('input[id="audioFile"]', audioPath);
    await studentPage.click('button:has-text("Submit Audio")');

    // Verify success
    await expect(studentPage.getByText('Audio submitted successfully!')).toBeVisible({ timeout: 15000 });
    await expect(studentPage.getByText('Submitted Successfully!', { exact: true })).toBeVisible();

    await studentContext.close();


    // Context 1: Teacher verifies badge is locked
    await teacherPage.goto('/dashboard');
    const teacherAssignmentRow = teacherPage.locator('tr').filter({ hasText: audioTitle });
    await teacherAssignmentRow.locator('a:has-text("View")').click();
    
    // Verify badge says "Audio Only" and is locked (has the lock icon or disabled styling)
    // The format badge shows "Audio Only"
    const badge = teacherPage.locator('div', { hasText: /^Audio Only$/ }).first();
    await expect(badge).toBeVisible();
    // It should have opacity-70 or cursor-not-allowed if it's locked
    await expect(badge).toHaveClass(/cursor-not-allowed/);

    await teacherContext.close();
  });

  test('Flow 2: Multi-Step "BOTH" Workflow', async ({ browser }) => {
    createdTitles.push(bothTitle);

    // Context 1: Teacher creates BOTH assignment
    const teacherContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();

    await teacherPage.goto('/login');
    await teacherPage.fill('input[name="username"]', 'sylvie');
    await teacherPage.fill('input[name="password"]', '123456');
    await teacherPage.click('button[type="submit"]');
    
    await teacherPage.fill('input[id="title"]', bothTitle);
    
    // Select BOTH format
    await teacherPage.locator('div').filter({ hasText: /^BothDocument \+ Audio$/ }).first().click();

    // Set file upload (PDF) so backend validation passes
    const pdfPathTeacher = path.resolve(process.cwd(), '__tests__/assets/pdf/test_pdf_1.pdf');
    await teacherPage.setInputFiles('input[id="document"]', pdfPathTeacher);

    // Select student
    await teacherPage.locator('label:has-text("phuonganh")').click();

    // Submit
    await teacherPage.click('button:has-text("Create Assignment")');
    await expect(teacherPage.getByText('Assignment created successfully!')).toBeVisible({ timeout: 15000 });
    const teacherViewLinkBoth = teacherPage.locator('tr').filter({ hasText: bothTitle }).locator('a:has-text("View")');
    await expect(teacherViewLinkBoth).toBeVisible({ timeout: 15000 });
    const dashboardHrefBoth = await teacherViewLinkBoth.getAttribute('href');
    const assignmentUrlBoth = dashboardHrefBoth?.replace('/dashboard', '');
    await teacherContext.close();


    // Context 2: Student submits partial then complete
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();

    await studentPage.goto('/login');
    await studentPage.fill('input[name="username"]', 'phuonganh');
    await studentPage.fill('input[name="password"]', '123456');
    await studentPage.click('button[type="submit"]');
    await expect(studentPage).toHaveURL(/.*\/student/);

    // Navigate directly to the assignment page to bypass dashboard flakiness
    await studentPage.goto(assignmentUrlBoth as string);
    await expect(studentPage).toHaveURL(new RegExp(assignmentUrlBoth as string));

    // Verify both forms are visible initially
    await expect(studentPage.getByText('Submit Document')).toBeVisible();
    await expect(studentPage.getByText('Submit Audio')).toBeVisible();

    // 1. Submit Document Only
    const pdfPath = path.resolve(process.cwd(), '__tests__/assets/pdf/test_pdf_1.pdf');
    await studentPage.setInputFiles('input[id="document"]', pdfPath);
    await studentPage.getByRole('button', { name: /Submit /i }).first().click();

    // Wait for success toast and incomplete warning
    await expect(studentPage.getByText('Document submitted successfully!')).toBeVisible({ timeout: 15000 });
    await expect(studentPage.getByText('Incomplete Submission')).toBeVisible();
    
    // The Submit Document form should be gone, but Submit Audio should still be visible
    await expect(studentPage.getByText('Submit Document')).not.toBeVisible();
    await expect(studentPage.getByText('Submit Audio')).toBeVisible();

    // 2. Submit Audio
    await studentPage.getByRole('tab', { name: 'Upload File' }).click();
    const audioPath = path.resolve(process.cwd(), '__tests__/assets/audio/test_audio_2.mp3');
    await studentPage.setInputFiles('input[id="audioFile"]', audioPath);
    await studentPage.click('button:has-text("Submit Audio")');

    // Verify full success
    await expect(studentPage.getByText('Audio submitted successfully!')).toBeVisible({ timeout: 15000 });
    await expect(studentPage.getByText('Submitted Successfully!', { exact: true })).toBeVisible();
    await expect(studentPage.getByText('Incomplete Submission')).not.toBeVisible();

    await studentContext.close();
  });
});
