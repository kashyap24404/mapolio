// import { chromium } from 'playwright';
import { scrollUntilEnd } from '../utils/scrollUtils.js';
import { solve } from 'recaptcha-solver';

export async function searchGoogleMaps(context, query, user_id, task_id, rating) {
 
  const page = await context.newPage();

  const refinedQuery = query.replace(/ /g, '+');

  try {
    await page.goto(`https://www.google.com/maps/search/?api=1&query=${refinedQuery}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    // Check for CAPTCHA and solve if present
    const recaptchaFrame = await page.$('iframe[src*="recaptcha"]');
    if (recaptchaFrame) {
      console.log('CAPTCHA detected, attempting to click checkbox and solve...');
      const iframe = await recaptchaFrame.contentFrame();
      if (iframe) {
        const checkbox = await iframe.$('#recaptcha-anchor');
        if (checkbox) {
          await checkbox.click();
          console.log('Clicked reCAPTCHA checkbox');
        }
      }
      console.time('solve reCAPTCHA');
      await solve(page);
      console.timeEnd('solve reCAPTCHA');
      console.log('CAPTCHA solved!');
    }

    await page.waitForSelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd[aria-label]', {
      timeout: 60000
    });

    if (rating) {
      const ratingMapping = {
        '4.5+': '6',
        '4': '5',
        '3.5': '4',
        '3': '3',
        '2.5': '2',
        '2': '1'
      };

      if (rating in ratingMapping) {
        try {
          await page.click('div.Vo5ZAe div.KNfEk.siaXSd:nth-child(1) button.e2moi');
          await new Promise(resolve => setTimeout(resolve, 1000));
          await page.click(`.vij30.kA9KIf div[data-index="${ratingMapping[rating]}"]`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          console.error('Error applying rating filter:', error);
        }
      }
    }

    await scrollUntilEnd(page);

    // Instead of creating a CSV file, simply collect the links
    const linkElems = await page.$$('a.hfpxzc');
    const hrefs = await Promise.all(
      linkElems.map(async (elem) => await elem.getAttribute('href'))
    );

    // Close the page but keep the browser open
    await page.close();
    
    // Return the array of links directly
    return hrefs;
  } catch (error) {
    await page.close();
    throw error;
  }
}
