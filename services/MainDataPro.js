import { launchChromium, args, executablePath } from 'playwright-aws-lambda';
import { processSingleLink } from './ProcessSingle.js';

export async function processData(uniqueGoogleSearchLinks, listFields) {
  const results = [];
  const linkQueue = uniqueGoogleSearchLinks.map(link => link.trim());
  const concurrencyLimit = 7;

    const browser = await launchChromium({
      args,
      executablePath: await executablePath,
      headless: true,
    });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    locale: "en-US",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
    }
  });

  try {
    // Worker function: picks one link from the queue until empty
    async function worker() {
      while (true) {
        const link = linkQueue.shift();
        if (!link) break;

        let retries = 10;
        let success = false;
        while (retries > 0 && !success) {
          try {
            const result = await processSingleLink(link, listFields, context);
            results.push(result);
            success = true;
          } catch (err) {
            retries--;
            if (retries === 0) {
              console.error(`Failed to process link ${link} after 3 attempts:`, err);
            } else {
              console.warn(`Retrying link ${link} (${retries} attempts remaining)`);
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Start the workers concurrently
    const workers = [];
    for (let i = 0; i < concurrencyLimit; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    return results;
  } catch (error) {
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}