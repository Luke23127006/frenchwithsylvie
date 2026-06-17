const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="username"]', 'sylvie');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  const errorLocator = page.locator('.text-destructive');
  if (await errorLocator.count() > 0) {
    const errorText = await errorLocator.first().textContent();
    console.log("UI ERROR:", errorText);
  } else {
    console.log("NO ERROR FOUND. Current URL:", page.url());
  }
  await browser.close();
})();
