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

export async function extractLongitude(page) {
  const url = page.url();

  const regex = /!4d([0-9.-]+)/;
  const match = url.match(regex);

  if (match && match[1]) {
    try {
      const longitude = parseFloat(match[1]);
      if (isNaN(longitude)) {
        console.warn(`Parsed value "${match[1]}" from URL "${url}" is not a valid number for longitude.`);
        return null;
      }
      return longitude;
    } catch (error) {
      console.error(`Error parsing longitude from "${match[1]}" in URL "${url}":`, error);
      return null;
    }
  } else {
    return null;
  }
}

export async function extractLatitude(page) {
  const url = page.url();

  const regex = /!3d([0-9.-]+)/;
  const match = url.match(regex);

  if (match && match[1]) {
    try {
      const longitude = parseFloat(match[1]);
      if (isNaN(longitude)) {
        console.warn(`Parsed value "${match[1]}" from URL "${url}" is not a valid number for Latitude.`);
        return null;
      }
      return longitude;
    } catch (error) {
      console.error(`Error parsing Latitude from "${match[1]}" in URL "${url}":`, error);
      return null;
    }
  } else {
    return null;
  }
}



export async function extractWebsite(page) {
  const elem = await page.$("a[data-item-id='authority'] .AeaXub .rogA2c .Io6YTe");
  return elem ? (await elem.innerText()).trim() : '';
}

export async function extractPhone(page) {
  const elem = await page.$("button[data-tooltip='Copy phone number'] .AeaXub .rogA2c .Io6YTe");
  return elem ? (await elem.innerText()).trim() : '';
}

export async function extractPermanentlyClosedStatus(page) {
  const elem = await page.$("span.fCEvvc span");
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

export async function extractLocationLink(page) {
  try {
    await page.waitForURL(/@/, { timeout: 5000 });
    return page.url();
  } catch (error) {
    console.warn("Could not find a location link with coordinates in time. Returning current URL.");
    return page.url();
  }
}


export async function extractWorkhours(page) {
  let hours = '';

  // Attempt 1: Main hours element (aria-label)
  const mainHoursElement = await page.$("div.t39EBf");
  if (mainHoursElement) {
    const rawText = (await mainHoursElement.getAttribute('aria-label'))?.trim();
    if (rawText && rawText.length > 0) {
      hours = rawText;
    }
  }

  if (hours) {
    return hours;
  }

  // Attempt 2: Table button elements (value or aria-label)
  const tableButtonElements = await page.$$("div.t39EBf table tbody tr td.HuudEc button");
  if (tableButtonElements && tableButtonElements.length > 0) {
    const hoursArray = [];
    for (const button of tableButtonElements) {
      const valueAttr = await button.getAttribute('value');
      if (valueAttr && valueAttr.trim() !== '') {
        hoursArray.push(valueAttr.trim());
      } else {
        const ariaLabelAttr = await button.getAttribute('aria-label');
        if (ariaLabelAttr && ariaLabelAttr.trim() !== '') {
          hoursArray.push(ariaLabelAttr.trim());
        }
      }
    }
    if (hoursArray.length > 0) {
      hours = hoursArray.join('; ') + ';';
    }
  }

  if (hours) {
    return hours;
  }

  // Attempt 3: Click to open modal using page.evaluate
  const openHoursButtonSelector = ".RcCsl.fVHpi.w4vB1d.NOE9ve.AG25L.lk2Rcf button.CsEnBe";
  const modalContentIndicatorSelector = "tbody tr td button.mWUh3d";
  const closeModalButtonSelector = "button.hYBOP.FeXq4d";
  let modalWasSuccessfullyOpened = false;
  const clickDelayMs = 700 + Math.random() * 300; // Time for page to react after JS click
  const modalVerificationTimeoutMs = 5000;

  try {
    const openButtonExists = await page.$(openHoursButtonSelector);
    if (openButtonExists) {
      // Ensure the button is at least locatable before trying to click via JS
      await page.waitForSelector(openHoursButtonSelector, { state: 'attached', timeout: 3000 });

      await page.evaluate((selector) => {
        const elem = document.querySelector(selector);
        if (elem && typeof elem.click === 'function') {
          elem.click();
        }
      }, openHoursButtonSelector);
      await page.waitForTimeout(clickDelayMs);

      try {
        await page.waitForSelector(modalContentIndicatorSelector, { state: 'visible', timeout: modalVerificationTimeoutMs });
        modalWasSuccessfullyOpened = true;
      } catch (e) {
        // Modal content did not appear after JS click
        modalWasSuccessfullyOpened = false;
      }
    }
  } catch (error) {
    // Error finding or evaluating click for open button
    modalWasSuccessfullyOpened = false;
  }

  if (modalWasSuccessfullyOpened) {
    try {
      const detailedHoursButtons = await page.$$(modalContentIndicatorSelector);
      const modalHoursArray = [];
      if (detailedHoursButtons.length > 0) {
        for (let i = 0; i < Math.min(detailedHoursButtons.length, 7); i++) {
          const button = detailedHoursButtons[i];
          const ariaLabel = await button.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.trim()) {
            modalHoursArray.push(ariaLabel.trim());
          }
        }
      }
      if (modalHoursArray.length > 0) {
        hours = modalHoursArray.join('; ') + ';';
      }
    } catch (extractionError) {
      // Error during hour extraction from modal
    } finally {
      // Attempt to close the modal using page.evaluate
      try {
        const closeButtonExists = await page.$(closeModalButtonSelector);
        if (closeButtonExists) {
          await page.evaluate((selector) => {
             const elem = document.querySelector(selector);
             if (elem && typeof elem.click === 'function') elem.click();
          }, closeModalButtonSelector);
          await page.waitForTimeout(300 + Math.random() * 200); // Give time for modal to close
        }
      } catch (closeError) {
        // Error during modal close attempt
      }
    }
  }

  return hours;
}