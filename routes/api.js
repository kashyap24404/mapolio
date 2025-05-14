import express from 'express';
import { updateStatus, getStatus } from '../controllers/statusController.js';
import { downloadFile, downloadJsonFile } from '../controllers/downloadController.js';
import { startScraping } from '../controllers/scrapingController.js';
import { exec } from 'child_process';

const router = express.Router();

// Status update endpoint
router.post('/update_status', updateStatus);

// File download endpoint
router.get('/download/csv/:user_id/:task_id', downloadFile);

// Json File download endpoint
router.get('/download/json/:user_id/:task_id', downloadJsonFile);

// Scraping request endpoint
router.post('/check_request', startScraping);

// Status check endpoint
router.get('/status/:user_id/:task_id', getStatus);

// Run testdirect.js script endpoint
router.post('/run-script', (req, res) => {
    console.log("start");
    exec('node testdirect.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Error executing script');
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        res.send('Script executed successfully');
    });
});

export default router;