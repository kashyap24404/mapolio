// Utility functions for extracting fields from a Google Maps business page using Playwright

export async function extractTitle(page) {
  const elem = await page.$('h1.DUwDvf');
  return elem ? (await elem.innerText()).trim() : '';
}

export async function extractAvgRating(page) {
  try {
    const elem = await page.$('.F7nice span[aria-hidden="true"]');
    return elem ? (await elem.innerText()).trim() : '';
  } catch {
    return '';
  }
}

export async function extractRatingCount(page) {
  try {
    const elem = await page.$('.F7nice span[aria-label]:nth-child(1)');
    if (elem) {
      const ratingText = (await elem.innerText()).trim();
      return ratingText.replace(/\D/g, '');
    }
    return '';
  } catch {
    return '';
  }
}

export async function extractAddress(page) {
  const elem = await page.$("button[data-item-id='address'] .AeaXub .rogA2c .Io6YTe");
  return elem ? (await elem.innerText()).trim() : '';
}

export async function extractWebsite(page) {
  const elem = await page.$("a[data-item-id='authority'] .AeaXub .rogA2c .Io6YTe");
  return elem ? (await elem.innerText()).trim() : '';
}

export async function extractPhone(page) {
  const elem = await page.$("button[data-tooltip='Copy phone number'] .AeaXub .rogA2c .Io6YTe");
  return elem ? (await elem.innerText()).trim() : '';
}

export async function extractCategory(page) {
  const elem = await page.$("button.DkEaL");
  return elem ? (await elem.innerText()).trim() : '';
}

export async function extractWheelchair(page) {
  const elem = await page.$("span.wmQCje");
  return elem ? (await elem.getAttribute('data-tooltip'))?.trim() : '';
}

export async function extractWorkhours(page) {
  const elem = await page.$("div.t39EBf");
  if (elem) {
    const rawText = (await elem.getAttribute('aria-label'))?.trim();
    return rawText || '';
  }
  return '';
}
