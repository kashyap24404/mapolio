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