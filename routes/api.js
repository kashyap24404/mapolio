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
router.get('/run-script', (req, res) => {
    console.log("start");
    const child = exec('node testdirect.js');
    
    child.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    
    child.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    
    child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        res.send('Script executed successfully');
    });
});

export default router;