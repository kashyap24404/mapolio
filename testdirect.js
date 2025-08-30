// testdirect.js
// Standalone test script to process links from a CSV and run processData

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { processSingleLink } from './services/ProcessSingle.js';
import { chromium } from 'playwright';

// Path to the links CSV file
const linksFilePath = path.join(process.cwd(), 'public', 'Sheet - Sheet1.csv');

// Read and parse the CSV file
const fileContent = fs.readFileSync(linksFilePath, 'utf8');
const records = parse(fileContent, { columns: true });

const uniqueGoogleSearchLinks = records.map(row => row.href).filter(Boolean);


// const uniqueGoogleSearchLinks = ['https://www.google.com/sorry/index?continue=https://www.google.com/maps/place/Clausen%2BNursery/data%3D!4m7!3m6!1s0x80dc771ab0fdb097:0x4e2e3ffe08709c09!8m2!3d33.2495221!4d-117.2341964!16s%252Fg%252F1tdgvpng!19sChIJl7D9sBp33IARCZxwCP4_Lk4%3Fauthuser%3D0%26hl%3Den%26rclk%3D1&hl=en&q=EhAkCUDBUAjhM2AWqWLwwIuzGMD-5MEGIjDcF59hBCCEWHOEM08p_ZfzptRe6Ap7b4vyfYnImqBe3pbvpWRnTzn9L7HBpWEikBsyAnJSWgFD'];

// Define the fields you want to extract (customize as needed)
const listFields = [
  'title',
  'avg_rating',
  'rating_count',
  'address',
  'city',
  'state',
  'postcode',
  'website',
  'phone',
  'category',
  'permanently_closed',
  // 'wheelchair',
  // 'workhours',
  // 'images',
  'google_map_link',
  'latitude',
  'longitude'
  // 'reviews'
];

async function initializeBrowser() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  });
  return { browser, context };
}

async function closeBrowser(browser) {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing the browser:', error);
    }
  }
}

(async () => {
  let browser;
  try {
    const { browser: newBrowser, context } = await initializeBrowser();
    browser = newBrowser;
    console.log('Processing', uniqueGoogleSearchLinks.length, 'links...');
    const processedResults = [];
    const processingOptions = {
      singleImage: true,
      conditionalScraping: {
        enabled: true,
        keyField: 'category',
        targetValue: 'Indoor Playground',
        heavyFields: ['reviews', 'images'],
        skipmissmatch: true
      }
    };
    const concurrency = 15;
    const linksToProcess = [...uniqueGoogleSearchLinks];
    const activePromises = [];
    
    while (linksToProcess.length > 0 || activePromises.length > 0) {
      while (activePromises.length < concurrency && linksToProcess.length > 0) {
        const link = linksToProcess.shift();
        const promise = processSingleLink(link, listFields, context, processingOptions)
          .then(result => {
            if (result) { // Ensure result is not null
              processedResults.push(result);
            }
          })
          .catch(error => {
            console.error(`Error processing link: ${link}`, error);
            // Add a record of the failure to the results
            processedResults.push({ data: { google_map_link: link }, errors: { critical: error.message } });
          })
          .finally(() => {
            // Always remove the promise from the active list when it's settled
            const index = activePromises.indexOf(promise);
            if (index > -1) {
              activePromises.splice(index, 1);
            }
          });
        activePromises.push(promise);
      }
      // Wait for any of the active promises to complete
      if (activePromises.length > 0) {
        await Promise.race(activePromises);
      }
    }
    
    // --- File Saving Logic ---
    const outputCsvPath = path.join(process.cwd(), 'public', 'output.csv');
    const outputJsonPath = path.join(process.cwd(), 'public', 'test_results.json');
    const createObjectCsvWriter = (await import('csv-writer')).createObjectCsvWriter;

    if (!processedResults || processedResults.length === 0) {
      console.warn('[Save Flow] No results to process. Creating empty files.');
      // Create empty JSON
      fs.writeFileSync(outputJsonPath, JSON.stringify([], null, 2), 'utf8');
      // Create empty CSV with headers
      const emptyHeaders = listFields.map(f => ({ id: f, title: f }));
      emptyHeaders.push({ id: 'errors', title: 'errors' });
      const csvWriter = createObjectCsvWriter({ path: outputCsvPath, header: emptyHeaders });
      await csvWriter.writeRecords([]);
      console.log('Created empty output files.');
    } else {
      // --- 1. Prepare and Write JSON File ---
      try {
        console.log('[JSON Prep] Preparing data for structured JSON output...');
        // The `processedResults` are already structured correctly for JSON.
        // No deep copy or extra parsing is needed unless we were modifying it.
        fs.writeFileSync(outputJsonPath, JSON.stringify(processedResults, null, 2), 'utf8');
        console.log(`[JSON Write] Successfully saved structured JSON to: ${outputJsonPath}`);
      } catch (jsonError) {
        console.error('[JSON Prep/Write] Error during JSON file creation:', jsonError);
      }

      // --- 2. Prepare and Write Flattened CSV File ---
      try {
        console.log('[CSV Prep] Preparing data for flattened CSV output...');
        const csvHeaders = [...listFields, 'errors'].map(field => ({ id: field, title: field }));

        const csvRecords = processedResults.map(result => {
          const record = {};
          const sourceData = result ? result.data : {};
          const sourceErrors = result ? result.errors : {};

          for (const field of listFields) {
            const value = sourceData ? sourceData[field] : undefined;
            if (value && typeof value === 'object') {
              record[field] = JSON.stringify(value);
            } else {
              record[field] = value ?? '';
            }
          }
          record.errors = JSON.stringify(sourceErrors || {});
          return record;
        });

        const csvWriter = createObjectCsvWriter({
          path: outputCsvPath,
          header: csvHeaders,
          encoding: 'utf8',
          alwaysQuote: true,
          fieldDelimiter: ','
        });

        await csvWriter.writeRecords(csvRecords);
        console.log(`[CSV Write] Successfully saved flattened CSV to: ${outputCsvPath}`);
      } catch (csvError) {
        console.error('[CSV Prep/Write] Error during CSV file creation:', csvError);
      }
    }
  } catch (err) {
    console.error('Error running processData:', err);
  } finally {
    if (browser) {
      await closeBrowser(browser);
    }
  }
})();
