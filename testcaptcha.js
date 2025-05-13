import { chromium } from 'playwright';
import { solve } from 'recaptcha-solver';

const TEST_URL = 'https://www.google.com/recaptcha/api2/demo';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    locale: "en-US"
  });
  const page = await context.newPage();

  try {
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 5000000 });
    console.log('Page loaded. Waiting for recaptcha iframe...');
    // Wait for the recaptcha iframe to appear
    const iframeHandle = await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 60000 });
    if (iframeHandle) {
      console.log('Recaptcha iframe found!');
      const outerHTML = await iframeHandle.evaluate(el => el.outerHTML);
      console.log('Captured iframe tag:', outerHTML);
      // Use frameLocator to interact with the checkbox
      try {
        const checkboxLocator = page.frameLocator('iframe[src*="recaptcha"]').locator('#recaptcha-anchor');
        await checkboxLocator.waitFor({ state: 'visible', timeout: 10000 });
        await checkboxLocator.click();
        console.log('Clicked reCAPTCHA checkbox using frameLocator/locator!');
      } catch (err) {
        console.log('Failed to find or click checkbox using frameLocator/locator:', err.message);
      }
      await solve(page);
      console.log('CAPTCHA solved! (iframe/contentFrame)');
    } else {
      console.log('No recaptcha iframe found on page.');
    }
    // Optionally wait for user input or a selector to confirm solve
    await page.waitForTimeout(5000000); // Wait 1 minute for demo
  } catch (err) {
    console.error('Error during navigation or CAPTCHA solving:', err.message);
  }

  await browser.close();
})();

