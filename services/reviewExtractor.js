// Utility for extracting reviews from a Google Maps business page using Playwright

/**
 * Scrolls the review panel until the end is reached or until maxReviews are loaded.
 * @param {import('playwright').Page} page
 * @param {string} scrollSelector - Selector for the scrollable container
 * @param {string} reviewSelector - Selector for individual review elements
 * @param {number} maxReviews
 * @param {number} pauseTime
 * @param {number} maxWaitIterations
 */
export async function scrollUntilEndForReviews(page, scrollSelector, reviewSelector = '.jftiEf', maxReviews = 1000, pauseTime = 1, maxWaitIterations = 20) {
  const scrollDiv = await page.$(scrollSelector);
  if (!scrollDiv) {
    throw new Error(`Scroll container not found with selector: ${scrollSelector}`);
  }
  let previousHeight = await page.evaluate(el => el.scrollHeight, scrollDiv);
  let iterationsWithoutChange = 0;
  let currentReviewCount = 0;
  while (iterationsWithoutChange < maxWaitIterations) {
    currentReviewCount = (await page.$$(reviewSelector)).length;
    await page.evaluate(el => el.scrollBy(0, el.clientHeight), scrollDiv);
    await page.waitForTimeout(pauseTime * 1000);
    const currentHeight = await page.evaluate(el => el.scrollHeight, scrollDiv);
    if (currentHeight === previousHeight) {
      iterationsWithoutChange++;
    } else {
      iterationsWithoutChange = 0;
    }
    previousHeight = currentHeight;
    currentReviewCount = (await page.$$(reviewSelector)).length;
    if (currentReviewCount >= maxReviews) {
      break;
    }
  }
}

/**
 * Extracts reviews from the Google Maps business page.
 * @param {import('playwright').Page} page
 * @param {number} maxReviews
 * @returns {Promise<{reviews: Array<Object>, error?: string}>}
 */
export async function extractReviews(page, maxReviews = 100) {
  try {
    // 1. Find and click the "Reviews" tab/button
    const reviewButtons = await page.$$('button.hh2c6');
    let reviewsButtonClicked = false;
    for (const button of reviewButtons) {
      const label = await button.getAttribute('aria-label');
      if (label && label.includes('Reviews')) {
        await button.click();
        reviewsButtonClicked = true;
        await page.waitForTimeout(1000);
        break;
      }
    }
    if (!reviewsButtonClicked) {
      return { reviews: [], error: "Could not find or click the 'Reviews' tab/button." };
    }
    // 2. Find and click the "Sort" button, then "Newest"
    try {
      const sortButtonSelector = 'button.g88MCb[data-value="Sort"]';
      await page.waitForSelector(sortButtonSelector, { timeout: 10000 });
      await page.click(sortButtonSelector);
      await page.waitForTimeout(500);
      const newestOptionSelector = 'div.fxNQSd[data-index="1"]';
      await page.waitForSelector(newestOptionSelector, { timeout: 5000 });
      await page.click(newestOptionSelector);
      await page.waitForTimeout(2500);
    } catch {}
    // 3. Scroll down to load reviews
    const reviewScrollSelector = 'div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde';
    await scrollUntilEndForReviews(page, reviewScrollSelector, '.jftiEf', maxReviews);

    // 4. Extract review data
    const reviewElements = await page.$$('.jftiEf');
    const allReviewsData = [];
    const reviewsToProcess = reviewElements.slice(0, maxReviews);
    for (const reviewElement of reviewsToProcess) {
      try {
        const reviewerNameElem = await reviewElement.$('.d4r55');
        const reviewerName = reviewerNameElem ? (await reviewerNameElem.innerText()).trim() : 'N/A';
        const ratingElem = await reviewElement.$('.kvMYJc[aria-label]');
        let rating = 'N/A';
        if (ratingElem) {
          const ariaLabel = await ratingElem.getAttribute('aria-label');
          const ratingMatch = ariaLabel ? ariaLabel.match(/(\d+)\s+star/i) : null;
          if (ratingMatch && ratingMatch[1]) {
            rating = `${ratingMatch[1]}/5`;
          }
        }
        const timeElem = await reviewElement.$('.rsqaWe');
        const time = timeElem ? (await timeElem.innerText()).trim() : 'N/A';
        const seeMoreButton = await reviewElement.$('button.w8nwRe.kyuRq');
        if (seeMoreButton) {
          try {
            await seeMoreButton.click();
            await page.waitForTimeout(300);
          } catch {}
        }
        const reviewTextElem = await reviewElement.$('.wiI7pd');
        const reviewText = reviewTextElem ? (await reviewTextElem.innerText()).trim() : 'N/A';
        
        const reviewObject = {
          reviewer: reviewerName,
          rating: rating,
          date: time,
          content: reviewText,
        };
        allReviewsData.push(reviewObject);
      } catch {}
    }
    
    if (allReviewsData.length > 0) {
    } else {
    }
    
    // After extraction, click back to main tab
    await page.click('button.hh2c6[data-tab-index="0"]', { timeout: 5000 }).catch(() => {});
    return { reviews: allReviewsData };
  } catch (error) {
    return { reviews: [], error: error.message };
  }
}
