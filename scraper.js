import { workerData, parentPort } from 'worker_threads';
import { runScraping } from './services/scraperService.js';
// import { initializeBrowser, closeBrowser } from './services/dataProcessor.js';

const { user_id, task_id } = workerData;

const main = async () => {
  try {
    // await initializeBrowser();
    const result = await runScraping(user_id, task_id);
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  } finally {
    // await closeBrowser();
  }
};

main();