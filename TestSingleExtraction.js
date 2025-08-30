// TestSingleExtraction.js
// Standalone test script to process a single hardcoded link and log the result.

import { MainDataPro } from './services/MainDataPro.js';
import { processSingleLink } from './services/ProcessSingle.js';
import { chromium } from 'playwright';

// Use a hardcoded array for testing
const uniqueGoogleSearchLinks = ['https://www.google.com/maps/place/The+Loot+Company/@44.7864633,-69.3983451,17z/data=!3m1!5s0x4cb1d7785cb9ee5f:0xc99bb690b9e16fc9!4m15!1m8!3m7!1s0x4cb1d7005bbb4a39:0x4a425103b906d36b!2sThe+Loot+Company!8m2!3d44.7866452!4d-69.3983769!10e5!16s%2Fg%2F11wqc8rfyr!3m5!1s0x4cb1d7005bbb4a39:0x4a425103b906d36b!8m2!3d44.7866452!4d-69.3983769!16s%2Fg%2F11wqc8rfyr?entry=ttu&g_ep=EgoyMDI1MDcyMS4wIKXMDSoASAFQAw%3D%3D'];

// Define the fields you want to extract (customize as needed)
const listFields = [
  'title',
  'avg_rating',
  'rating_count',
  'address',
  'city',
  'state',
  'postcode',
  'website',
  'phone',
  'category',
  'permanently_closed',
  'wheelchair',
  'workhours',
  'social_web_links',
  'images',
  'google_map_link',
  'latitude',
  'longitude',
  'reviews'
];

async function initializeBrowser() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  });
  return { browser, context };
}

async function closeBrowser(browser) {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing the browser:', error);
    }
  }
}

(async () => {
  let browser;
  try {
    const { browser: newBrowser, context } = await initializeBrowser();
    browser = newBrowser;

    console.log('Processing link:', uniqueGoogleSearchLinks[0]);

    const processingOptions = {
      singleImage: true,
      conditionalScraping: {
        enabled: false,
        keyField: 'category',
        targetValue: 'Indoor Playground',
        heavyFields: ['reviews', 'images'],
        skipmissmatch: true
      }
    };

    // Since we have only one link, we process it directly.
    const link = uniqueGoogleSearchLinks[0];
    const mainDataPro = new MainDataPro();
    const promise = mainDataPro.processData(link, listFields, context, processingOptions)
      .then(result => {
        if (result) {
          console.log('--- Extracted Data ---');
          console.log(JSON.stringify(result, null, 2));
        }
      })
      .catch(error => {
        console.error(`Error processing link: ${link}`, error);
      });

    await promise; // Wait for the single promise to resolve

  } catch (err) {
    console.error('Error running processData:', err);
  } finally {
    if (browser) {
      await closeBrowser(browser);
    }
  }
})();