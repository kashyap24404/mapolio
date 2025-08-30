// controllers/scrapingController.js
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the worker script
const workerScriptPath = path.resolve(__dirname, '../services/worker-start.js');

export const startScraping = async (req, res) => {
    const { user_id, task_id } = req.body;

    if (!user_id || !task_id) {
        return res.status(400).json({ message: 'user_id and task_id are required' });
    }

    try {
        // Use a promise to wait for the worker's first message (ready or error)
        const workerInitialization = new Promise((resolve, reject) => {
            const worker = new Worker(workerScriptPath, {
                workerData: { user_id, task_id }
            });

            worker.on('message', (message) => {
                if (message.status === 'ready') {
                    console.log(`Worker for task ${task_id} has confirmed it is ready.`);
                    resolve(worker); // Resolve the promise with the worker instance
                } else if (message.status === 'error') {
                    console.error(`Worker for task ${task_id} reported an initialization error:`, message.error);
                    reject(new Error(message.error));
                }
            });

            worker.on('error', (error) => {
                console.error(`An unhandled error occurred in worker for task ${task_id}:`, error);
                reject(error);
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    const errorMessage = `Worker for task ${task_id} stopped with exit code ${code}`;
                    console.error(errorMessage);
                    // If the worker exits before resolving, it's an error
                    reject(new Error(errorMessage));
                }
            });
        });

        // Wait for the worker to be ready before sending the response
        await workerInitialization;

        // If the promise resolves, it means the worker is ready
        res.status(202).json({ message: `Scraping task ${task_id} accepted and worker started.` });

    } catch (error) {
        console.error(`Failed to start worker for task ${task_id}:`, error.message);
        res.status(500).json({ message: 'Failed to start scraping worker.', error: error.message });
    }
};