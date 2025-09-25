import express from 'express';
import { updateStatus, getStatus, updateProgress } from '../controllers/statusController.js';
import { createTask, getTask, getUserTasks } from '../controllers/taskController.js';
import { verifyJWT } from '../config/supabase.js';
// Route scraping through communicator instead of direct controller
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ==============================================
// API v1 Routes - Secure, authenticated endpoints
// ==============================================

// Task Management Endpoints (Protected)
router.post('/api/v1/tasks', verifyJWT, createTask);
router.get('/api/v1/tasks/:taskId', verifyJWT, getTask);
router.get('/api/v1/tasks', verifyJWT, getUserTasks);

// Task Status Management (Protected)
router.put('/api/v1/tasks/:taskId/status', verifyJWT, updateStatus);
router.put('/api/v1/tasks/:taskId/progress', verifyJWT, updateProgress);
router.get('/api/v1/status/:taskId', getStatus); // Can include user_id as query param for security

// ==============================================
// Legacy Routes (Kept for backward compatibility)
// NOTE: These now point to the new scraper_task table structure
// ==============================================

// Status update endpoint
router.post('/update_status', updateStatus);

// File download endpoints with optional filename parameter

// Scraping request endpoint (legacy path kept for compatibility)
// router.post('/check_request', startScrapingHandler);

// Communicator canonical endpoint
// router.post('/communicator/start', startScrapingHandler);

// // Communicator topology/data discovery endpoints
// router.get('/communicator/states', getStatesHandler);
// router.get('/communicator/:state/counties', getStateCountiesHandler);
// router.get('/communicator/:state/cities', getStateCitiesHandler);
// router.get('/communicator/:state/cities/:city/zips', getCityZipsHandler);

// Status check endpoint
router.get('/status/:user_id/:task_id', getStatus);

// Public API endpoint to fetch all states nested JSON file
router.get('/api/states/nested', (req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'utils', 'all_states_nested.json');
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'States nested data file not found'
            });
        }

        // Read the JSON file
        const statesData = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(statesData);
        
        res.json({
            success: true,
            data: parsedData,
            message: 'States nested data retrieved successfully'
        });
        
    } catch (error) {
        console.error('Error reading states nested file:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching states data',
            error: error.message
        });
    }
});

// Public API endpoint to fetch specific state data
router.get('/api/states/:state', (req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'utils', 'all_states_nested.json');
        const stateName = req.params.state.toLowerCase();
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'States nested data file not found'
            });
        }

        const statesData = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(statesData);
        
        if (!parsedData[stateName]) {
            return res.status(404).json({
                success: false,
                message: `State '${stateName}' not found in the database`
            });
        }
        
        res.json({
            success: true,
            data: parsedData[stateName],
            state: stateName,
            message: `Data for state '${stateName}' retrieved successfully`
        });
        
    } catch (error) {
        console.error('Error reading state data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching state data',
            error: error.message
        });
    }
});

// Public API endpoint to get list of all states
router.get('/api/states', (req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'utils', 'all_states_nested.json');
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'States nested data file not found'
            });
        }

        const statesData = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(statesData);
        
        const statesList = Object.keys(parsedData).map(state => ({
            name: state,
            counties: Object.keys(parsedData[state].counties || {}).length
        }));
        
        res.json({
            success: true,
            data: statesList,
            total: statesList.length,
            message: 'States list retrieved successfully'
        });
        
    } catch (error) {
        console.error('Error reading states list:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching states list',
            error: error.message
        });
    }
});

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