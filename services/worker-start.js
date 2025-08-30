import dotenv from 'dotenv';
dotenv.config();
// services/worker-start.js
import { parentPort, workerData } from 'worker_threads';
import { runScraping } from './scraperService.js';

(async () => {
    const { user_id, task_id } = workerData;

    try {
        // Signal that the worker is ready to start processing
        parentPort.postMessage({ status: 'ready', task_id });

        // Execute the main scraping logic
        await runScraping(user_id, task_id);

    } catch (error) {
        console.error(`[Worker ${task_id}] A critical error occurred during scraping:`, error);
        // Signal that an error occurred during initialization or execution
        parentPort.postMessage({ status: 'error', task_id, error: error.message });
    }
})();