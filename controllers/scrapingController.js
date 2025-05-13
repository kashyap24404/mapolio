import { Worker } from 'worker_threads';

export const startScraping = (req, res) => {
  const { user_id, task_id } = req.body;

  try {
    const worker = new Worker('./scraper.js', {
      workerData: { user_id, task_id }
    });

    worker.on('message', (message) => {
      console.log('Worker message:', message);
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });

    res.json({ success: true, message: 'Scraping started' });
  } catch (error) {
    console.error('Error starting scraping:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};