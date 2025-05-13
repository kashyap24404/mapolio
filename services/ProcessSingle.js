import { getStateCity } from '../utils/areaUtils.js';
import { solve } from 'recaptcha-solver';
import {
  extractTitle,
  extractAvgRating,
  extractRatingCount,
  extractAddress,
  extractWebsite,
  extractPhone,
  extractCategory,
  extractWheelchair,
  extractWorkhours
} from './fieldExtractors.js';
import { extractImages } from './imageExtractor.js';
import { extractReviews } from './reviewExtractor.js';

// No-op initializeBrowser and closeBrowser for compatibility
export async function initializeBrowser() {}
export async function closeBrowser() {}

export async function processSingleLink(link, fields, context, singleImage = true) {
  const data = Object.fromEntries(fields.map(field => [field, '']));
  const errors = {};
  const page = await context.newPage();

  // Real-time reCAPTCHA handler: solve whenever a recaptcha iframe is attached
  page.on('frameattached', async (frame) => {
    try {
      if (frame.url().includes('recaptcha')) {
        console.log('CAPTCHA iframe detected (via frameattached), solving...');
        try {
          const checkboxLocator = page.frameLocator('iframe[src*="recaptcha"]').locator('#recaptcha-anchor');
          await checkboxLocator.waitFor({ state: 'visible', timeout: 10000 });
          await checkboxLocator.click();
          console.log('Clicked reCAPTCHA checkbox using frameLocator/locator!');
        } catch (err) {
          console.log('Failed to find or click checkbox using frameLocator/locator:', err.message);
        }
        await solve(page);
        console.log('CAPTCHA solved! (frameLocator/locator)');
      }
    } catch (err) {
      console.error('Error during frameattached CAPTCHA solving:', err.message);
    }
  });
  try {
    // Navigate to the link with retry logic
    let retries = 5;
    while (retries > 0) {
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    await page.waitForSelector('h1.DUwDvf', { timeout: 60000 });

    // Step-by-step extraction using extractor map
    const extractorMap = {
      title: extractTitle,
      avg_rating: extractAvgRating,
      rating_count: extractRatingCount,
      address: extractAddress,
      website: extractWebsite,
      phone: extractPhone,
      category: extractCategory,
      wheelchair: extractWheelchair,
      workhours: extractWorkhours
    };

    for (const field of fields) {
      if (field === 'city' && fields.includes('address')) {
        // City is derived from address
        try {
          const address = data.address || await extractAddress(page);
          data.address = address;
          const { state, city } = await getStateCity(address);
          data.state = state;
          data.city = city;
        } catch (err) {
          errors.city = err.message;
          errors.state = err.message;
        }
        continue;
      }
      const extractor = extractorMap[field];
      if (extractor) {
        try {
          data[field] = await extractor(page);
        } catch (err) {
          errors[field] = err.message;
        }
      }
    }

    if (fields.includes('reviews')) {
      try {
        const { reviews, error } = await extractReviews(page, 100);
        data.reviews = reviews;
        if (error) errors.reviews = error;
      } catch (err) {
        data.reviews = '';
        errors.reviews = err.message;
      }
    }

    if (fields.includes('images')) {
      try {
        const { images, error } = await extractImages(page, singleImage);
        data.images = images;
        if (error) errors.images = error;
      } catch (err) {
        data.images = '';
        errors.images = err.message;
      }
    }

    console.log('Extracted data:', data);
    console.log('Extraction errors:', errors);
    return { data, errors };
  } catch (error) {
    throw error;
  } finally {
    await page.close();
  }
}
