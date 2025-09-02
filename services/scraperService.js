// services/scraperService.js
import { chromium } from 'playwright';
import { supabaseAdmin, deductCredits } from '../config/supabase.js';
import { CaptchaManager } from '../utils/captchaManager.js';
import { SharedQueue } from './queue.js';
import { MainDataPro } from './MainDataPro.js';
import { linkFinderWorker, dataExtractorWorker } from './worker.js';
import { saveResults } from './scraperHelpers.js';
import { saveVerificationFile } from '../utils/jsonUtils.js';
import { expandLocationRules } from '../utils/locationHydrator.js';

const captchaManager = new CaptchaManager();

/**
 * Main scraping function - accepts task object as the single argument
 * Uses task.config as the single source of truth for all configuration
 * @param {Object} task - Complete task row from scraper_task table
 * @returns {Object} Results object with success status and metrics
 */
export async function runScrapingTask(task) {
    console.log(`[Worker ${task.id}] ==> Starting scraping task processing.`);
    let browser = null;
    
    try {
        const { id: taskId, user_id: userId, config } = task;
        
        // Update task status to running
        await updateTaskStatus(taskId, 'running', 5);
        
        // Extract configuration from task.config (single source of truth)
        const searchQuery = config.search_query;
        const dataFields = config.data_fields || ['title', 'address', 'phone'];
        const ratingFilter = config.rating_filter || '0';
        const advancedOptions = config.advanced_options || {};
        // Use total_selected_zip_codes from frontend config as the source of truth
        const totalZipCodes = config.total_selected_zip_codes || 0;
        
        console.log(`Task ${taskId}: Processing "${searchQuery}" with fields: ${dataFields.join(', ')}`);
        await updateTaskStatus(taskId, 'running', 10, null, {});
        
        // Process location rules using locationHydrator
        const locationQueue = await expandLocationRules(config.location_rules);
        
        if (locationQueue.length === 0) {
            throw new Error("No locations could be processed from the provided location rules.");
        }
        
        console.log(`Task ${taskId}: Generated ${locationQueue.length} search locations.`);
        // Use the frontend-provided total for progress tracking, but don't store it in DB
        console.log(`Task ${taskId}: Total ZIP codes for progress tracking: ${totalZipCodes}`);
        await updateTaskStatus(taskId, 'running', 15, null, {});
        
        // Initialize browser with configuration from task.config
        const browserConfig = {
            headless: process.env.NODE_ENV === 'production',
            args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage']
        };
        
        browser = await chromium.launch(browserConfig);
        await updateTaskStatus(taskId, 'running', 20, null, {});
        
        const linkFinderContext = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        });
        
        const dataExtractorContext = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
        });
        
        // Initialize processing components
        const sharedQueue = new SharedQueue();
        const allProcessedResults = [];
        const mainDataPro = new MainDataPro();
        
        // Configure concurrency from environment or use defaults
        const linkFinderConcurrency = parseInt(process.env.LINK_FINDER_CONCURRENCY, 10) || 5;
        const dataExtractorConcurrency = parseInt(process.env.DATA_EXTRACTOR_CONCURRENCY, 10) || 5;
        
        await updateTaskStatus(taskId, 'running', 25, null, {});
        
        // Start Link Finder Workers
        const linkFinderPromises = Array.from({ length: linkFinderConcurrency }, (_, i) =>
            linkFinderWorker(
                i + 1,
                locationQueue,
                sharedQueue,
                linkFinderContext,
                searchQuery, // Use config value directly
                ratingFilter, // Use config value directly
                userId,
                taskId,
                captchaManager
            )
        );
        
        // Start Data Extractor Workers  
        const dataExtractorPromises = Array.from({ length: dataExtractorConcurrency }, (_, i) =>
            dataExtractorWorker(
                i + 1,
                sharedQueue,
                dataFields, // Use config value directly
                dataExtractorContext,
                allProcessedResults,
                mainDataPro,
                advancedOptions // Pass advanced options for conditional processing
            )
        );
        
        await updateTaskStatus(taskId, 'running', 30, null, {});
        
        // Wait for link finders to complete with dynamic progress updates
        console.log(`Task ${taskId}: Waiting for LinkFinder workers to complete...`);
        
        // Track link finder progress based on queue size using frontend-provided total
        const linkFinderInterval = setInterval(async () => {
            if (totalZipCodes > 0) {
                // Calculate progress based on how many locations have been processed
                // We assume link finding is about 35% of the total work (from progress 15 to 50)
                const processedLocations = totalZipCodes - locationQueue.length;
                const linkFinderProgress = 15 + Math.min(35, Math.floor((processedLocations / totalZipCodes) * 35));
                await updateTaskStatus(taskId, 'running', linkFinderProgress, null, {});
            }
        }, 3000); // Update every 3 seconds
        
        await Promise.all(linkFinderPromises);
        clearInterval(linkFinderInterval);
        
        console.log(`Task ${taskId}: All LinkFinder workers finished.`);
        await updateTaskStatus(taskId, 'running', 50, null, {});
        
        // Signal completion to data extractors
        sharedQueue.notifyProducersFinished();
        
        // Wait for data extractors to complete with dynamic progress updates
        console.log(`Task ${taskId}: Waiting for DataExtractor workers to complete...`);
        
        // Track data extractor progress based on queue size and processed results
        const initialQueueSize = sharedQueue.queue.length;
        const dataExtractorInterval = setInterval(async () => {
            const processedCount = allProcessedResults.length;
            const totalCount = initialQueueSize;
            
            if (totalCount > 0) {
                // Calculate progress based on how many items have been processed
                // Data extraction is about 35% of the total work (from progress 50 to 85)
                const extractionProgress = 50 + Math.min(35, Math.floor((processedCount / totalCount) * 35));
                await updateTaskStatus(taskId, 'running', extractionProgress, null, {});
            }
        }, 2000); // Update every 2 seconds
        
        await Promise.all(dataExtractorPromises);
        clearInterval(dataExtractorInterval);
        
        console.log(`Task ${taskId}: All DataExtractor workers finished.`);
        await updateTaskStatus(taskId, 'running', 85, null, {});
        
        // Process results
        const successfulResults = allProcessedResults
            .filter(r => r.status !== 'skipped')
            .map(r => r.data);
        
        console.log(`Task ${taskId}: Extracted ${successfulResults.length} successful results from ${sharedQueue.seenLinks.size} total links.`);
        await updateTaskStatus(taskId, 'running', 90, null, {});
        
        // Save verification file for skipped links
        const skippedLinks = mainDataPro.getSkippedLinks();
        if (skippedLinks.length > 0) {
            await saveVerificationFile(taskId, skippedLinks);
        }
        
        // Save final results
        const { downloadLink, jsonDownloadLink, rowCount } = await saveResults({
            user_id: userId,
            task_id: taskId,
            keywords: config.search_query,
            states: 'multiple', // Simplified for new format
            country: 'US', // Default, could be extracted from location_rules if needed
            processedResults: successfulResults,
            listFields: dataFields
        });
        
        // Calculate credits based on row count (each row = 1 credit)
        const creditsUsed = rowCount;
        
        // Deduct credits from user account
        await deductCredits(userId, creditsUsed, taskId, `Scraping task: ${searchQuery}`);
        
        // Update final task status - only using schema-compliant fields
        await updateTaskStatus(taskId, 'completed', 100, null, {
            total_results: rowCount,
            credits_used: creditsUsed
        });
        
        console.log(`Task ${taskId}: Scraping completed successfully. Results: ${rowCount}, Credits used: ${creditsUsed}`);
        
        return {
            success: true,
            taskId,
            resultUrl: downloadLink,
            jsonResultUrl: jsonDownloadLink,
            rowCount,
            creditsUsed
        };
        
    } catch (error) {
        console.error(`Critical error in task ${task.id}:`, error.message, error.stack);
        await updateTaskStatus(task.id, 'failed', 0, error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close().catch(e => console.error(`Task ${task.id}: Error closing browser:`, e));
        }
    }
}

/**
 * Update task status in scraper_task table
 * @param {String} taskId - Task ID
 * @param {String} status - New status
 * @param {Number} progress - Progress percentage (0-100)
 * @param {String} errorMessage - Error message if failed
 * @param {Object} additionalData - Additional data to update (must be schema-compliant)
 */
async function updateTaskStatus(taskId, status, progress, errorMessage = null, additionalData = {}) {
    try {
        const updateData = {
            status,
            progress,
            updated_at: new Date().toISOString(),
            ...additionalData
        };
        
        if (errorMessage) {
            updateData.error_message = errorMessage;
        }
        
        const { error } = await supabaseAdmin
            .from('scraper_task')
            .update(updateData)
            .eq('id', taskId);
        
        if (error) {
            console.error(`Error updating task ${taskId}:`, error);
        } else {
            console.log(`📝 Task ${taskId} status updated to: ${status} (${progress}%)`);
        }
    } catch (error) {
        console.error(`Error updating task status for ${taskId}:`, error);
    }
}