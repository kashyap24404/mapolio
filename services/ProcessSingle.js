// processSingle.js
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
  extractWorkhours,
  extractLocationLink,
  extractLatitude,
  extractLongitude,
  extractPermanentlyClosedStatus
} from './fieldExtractors.js';
import { extractImages } from './imageExtractor.js';
import { extractReviews } from './reviewExtractor.js';
import { extractWebResults } from './webSearchExtractor.js'

export async function processSingleLink(link, fields, context, options = {}) {

  const {
    singleImage = true,
    conditionalScraping = { enabled: false },
    maxReviews = 100
  } = options;

  const data = Object.fromEntries(fields.map(field => [field, '']));
  const errors = {};
  let page = null;
  const processingId = Math.random().toString(36).substring(2, 9);

  // --- Route handler function ---
  // We define it here so we can unroute it specifically later
  let routeHandler = null;

  try {
    page = await context.newPage();

    // --- Variables for redirect interception ---
    let intendedRedirectUrl = null;
    let shouldAbortSorryRedirect = false;

    routeHandler = async (route, request) => {
      const requestUrl = request.url();
      if (
        shouldAbortSorryRedirect &&
        request.isNavigationRequest() &&
        page.url().includes('https://www.google.com/sorry') &&
        !requestUrl.includes('https://www.google.com/sorry') &&
        !requestUrl.startsWith('https://www.google.com/recaptcha/')
      ) {
        intendedRedirectUrl = requestUrl;
        console.warn(`[${processingId}] Intercepting redirect from /sorry to: ${intendedRedirectUrl}. Aborting.`);
        await route.abort('abortedbyclient').catch(e => console.warn(`[${processingId}] Minor error aborting route: ${e.message}`));
        return;
      }
      await route.continue().catch(e => console.warn(`[${processingId}] Minor error continuing route: ${e.message}`));
    };

    // Set up the route handler immediately
    await page.route('**/*', routeHandler);


    let navigationSuccessful = false;
    for (let i = 0; i < 3; i++) {
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });
        navigationSuccessful = true;
        break;
      } catch (navError) {
        console.warn(`[${processingId}] Nav attempt ${i + 1} failed for ${link}: ${navError.message.split('\n')[0]}`);
        if (i === 2) {
          errors.navigation = `Nav failed (3 attempts): ${navError.message.split('\n')[0]}`;
          return { data, errors };
        }
        await page.waitForTimeout(2000 + Math.random() * 1000);
      }
    }
    if (!navigationSuccessful) {
      errors.navigation = `Critical nav failure for ${link}`;
      return { data, errors };
    }

    let captchaSolvedOrNotPresent = true;
    if (page.url().includes('https://www.google.com/sorry')) {
      console.warn(`[${processingId}] CAPTCHA page for ${link}. Activating redirect interception.`);
      captchaSolvedOrNotPresent = false;
      shouldAbortSorryRedirect = true; // Enable interception

      try {
        const recaptchaCheckboxFrameLocator = page.frameLocator('iframe[src*="recaptcha/api2/anchor"]');
        const checkbox = recaptchaCheckboxFrameLocator.locator('#recaptcha-anchor');
        await checkbox.waitFor({ state: 'visible', timeout: 25000 });

        try { await checkbox.click({ timeout: 7000, trial: true }); } catch (e) {/*ignore trial click error*/ }
        await checkbox.click({ timeout: 10000 });
        await page.waitForTimeout(1500 + Math.random() * 1000);

        let solveError = null;
        try {
          await solve(page, { timeout: 45000 }); // Direct call to solve
        } catch (solverError) {
          console.error(`[${processingId}] ERROR DURING solve() for ${link}: ${solverError.message.split('\n')[0]}`, solverError.name);
          solveError = solverError;
          errors.captcha_solver_error = `SolverErr: ${solverError.message.split('\n')[0]}`;
        }

        shouldAbortSorryRedirect = false;

        await page.waitForTimeout(1000 + Math.random() * 500); // Crucial: Give solver time after its main promise resolves

        if (solveError) {
          console.warn(`[${processingId}] solve() threw an error. CAPTCHA likely not solved.`);
        } else if (intendedRedirectUrl) {
          try {
            await page.goto(intendedRedirectUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            if (!page.url().includes('https://www.google.com/sorry')) {
              captchaSolvedOrNotPresent = true;
            } else {
              errors.captcha_verification = "Manual nav, but still on CAPTCHA page.";
              console.warn(`[${processingId}] Manual nav to ${intendedRedirectUrl} landed on /sorry.`);
            }
          } catch (manualNavError) {
            errors.captcha_manual_nav_failed = `Failed manual nav to ${intendedRedirectUrl}: ${manualNavError.message.split('\n')[0]}`;
          }
        } else if (!page.url().includes('https://www.google.com/sorry')) {
          captchaSolvedOrNotPresent = true;
        } else {
          console.warn(`[${processingId}] Still on /sorry, no redirect caught, solve() didn't error.`);
          const recaptchaFrameStillPresent = await page.locator('iframe[src*="recaptcha/api2/anchor"]').count() > 0;
          if (recaptchaFrameStillPresent) {
            errors.captcha_verification = "Solver done, CAPTCHA elements persist, no redirect.";
          } else {
            // Try to see if content loaded anyway
            try {
              await page.waitForFunction(() => !document.URL.includes('google.com/sorry') || document.querySelector('h1.DUwDvf'), { timeout: 10000 });
              if (!page.url().includes('https://www.google.com/sorry') || (await page.locator('h1.DUwDvf').count() > 0)) {
                captchaSolvedOrNotPresent = true;
              } else {
                errors.captcha_verification = "Stuck on /sorry, no iframe, no redirect, no content.";
              }
            } catch (e) {
              errors.captcha_verification = "Stuck on /sorry (no iframe), content check timeout.";
            }
          }
        }

        if (captchaSolvedOrNotPresent && !solveError) {
          // console.log(`[${processingId}] CAPTCHA handled for ${link}.`);
        } else {
          console.warn(`[${processingId}] CAPTCHA not fully resolved for ${link}. Errors: ${JSON.stringify(errors)}`);
        }

      } catch (outerCaptchaError) {
        console.error(`[${processingId}] Outer CAPTCHA handling block error for ${link}: ${outerCaptchaError.message.split('\n')[0]}`);
        errors.captcha_setup_error = outerCaptchaError.message.split('\n')[0];
      } finally {
        shouldAbortSorryRedirect = false; // Ensure reset
        if (routeHandler) { // Unroute the specific handler
          await page.unroute('**/*', routeHandler).catch(e => console.warn(`[${processingId}] Minor error unrouting specific handler: ${e.message}`));
          routeHandler = null;
        }
      }
    } else {
      captchaSolvedOrNotPresent = true;
    }

    if (!captchaSolvedOrNotPresent) {
      if (!Object.values(errors).some(e => e && typeof e === 'string' && e.toLowerCase().includes('captcha'))) {
        errors.captcha_unresolved_generic = "CAPTCHA present but not confirmed solved.";
      }
    }

    try {
      await page.waitForSelector('h1.DUwDvf', { timeout: 30000 });
    } catch (selectorError) {
      console.error(`[${processingId}] Timeout for 'h1.DUwDvf' on ${page.url()}. CAPTCHA: ${captchaSolvedOrNotPresent}. Errors: ${JSON.stringify(errors)}`);
      errors.page_content_unavailable = `Timeout h1.DUwDvf. CAPTCHA: ${captchaSolvedOrNotPresent}.`;
      return { data, errors };
    }

    // --- Field Extraction (Same as your provided version) ---
    const extractorMap = {
      title: extractTitle, avg_rating: extractAvgRating, rating_count: extractRatingCount,
      address: extractAddress, website: extractWebsite, phone: extractPhone,
      category: extractCategory, wheelchair: extractWheelchair, workhours: extractWorkhours,
      google_map_link: extractLocationLink, latitude: extractLatitude, longitude: extractLongitude,
      permanently_closed: extractPermanentlyClosedStatus
    };

    // Determine which fields to scrape initially
    const heavyFields = conditionalScraping.enabled ? conditionalScraping.heavyFields : [];
    const initialFields = fields.filter(field => !heavyFields.includes(field));

    for (const field of initialFields) {
      if (field === 'city' && fields.includes('address')) {
        try {
          if (!data.address) {
            data.address = await extractorMap.address(page).catch(() => '');
          }
          if (data.address) {
            const { state, city, postcode } = await getStateCity(data.address);
            data.state = state;
            data.city = city;
            data.postcode = postcode;
          } else {
            errors.city_derivation = "Address empty, cannot derive city/state/postcode.";
          }
        } catch (err) {
          errors[`${field}_derivation`] = err.message.split('\n')[0];
        }
        continue;
      }
      const extractor = extractorMap[field];
      if (extractor) {
        try {
          data[field] = await extractor(page);
        } catch (err) {
          errors[field] = err.message.split('\n')[0];
        }
      }
    }

    if (fields.includes('social_web_links')) {
      try {
        const socialLinks = await extractWebResults(page);
        data.social_web_links = socialLinks;
      } catch (err) {
        errors.social_web_links = err.message.split('\n')[0];
      }
    }

    // --- PHASE 2: Decision Making ---
    let proceedWithHeavyScraping = true;
    if (conditionalScraping.enabled) {
      const keyField = conditionalScraping.keyField;
      const targetValue = conditionalScraping.targetValue;
      const extractedValue = data[keyField];

      if (!Array.isArray(targetValue) || targetValue.length === 0) {
        console.warn(`[${processingId}] Conditional scraping enabled but targetValue is not a valid array. Skipping heavy fields.`);
        proceedWithHeavyScraping = false;
      } else if (extractedValue && typeof extractedValue === 'string' && targetValue.some(t => extractedValue.toLowerCase().includes(t.toLowerCase()))) {
        proceedWithHeavyScraping = true;
      } else {
        proceedWithHeavyScraping = false;
        if (conditionalScraping.skipmissmatch) {
          return null; // Return null to indicate this result should be skipped
        }
      }
    }

    // --- PHASE 3: Heavy Scraping ---
    if (proceedWithHeavyScraping) {
      if (fields.includes('reviews')) {
        try {
          const { reviews, error: reviewErrorMsg } = await extractReviews(page, maxReviews);
          data.reviews = reviews;
          if (reviewErrorMsg) errors.reviews = reviewErrorMsg;
        } catch (err) {
          errors.reviews = err.message.split('\n')[0];
        }
      }

      if (fields.includes('images')) {
        try {
          const { images, error: imageErrorMsg } = await extractImages(page, singleImage);
          data.images = images;
          if (imageErrorMsg) errors.images = imageErrorMsg;
        } catch (err) {
          errors.images = err.message.split('\n')[0];
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      console.warn(`[${processingId}] Extraction errors for ${link}:`, errors);
    }
    return { data, errors };

  } catch (error) {
    console.error(`[${processingId}] UNHANDLED TOP-LEVEL ERROR in processSingleLink for ${link}: ${error.message}`, error.stack);
    errors.critical_error_processSingleLink = error.message.split('\n')[0];
    return { data, errors };
  } finally {
    if (page && !page.isClosed()) {
      // Unroute all handlers as a final cleanup if specific unroute failed or wasn't reached
      await page.unroute('**/*').catch(e => {/* ignore */ });
      await page.close().catch(e => console.error(`[${processingId}] Error closing page for ${link}: ${e.message}`));
    }
  }
}