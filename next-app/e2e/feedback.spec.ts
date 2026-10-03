import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

test("teacher PDF feedback requires a grade and is private, editable, and removable", async ({ browser }) => {
  test.setTimeout(180000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  expect(new URL(url).hostname, "This fixture test must only use local Supabase").toMatch(/^(127\.0\.0\.1|localhost)$/);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  async function db<T = Record<string, unknown>[]>(table: string, method = "GET", query = "", body?: unknown): Promise<T> {
    const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
      method, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
  const teacherId = randomUUID(), studentId = randomUUID(), otherId = randomUUID();
  const assignmentId = randomUUID(), submissionId = randomUUID(), otherSubmissionId = randomUUID();
  const contexts: BrowserContext[] = [];
  const buffer = readFileSync("__tests__/assets/pdf/test_pdf_1.pdf");
  const file = (name: string) => ({ name, mimeType: "application/pdf", buffer });
  async function context(id: string, role: "teacher" | "student") {
    const ctx = await browser.newContext(); contexts.push(ctx);
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ id, role, username: `feedback-${id}`, full_name: role, state: "COMPLETED", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
    const signature = createHmac("sha256", process.env.JWT_SECRET!).update(`${header}.${payload}`).digest("base64url");
    const token = `${header}.${payload}.${signature}`;
    await ctx.addCookies([{ name: "auth_token", value: token, domain: "localhost", path: "/" }]);
    return ctx;
  }
  async function saved() {
    const data = await db("submissions", "GET", `id=eq.${submissionId}&select=grade,numeric_grade,feedback`);
    return data[0];
  }
  try {
    await db("users", "POST", "", [
      { id: teacherId, full_name: "Feedback Test Teacher", role: "teacher" },
      { id: studentId, full_name: "Feedback Test Student", role: "student" },
      { id: otherId, full_name: "Feedback Other Student", role: "student" },
    ].map((user) => ({ ...user, username: `feedback-${user.id}`, password_hash: "unused-test-login", state: "COMPLETED" })));
    await db("assignments", "POST", "", { id: assignmentId, title: "Feedback PDF browser test", created_by: teacherId });
    await db("assignment_assignees", "POST", "", [studentId, otherId].map((id) => ({ assignment_id: assignmentId, student_id: id })));
    await db("submissions", "POST", "", [
      { id: submissionId, student_id: studentId }, { id: otherSubmissionId, student_id: otherId },
    ].map((s) => ({ ...s, assignment_id: assignmentId, student_name: "Feedback test", file_url: "http://localhost:3000/favicon.ico" })));

    const teacher = await (await context(teacherId, "teacher")).newPage();
    const teacherPath = `/dashboard/assignment/${assignmentId}`;
    let saveAction = "", uploadAction = "", fileAction = "";
    teacher.on("request", (request) => {
      const action = request.headers()["next-action"];
      const body = request.postData() || "";
      if (action && body.includes('"attachmentIds"')) saveAction = action;
      if (action && body.includes('"fileSize"')) uploadAction = action;
      if (action && body.includes('"attachmentId"')) fileAction = action;
    });
    await teacher.goto(teacherPath);
    await teacher.getByRole("button").filter({ hasText: "Feedback Test Student" }).click();
    await expect(teacher.getByRole("button", { name: "Add PDFs" })).toBeEnabled();
    await teacher.locator("#feedback-pdfs").setInputFiles(file("corrections.pdf"));
    await teacher.getByRole("button", { name: "Save Review", exact: true }).click();
    await expect(teacher.locator('p[role="alert"]')).toContainText("grade from 0 to 100 is required");
    expect((await saved()).grade).toBeNull();

    // Failed uploads must keep the old review unchanged and support retry.
    await teacher.locator("#grade").fill("90");
    await teacher.route("**/storage/v1/object/upload/sign/feedback/**", (route) => route.abort());
    await teacher.getByRole("button", { name: "Save Review", exact: true }).click();
    await expect(teacher.locator('p[role="alert"]')).toContainText("Network error uploading");
    expect((await saved()).grade).toBeNull();
    const pending = await db("feedback_attachments", "GET", `submission_id=eq.${submissionId}&select=id,published_at`);
    expect(pending.every((row) => row.published_at === null)).toBe(true);
    await teacher.unroute("**/storage/v1/object/upload/sign/feedback/**");
    await teacher.getByRole("button", { name: "Save Review", exact: true }).click();
    await expect(teacher.getByText("Grade, feedback, and PDFs saved.")).toBeVisible();
    expect(await saved()).toMatchObject({ grade: "90", numeric_grade: 90 });
    await expect(teacher.getByRole("button").filter({ hasText: "Feedback Test Student" })).toContainText("90/100");

    // Required-grade validation is enforced even when bypassing the form.
    expect(saveAction).toBeTruthy();
    const rejected = await teacher.request.post(teacherPath, {
      headers: { "Next-Action": saveAction, "Content-Type": "text/plain;charset=UTF-8" },
      data: JSON.stringify([{ submissionId, grade: "", feedback: "PDF feedback", attachmentIds: [] }]),
    });
    expect(await rejected.text()).toContain("Invalid input");
    expect((await saved()).grade).toBe("90");

    const published = (await db("feedback_attachments", "GET", `submission_id=eq.${submissionId}&published_at=not.is.null&select=id,storage_path`))[0];
    expect(published).toBeDefined();
    const publicDownload = await teacher.request.get(`${url}/storage/v1/object/public/feedback/${published.storage_path}`);
    expect(publicDownload.ok()).toBe(false);
    await teacher.getByRole("region", { name: "Grading and feedback" }).getByRole("button", { name: "Preview", exact: true }).click();
    await expect(teacher.getByRole("dialog")).toBeVisible();
    await teacher.getByRole("button", { name: "Close", exact: true }).click();

    const other = await (await context(otherId, "student")).newPage();
    await other.goto(`/assignment/${assignmentId}`);
    const deniedFile = await other.request.post(`/assignment/${assignmentId}`, {
      headers: { "Next-Action": fileAction, "Content-Type": "text/plain;charset=UTF-8" },
      data: JSON.stringify([{ attachmentId: published.id, download: false }]),
    });
    expect(await deniedFile.text()).toContain("You cannot access this feedback");
    const deniedUpload = await other.request.post(`/assignment/${assignmentId}`, {
      headers: { "Next-Action": uploadAction, "Content-Type": "text/plain;charset=UTF-8" },
      data: JSON.stringify([{ submissionId, fileName: "attack.pdf", fileSize: buffer.length }]),
    });
    const uploadDenial = await deniedUpload.text();
    // Next forwards this teacher-only action to the dashboard worker, where the
    // proxy blocks the student. Its non-RSC response becomes {} in action-handler.
    expect(uploadDenial === "{}" || uploadDenial.includes("Unauthorized")).toBe(true);
    expect(uploadDenial).not.toContain("signedUrl");
    const blockedTeacherRoute = await other.request.post(teacherPath, {
      maxRedirects: 0,
      headers: { "Next-Action": uploadAction, "Content-Type": "text/plain;charset=UTF-8" },
      data: JSON.stringify([{ submissionId, fileName: "attack.pdf", fileSize: buffer.length }]),
    });
    expect(blockedTeacherRoute.status()).toBe(307);
    expect(new URL(blockedTeacherRoute.headers().location, "http://localhost:3000").pathname).toBe("/student");
    expect(await db("feedback_attachments", "GET", `submission_id=eq.${submissionId}&file_name=eq.attack.pdf`)).toHaveLength(0);

    const student = await (await context(studentId, "student")).newPage();
    await student.goto(`/assignment/${assignmentId}`);
    await expect(student.getByText("Teacher Feedback PDFs", { exact: true })).toBeVisible();
    await expect(student.getByText("corrections.pdf", { exact: true })).toBeVisible();
    await student.getByRole("button", { name: "Preview", exact: true }).click();
    const previewUrl = await student.getByRole("dialog").locator("iframe").getAttribute("src");
    expect((await student.request.get(previewUrl!)).ok()).toBe(true);
    await student.getByRole("button", { name: "Close", exact: true }).click();
    const downloadPromise = student.waitForEvent("download");
    await student.getByRole("button", { name: "Download", exact: true }).click();
    expect((await downloadPromise).suggestedFilename()).toBe("corrections.pdf");

    // Invalid PDFs cannot replace the existing saved grade or attachments.
    await teacher.locator("#grade").fill("80");
    await teacher.locator("#feedback-pdfs").setInputFiles({ name: "invalid.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a PDF") });
    await teacher.getByRole("button", { name: "Save Review", exact: true }).click();
    await expect(teacher.locator('p[role="alert"]')).toContainText("not a valid PDF");
    expect((await saved()).grade).toBe("90");
    await teacher.getByRole("button", { name: "Remove PDF", exact: true }).last().click();

    // Saving a replacement updates both analytics pages, including a zero grade.
    await teacher.getByRole("button", { name: "Remove PDF", exact: true }).click();
    await teacher.locator("#feedback-pdfs").setInputFiles(file("replacement.pdf"));
    await teacher.locator("#grade").fill("0");
    await teacher.getByRole("button", { name: "Save Review", exact: true }).click();
    await expect(teacher.getByText("replacement.pdf", { exact: false }).first()).toBeVisible();
    await expect.poll(async () => (await saved()).grade).toBe("0");
    const report = await teacher.context().newPage();
    await report.goto(`/dashboard/analytics/${studentId}`);
    await expect(report.getByText("Overall Average", { exact: true }).locator("..")).toContainText("0.00");
    await report.goto("/dashboard/analytics");
    await expect(report.locator("tbody tr").filter({ hasText: "Feedback Test Student" }).locator("td").nth(4)).toHaveText("0.00");

    // Switching students protects unsaved changes.
    await teacher.locator("#grade").fill("10");
    teacher.once("dialog", (dialog) => dialog.dismiss());
    await teacher.getByRole("button").filter({ hasText: "Feedback Other Student" }).click();
    await expect(teacher.locator("#grade")).toHaveValue("10");
    await teacher.locator("#grade").fill("0");
    teacher.once("dialog", (dialog) => dialog.accept());
    await teacher.getByRole("button", { name: "Remove Review", exact: true }).click();
    await expect(teacher.getByText("Review removed.", { exact: true })).toBeVisible();
    expect(await saved()).toMatchObject({ grade: null, numeric_grade: null, feedback: null });
    await student.reload();
    await expect(student.getByText("Teacher Feedback PDFs", { exact: true })).toHaveCount(0);
  } finally {
    for (const ctx of contexts) await ctx.close();
    // Scope cleanup strictly to this test's generated submission IDs.
    const ids = [submissionId, otherSubmissionId];
    await db("submissions", "DELETE", `id=in.(${ids.join(",")})`);
    await db("assignments", "DELETE", `id=eq.${assignmentId}`);
    for (const id of ids) {
      const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
      const response = await fetch(`${url}/storage/v1/object/list/feedback`, { method: "POST", headers, body: JSON.stringify({ prefix: id, limit: 100 }) });
      const files: { name: string }[] = await response.json();
      if (files.length) {
        const removed = await fetch(`${url}/storage/v1/object/feedback`, { method: "DELETE", headers, body: JSON.stringify({ prefixes: files.map((f) => `${id}/${f.name}`) }) });
        expect(removed.ok).toBe(true);
      }
      await db("feedback_storage_cleanup", "DELETE", `storage_path=like.${id}/*`);
    }
    await db("in_app_notifications", "DELETE", `user_id=in.(${teacherId},${studentId},${otherId})`);
    await db("users", "DELETE", `id=in.(${teacherId},${studentId},${otherId})`);
  }
});
