// searchService.js
import { scrollUntilEnd } from '../utils/scrollUtils.js';
import { solveCaptchaOnPage, detectPageType, applyRatingFilter /* , filterLinksByCategory */ } from './searchHelpers.js'; // NOTE: filterLinksByCategory commented out for future use
import * as scrapingConfig from '../config/scrapingConfig.js';

export async function searchGoogleMaps(page, query, user_id, task_id, rating, captchaManager) {
    await captchaManager.waitForGreenLight();
    const refinedQuery = query.replace(/ /g, '+');

    try {
        await page.goto(`https://www.google.com/maps/search/?api=1&query=${refinedQuery}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // --- CAPTCHA HANDLING LOGIC (UNCHANGED AS PER REQUEST) ---
        if (page.url().includes('https://www.google.com/sorry')) {
            const isHandler = captchaManager.claimHandling();

            if (isHandler) {
                let solveSuccess = false;
                try {
                    await solveCaptchaOnPage(page);
                    solveSuccess = true;
                } catch (initialError) {
                    console.warn(`Initial CAPTCHA solve FAILED: ${initialError.message}.`);
                    await page.waitForTimeout(120000); // 2-minute wait
                    try {
                        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
                        await solveCaptchaOnPage(page);
                        solveSuccess = true;
                    } catch (retryError) {
                        console.error(`Second CAPTCHA solve attempt FAILED: ${retryError.message}.`);
                        solveSuccess = false;
                    }
                } finally {
                    captchaManager.resolveHandling(solveSuccess);
                    if (!solveSuccess) {
                        throw new Error("Failed to solve the CAPTCHA after all attempts.");
                    }
                }
            } else {
                await captchaManager.waitForGreenLight();
                await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
            }
        }

        const pageType = await detectPageType(page);

        if (pageType === 'single') {
            await page.waitForURL('**/maps/place/**', { timeout: 5000 }).catch(() => {});
            return [page.url()];
        }

        if (pageType === 'error/timeout') {
            console.error(`Page type detection failed for query "${query}". Skipping.`);
            return [];
        }

        await applyRatingFilter(page, rating);
        await scrollUntilEnd(page);

        // NOTE: Category filtering disabled for future use
        // const filteredHrefs = await filterLinksByCategory(page, scrapingConfig);
        // For now, we'll extract all hrefs without category filtering
        const listingCards = await page.$$('div.Nv2PK');
        const allHrefs = [];
        for (const card of listingCards) {
            try {
                const href = await card.$eval('a.hfpxzc', el => el.getAttribute('href'));
                if (href) allHrefs.push(href);
            } catch (e) {
                console.warn('Could not process a listing card for href extraction:', e.message);
            }
        }
        return allHrefs;

    } catch (error) {
        console.error(`Error in searchGoogleMaps for query "${query}": ${error.message}`, error.stack);
        throw error;
    }
}