import { supabase, supabaseAdmin } from '../config/supabase.js';
import { searchGoogleMaps } from './searchService.js';
import { processData } from './MainDataPro.js';
import { createObjectCsvWriter } from 'csv-writer';
import { saveResultsToCsv } from '../utils/csvUtils.js';
import path from 'path';
import { chromium } from 'playwright';

// Status update function
async function updateScrapingStatus(user_id, task_id, status, additionalData = {}) {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalData
  };

  const { error } = await supabaseAdmin
    .from('scraping_requests')
    .update(updateData)
    .eq('user_id', user_id)
    .eq('task_id', task_id);

  if (error) throw error;
}

export async function runScraping(user_id, task_id) {
  console.log("user_id", user_id);
  console.log("task_id", task_id);
  try {
    // Initial status update - Starting the process
    await updateScrapingStatus(user_id, task_id, 'processing', {
      stage: 'initializing',
      progress: '0%'
    });

    // Get request data from Supabase using admin client
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('scraping_requests')
      .select('*')
      .eq('user_id', user_id)
      .eq('task_id', task_id);

    if (requestError) throw requestError;
    if (!requestData || requestData.length === 0) {
      throw new Error('Request not found in Supabase');
    }

    const { keywords, country, states, fields, rating } = requestData[0];
    const listFields = fields
      ? fields.split(',').map(f => f.trim())
      : ['title', 'avg_rating', 'rating_count', 'address', 'website', 'phone', 'images'];

    // Split states by comma and trim any whitespace; use as a queue
    const stateQueue = states.split(',').map(state => state.trim());
    const totalStates = stateQueue.length;

    // Update status - Starting search phase
    await updateScrapingStatus(user_id, task_id, 'processing', {
      stage: 'searching',
      progress: '10%',
      current_state: 'Starting search phase'
    });

    // Launch the browser ONCE
    const browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-extensions',
      ]
    });

    // Create a browser context ONCE
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });

    // Array to accumulate all Google search links from every state
    const GoogleSearchLinks = [];
    const concurrencyLimit = 7;
    let processedStates = 0;

    // Worker function: picks one state from the queue until empty.
    async function worker() {
      while (true) {
        const state = stateQueue.shift();
        if (!state) break;

        try {
          // Update status for each state
          processedStates++;
          const progress = Math.round((processedStates / totalStates) * 30) + 10; // 10-40% range
          await updateScrapingStatus(user_id, task_id, 'processing', {
            stage: 'searching',
            progress: `${progress}%`,
            current_state: state
          });

          // Build the query for the current state
          const query = `${keywords}+in+${state}+${country}`;

          // Get links directly from Google Maps
          const links = await searchGoogleMaps(context, query, user_id, task_id, rating);

          // Accumulate the links into our global array
          GoogleSearchLinks.push(...links);
        } catch (err) {
          console.error(`Error processing state "${state}":`, err);
        }
      }
    }

    // Start the workers concurrently
    const workers = [];
    for (let i = 0; i < concurrencyLimit; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    await browser.close();

    // Update status - Search phase complete, starting data processing
    await updateScrapingStatus(user_id, task_id, 'processing', {
      stage: 'processing',
      progress: '50%',
      current_state: 'Processing collected data'
    });

    // Create a CSV file with all accumulated links
    const sanitizedQuery = `${keywords}_in_${country}`.replace(/[^A-Za-z0-9]+/g, '_');
    const linksFileName = `links_${user_id}_${task_id}_${sanitizedQuery}.csv`;
    const linksFilePath = path.join(process.cwd(), 'public', linksFileName);
    const csvWriter = createObjectCsvWriter({
      path: linksFilePath,
      header: [{ id: 'href', title: 'href' }]
    });

    const uniqueGoogleSearchLinks = Array.from(new Set(GoogleSearchLinks));

    await csvWriter.writeRecords(uniqueGoogleSearchLinks.map(link => ({ href: link })));

    // Update status - Starting data extraction
    await updateScrapingStatus(user_id, task_id, 'processing', {
      stage: 'extracting',
      progress: '60%',
      current_state: 'Extracting business data'
    });

    const processedResults = await processData(uniqueGoogleSearchLinks, listFields);

    // Update status - Saving results
    await updateScrapingStatus(user_id, task_id, 'processing', {
      stage: 'saving',
      progress: '90%',
      current_state: 'Saving results'
    });

    // Save final results to a CSV file
    const outputFileName = `results_${user_id}_${task_id}.csv`;
    const outputFilePath = path.join(process.cwd(), 'public', outputFileName);
    await saveResultsToCsv(outputFilePath, processedResults, listFields);

    // Update status - Completed
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const downloadLink = `${baseUrl}/download/csv/${user_id}/${task_id}`;
    const downloadJsonLink = `${baseUrl}/download/json/${user_id}/${task_id}`;
    
    await updateScrapingStatus(user_id, task_id, 'completed', {
      progress: '100%',
      result_url: downloadLink,
      json_result_url: downloadJsonLink,
      row_count: processedResults.length
    });

    return { success: true, message: 'Scraping completed' };
  } catch (error) {
    console.error('Error in scraper:', error);
    // Update status - Failed
    await updateScrapingStatus(user_id, task_id, 'failed', {
      error_message: error.message
    });
    throw error;
  }
}
