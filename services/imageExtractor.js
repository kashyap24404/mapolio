// Utility for extracting images from a Google Maps business page using Playwright
import { scrollUntilImagesStop } from '../utils/scrollUtils.js';

function extractBackgroundImageUrl(styleValue) {
  const match = styleValue.match(/url\("?(.*?)"?\)/);
  return match ? match[1] : '';
}

function convertToHd(url) {
  return url.replace(/=w\d+-h\d+-k-no/, '=s4196-v1');
}

/**
 * Extract images from the page, with retries and scrolling if needed.
 * @param {import('playwright').Page} page
 * @param {boolean} singleImage
 * @returns {Promise<{images: string, error?: string}>}
 */
export async function extractImages(page, singleImage = false) {
  let imageRetries = 3;
  let images = '';
  let lastError = null;
  while (imageRetries > 0) {
    try {
      let clickedElement = false;
      // Try clicking primary button or fallbacks
      try {
        const primaryButton = await page.waitForSelector('button.aoRNLd', { timeout: 5000, visible: true });
        if (primaryButton) {
          await primaryButton.click();
          clickedElement = true;
          await delay(3000);
        }
      } catch {}
      if (!clickedElement) {
        try {
          const fallback1 = await page.$('div.YkuOqf');
          if (fallback1) {
            await fallback1.click();
            clickedElement = true;
            await delay(2000);
          }
        } catch {}
      }
      if (!clickedElement) {
        try {
          const fallback2 = await page.$('div.RZ66Rb.FgCUCc img');
          if (fallback2) {
            await fallback2.click();
            clickedElement = true;
            await delay(2000);
          }
        } catch {}
      }

      try {
        const emptyPaneLocator = page.locator('div[jstcache="0"] div.vasquette.pane-empty-mode');

        if (await emptyPaneLocator.isVisible({ timeout: 10000 })) {

          const metaImageLocator = page.locator("meta[itemprop='image'][content]");
          const mainImageUrl = await metaImageLocator.getAttribute('content');

          if (mainImageUrl) {
            images = mainImageUrl;
            return { images };
          }
        }
      } catch (e) {
        console.warn('No single image found in meta tag:', e);
      }

      // Wait for images to load
      await page.waitForSelector('.U39Pmb[style]', { timeout: 20000 });
      // Extract image URLs
      const imageElems = await page.$$('.U39Pmb[style]');
      const imageUrls = await Promise.all(imageElems.map(async (elem) => {
        const styleValue = await elem.getAttribute('style');
        return styleValue ? extractBackgroundImageUrl(styleValue) : '';
      }));
      if (singleImage) {
        const firstValidImage = imageUrls.find(url => url && url.trim() !== '//:0');
        images = firstValidImage ? convertToHd(firstValidImage) : '';
      } else {
        await scrollUntilImagesStop(page);
        await delay(2000);
        const scrolledImageElems = await page.$$('.U39Pmb[style]');
        const scrolledImageUrls = await Promise.all(scrolledImageElems.map(async (elem) => {
          const styleValue = await elem.getAttribute('style');
          return styleValue ? extractBackgroundImageUrl(styleValue) : '';
        }));
        images = scrolledImageUrls
          .filter(url => url && url.trim() !== '//:0')
          .map(convertToHd)
          .join(',');
      }
      return { images };
    } catch (error) {
      imageRetries--;
      lastError = error;
      if (imageRetries === 0) {
        return { images: '', error: error.message };
      } else {
        try {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForSelector('h1.DUwDvf', { timeout: 60000 });
          await delay(3000);
        } catch (reloadError) {
          return { images: '', error: reloadError.message };
        }
      }
    }
  }
  return { images: '', error: lastError ? lastError.message : 'Unknown error' };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
