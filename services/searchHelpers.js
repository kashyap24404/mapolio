// services/searchHelpers.js
import { solve } from 'recaptcha-solver';
import scrapingConfig from '../config/scrapingConfig.js';

const SELECTORS = {
    mainList: '.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd[aria-label]',
    singleListingIndicator: 'h1.DUwDvf',
    category: '.UaQhfb .W4Efsd .W4Efsd:first-child span:first-child span:first-child',
    listingCard: 'div.Nv2PK',
    cardLink: 'a.hfpxzc',
    ratingButton: 'div.Vo5ZAe div.KNfEk.siaXSd:nth-child(1) button.e2moi',
    ratingMenuItem: (index) => `.vij30.kA9KIf div[data-index="${index}"]`,
};

const CONFIG = {
    shortWaitTimeout: 30000,
};

export async function solveCaptchaOnPage(page) {
    const recaptchaCheckboxFrameLocator = page.frameLocator('iframe[src*="recaptcha/api2/anchor"]');
    const checkbox = recaptchaCheckboxFrameLocator.locator('#recaptcha-anchor');
    await checkbox.waitFor({ state: 'visible', timeout: 20000 });
    await checkbox.click();
    await page.waitForTimeout(2000);
    await solve(page, { timeout: 45000 });
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
}

export async function detectPageType(page) {
    try {
        const raceResult = await Promise.race([
            page.waitForSelector(SELECTORS.mainList, { state: 'visible' })
                .then(() => 'list'),

            page.waitForSelector(SELECTORS.singleListingIndicator, { state: 'visible' })
                .then(() => 'single'),
        ]);

        console.log(`Page type detected as: ${raceResult}`);

        if (raceResult === 'single') {
            const isListAlsoVisible = await page.locator(SELECTORS.mainList).isVisible({ timeout: 1000 });
            if (isListAlsoVisible) {
                console.log("Single listing indicator found, but list view takes priority. Treating as 'list'.");
                return 'list';
            }
        }
        
        return raceResult;
    } catch (error) {
        // If all checks fail, it's an error or an unrecognized page structure.
        console.warn(`Could not determine page type: ${error.message}`);
        return 'error/timeout';
    }
}

export async function applyRatingFilter(page) {
    const { apply, value: rating } = scrapingConfig.ratingFilter;
    const ratingMapping = { '4.5+': '6', '4': '5', '3.5': '4', '3': '3', '2.5': '2', '2': '1' };
    
    if (!apply || !rating || !ratingMapping[rating]) {
        return;
    }

    try {
        await page.click(SELECTORS.ratingButton);
        const menuItemSelector = SELECTORS.ratingMenuItem(ratingMapping[rating]);
        await page.waitForSelector(menuItemSelector, { state: 'visible', timeout: 5000 });
        await page.click(menuItemSelector);
        await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (error) {
        console.error('Error applying rating filter:', error.message);
    }
}

// NOTE: Category filtering function - commented out for future use
// This function filters scraped listings based on business categories
// Currently disabled but preserved for potential future implementation
// export async function filterLinksByCategory(page, config) {
//     if (!config.useCategoryFilter) {
//         const listingCards = await page.$$(SELECTORS.listingCard);
//         const allHrefs = [];
//         for (const card of listingCards) {
//             try {
//                 const href = await card.$eval(SELECTORS.cardLink, el => el.getAttribute('href'));
//                 if (href) allHrefs.push(href);
//             } catch (e) {
//                 console.warn('Could not process a listing card for href extraction:', e.message);
//             }
//         }
//         return allHrefs;
//     }
//
//     const lowerCaseAllowedCategories = config.allowedCategories.map(cat => cat.toLowerCase());
//     const listingCards = await page.$$(SELECTORS.listingCard);
//     const filteredHrefs = [];
//     for (const card of listingCards) {
//         try {
//             const categoryElement = await card.$(SELECTORS.category);
//             if (!categoryElement) continue;
//             const categoryText = (await categoryElement.innerText()).trim().toLowerCase();
//             if (lowerCaseAllowedCategories.includes(categoryText)) {
//                 const href = await card.$eval(SELECTORS.cardLink, el => el.getAttribute('href'));
//                 if (href) filteredHrefs.push(href);
//             }
//         } catch (e) {
//             console.warn('Could not process a listing card for category check:', e.message);
//         }
//     }
//     return filteredHrefs;
// }