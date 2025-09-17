// utils/csvUtils.js
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import fs from 'fs/promises';
import csv from 'csv-parser';

// The helper function writeCsvFromJsonData is no longer needed and has been removed.

/**
 * Saves scraping results to both a structured JSON file and a flattened CSV file.
 * Adopts a robust, two-pass approach to prepare data separately for each format.
 *
 * @param {string} filePath - The target path for the CSV file (e.g., 'public/output.csv').
 * @param {Array<Object>} results - The array of result objects, typically in the format [{ data: {...}, errors: {...} }, ...].
 * @param {Array<string>} fields - The original list of fields requested for scraping.
 * @returns {Promise<string>} A string indicating the paths of the created files.
 */
export async function saveResultsToCsv(filePath, results, fields) {
  // --- Basic Input Validation ---
  if (!filePath || !filePath.toLowerCase().endsWith('.csv')) {
    throw new Error('Invalid input: filePath is required and must end with .csv');
  }
  if (!Array.isArray(results)) {
    throw new Error('Invalid input: results must be an array.');
  }

  const jsonPath = filePath.replace(/\.csv$/i, '.json');
  console.log(`[Save Flow] Starting save process. Target CSV: ${filePath}`);
  console.log(`[Save Flow] Target JSON: ${jsonPath}`);
  console.log(`[Save Flow] Received ${results.length} results to process.`);

  // --- Handle Empty Input Results ---
  if (results.length === 0) {
    console.warn('[Save Flow] Input results array is empty. Creating empty files.');
    try {
      // Create empty JSON array file
      await fs.writeFile(jsonPath, JSON.stringify([], null, 2), 'utf8');
      console.log(`[Save Flow] Created empty JSON file at: ${jsonPath}`);

      // Create empty CSV with headers from original fields
      const emptyHeaders = (fields || []).map(f => ({ id: f, title: f }));
      const csvWriter = createCsvWriter({ path: filePath, header: emptyHeaders });
      await csvWriter.writeRecords([]); // Write 0 records
      console.log(`[Save Flow] Created empty CSV file with headers at: ${filePath}`);

      return `json:${jsonPath},csv:${filePath}`;
    } catch (error) {
      console.error('[Save Flow] Error creating empty files:', error);
      throw new Error('Failed to create empty files: ' + error.message);
    }
  }


  // --- 1. Prepare and Write a Structured JSON File ---
  try {
    console.log('[JSON Prep] Preparing data for structured JSON output...');
    // Deep copy results to avoid mutating the original data needed for CSV
    const resultsForJson = JSON.parse(JSON.stringify(results));

    // No need to process reviews for JSON anymore, as they are already in the correct format.
    // Write the structured JSON file
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`[JSON Write] Successfully saved structured JSON to: ${jsonPath}`);

  } catch (jsonError) {
    console.error('[JSON Prep/Write] Error during JSON file creation:', jsonError);
    throw new Error('Failed to create structured JSON file: ' + jsonError.message);
  }


  // --- 2. Prepare and Write a Flattened CSV File ---
  try {
    console.log('[CSV Prep] Preparing data for flattened CSV output...');

    // Define headers from the fields list, plus a dedicated 'errors' column.
    // This provides a consistent column order.
    const csvHeaders = [...fields, 'errors'].map(field => ({ id: field, title: field }));

    // Prepare records for CSV from the *original* results array
    const csvRecords = results.map(result => {
      const record = {};
      
      // Check if result has the expected structure { data: {}, errors: {} }
      // or if it's already the data object
      const sourceData = result.data || result;
      const sourceErrors = result.errors || {};

      for (const field of fields) {
        if (sourceData[field] && typeof sourceData[field] === 'object') {
          // Stringify any other complex objects (like 'images' if it's an array)
          record[field] = JSON.stringify(sourceData[field]);
        } else {
          // Handle primitive values
          record[field] = sourceData[field] ?? '';
        }
      }

      // Add the errors object as a stringified JSON column
      record.errors = JSON.stringify(sourceErrors || {});
      return record;
    });

    const csvWriter = createCsvWriter({
      path: filePath,
      header: csvHeaders,
      encoding: 'utf8',
      alwaysQuote: true, // Good practice for robustness
      fieldDelimiter: ','
    });

    await csvWriter.writeRecords(csvRecords);
    console.log(`[CSV Write] Successfully saved flattened CSV to: ${filePath}`);

  } catch (csvError) {
    console.error('[CSV Prep/Write] Error during CSV file creation:', csvError);
    throw new Error('Failed to create flattened CSV file: ' + csvError.message);
  }

  return `json:${jsonPath},csv:${filePath}`;
}

/**
 * Alternative approach: Convert existing JSON file to CSV
 * This ensures the CSV always matches the JSON data exactly
 * 
 * @param {string} jsonFilePath - Path to the JSON file
 * @param {string} csvFilePath - Path where CSV should be saved
 * @param {Array<string>} fields - Fields to include in CSV
 * @returns {Promise<void>}
 */
export async function convertJsonToCsv(jsonFilePath, csvFilePath, fields) {
  try {
    // Read the JSON file
    const jsonData = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));
    
    // If jsonData is not an array, wrap it in one
    const resultsArray = Array.isArray(jsonData) ? jsonData : [jsonData];
    
    if (resultsArray.length === 0) {
      console.log('[JSON->CSV] No data to convert. Creating empty CSV.');
      const emptyHeaders = (fields || []).map(f => ({ id: f, title: f }));
      const csvWriter = createCsvWriter({ path: csvFilePath, header: emptyHeaders });
      await csvWriter.writeRecords([]);
      return;
    }
    
    // Prepare records for CSV
    const csvRecords = resultsArray.map(item => {
      const record = {};
      
      // Handle both structures: { data: {}, errors: {} } or just the data object
      const sourceData = item.data || item;
      const sourceErrors = item.errors || {};
      
      // Process each requested field
      for (const field of fields) {
        if (sourceData[field] !== undefined) {
          if (typeof sourceData[field] === 'object') {
            // Stringify complex objects
            record[field] = JSON.stringify(sourceData[field]);
          } else {
            // Handle primitive values
            record[field] = sourceData[field];
          }
        } else {
          record[field] = ''; // Empty string for missing fields
        }
      }
      
      // Add errors column
      record.errors = JSON.stringify(sourceErrors);
      return record;
    });
    
    // Define CSV headers
    const csvHeaders = [...fields, 'errors'].map(field => ({ id: field, title: field }));
    
    // Write CSV file
    const csvWriter = createCsvWriter({
      path: csvFilePath,
      header: csvHeaders,
      encoding: 'utf8',
      alwaysQuote: true,
      fieldDelimiter: ','
    });
    
    await csvWriter.writeRecords(csvRecords);
    console.log(`[JSON->CSV] Successfully converted JSON to CSV: ${csvFilePath}`);
    
  } catch (error) {
    console.error('[JSON->CSV] Error converting JSON to CSV:', error);
    throw new Error('Failed to convert JSON to CSV: ' + error.message);
  }
}