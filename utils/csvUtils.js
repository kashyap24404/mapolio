// utils/csvUtils.js
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import fs from 'fs/promises';

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
      const sourceData = result.data || {};

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
      record.errors = JSON.stringify(result.errors || {});
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