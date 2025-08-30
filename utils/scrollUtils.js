export async function scrollUntilEnd(page, pauseTime = 1, maxWaitIterations = 5) {
  const scrollDiv = await page.$('.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd[aria-label]');
  if (!scrollDiv) {
    throw new Error('Scroll container not found');
  }

  let previousHeight = await page.evaluate(el => el.scrollHeight, scrollDiv);
  let iterationsWithoutChange = 0;

  while (iterationsWithoutChange < maxWaitIterations) {
    await page.evaluate(el => el.scrollBy(0, el.clientHeight), scrollDiv);
    await new Promise(resolve => setTimeout(resolve, pauseTime * 1000));
    
    const currentHeight = await page.evaluate(el => el.scrollHeight, scrollDiv);
    if (currentHeight === previousHeight) {
      iterationsWithoutChange++;
    } else {
      iterationsWithoutChange = 0;
    }
    previousHeight = currentHeight;
  }
}

export async function scrollUntilImagesStop(page, pause = 1, stableIters = 3) {
  let stableCount = 0;
  let previousCount = 0;

  while (stableCount < stableIters) {
    await page.evaluate(() => {
      const div = document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde');
      if (div) {
        div.scrollTop = div.scrollHeight;
      }
    });

    await new Promise(resolve => setTimeout(resolve, pause * 1000));

    const currentCount = await page.evaluate(() => {
      return document.querySelectorAll('.U39Pmb[style]').length;
    });

    if (currentCount === previousCount) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    previousCount = currentCount;
  }
}

export async function scrollUntilEndForWeb(page, options = {}) {
  const {
    pause = 2,
    stableIterations = 4,
    scrollContainerSelector = 'div.w6VYqd .e07Vkf.kA9KIf',
    endOfResultsSelector = 'iframe.rvN3ke'
  } = options;

  const scrollContainerLocator = page.locator(scrollContainerSelector).first();
  const endOfResultsLocator = page.locator(endOfResultsSelector);

  if (await scrollContainerLocator.count() === 0) {
    throw new Error(`Scroll container not found with selector: ${scrollContainerSelector}`);
  }

  let stableCount = 0;

  while (true) {
    const previousHeight = await scrollContainerLocator.evaluate(el => el.scrollHeight);

    await scrollContainerLocator.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });

    try {
      await Promise.race([
        endOfResultsLocator.waitFor({ state: 'visible', timeout: pause * 1000 }),
        page.waitForTimeout(pause * 1000)
      ]);
    } catch (e) {
      // This is expected if the waitFor times out, so we can ignore it.
    }

    if (await endOfResultsLocator.count() > 0) {
      break;
    }
    
    const currentHeight = await scrollContainerLocator.evaluate(el => el.scrollHeight);

    if (currentHeight === previousHeight) {
      stableCount++;
      if (stableCount >= stableIterations) {
        break;
      }
    } else {
      stableCount = 0;
    }
  }
}