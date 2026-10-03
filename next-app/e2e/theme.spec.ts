import { test, expect } from "@playwright/test";

test("theme bootstrap, persistence, and hotkey work without script or hydration warnings", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => {
    if (!localStorage.getItem("theme")) localStorage.setItem("theme", "dark");
  });
  const response = await page.goto("/login");
  expect(await response!.text()).toMatch(/<script[^>]*type="text\/javascript"[^>]*>[\s\S]*?localStorage/);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("d");
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.locator('input[name="username"]').fill("d");
  await page.locator('input[name="username"]').press("d");
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
  expect(errors.filter((error) => /Encountered a script tag|hydration|didn't match/i.test(error))).toEqual([]);
});
