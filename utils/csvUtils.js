import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import fs from 'fs/promises';

// Helper function to convert JSON data to CSV format and write the file
async function writeCsvFromJsonData(csvPath, jsonData, originalFields) {
  console.log(`[CSV Conversion] Starting conversion for: ${csvPath}`);

  if (!Array.isArray(jsonData)) {
    throw new Error('[CSV Conversion] Input JSON data is not an array.');
  }

  let csvFields = []; // Initialize empty
  let csvRecords = [];
  let isDataNested = false; // Flag to track if data is under a 'data' key

  if (jsonData.length === 0) {
    console.warn('[CSV Conversion] JSON data array is empty.');
    // Use original fields (minus reviews) for header in empty CSV
    csvFields = originalFields.filter(f => f !== 'reviews');
    console.log('[CSV Conversion] Using original fields for empty CSV header:', csvFields);
    // No records needed, csvRecords remains []
  } else {
    // Determine CSV fields and structure from the first JSON record
    const firstRecord = jsonData[0];

    if (firstRecord && firstRecord.data && typeof firstRecord.data === 'object' && Object.keys(firstRecord.data).length > 0) {
       // Assume data is nested if 'data' key exists, is an object, and is not empty
       csvFields = Object.keys(firstRecord.data);
       isDataNested = true;
       console.log('[CSV Conversion] Determined CSV fields from nested "data" object:', csvFields);
    } else if (firstRecord && typeof firstRecord === 'object') {
        // Fall back to top-level fields if 'data' isn't present or suitable
        csvFields = Object.keys(firstRecord).filter(key => key !== 'reviews'); // Exclude reviews
        isDataNested = false;
        console.log('[CSV Conversion] Determined CSV fields from top-level keys (excluding reviews):', csvFields);
    } else {
        console.warn('[CSV Conversion] First JSON record is not a valid object. Cannot determine headers.');
        // Use original fields as a last resort? Or throw error?
        csvFields = originalFields.filter(f => f !== 'reviews');
        console.log('[CSV Conversion] Falling back to original fields for CSV header due to invalid first record:', csvFields);
    }


    if (csvFields.length === 0) {
        console.warn('[CSV Conversion] No fields determined for CSV. CSV might be empty or headers only.');
        // Keep csvRecords = []
    } else {
        // --- Prepare records for CSV Writer ---
        csvRecords = jsonData.map((record, index) => {
          const csvRecord = {};

          // Check if the current record is valid
          if (!record || typeof record !== 'object') {
              console.warn(`[CSV Conversion] Record ${index}: Invalid record found (not an object). Skipping.`);
              // Create an empty row matching headers
               csvFields.forEach(field => { csvRecord[field] = ''; });
               return csvRecord;
          }

          // Access data based on whether it was determined to be nested or not
          const sourceObject = isDataNested ? record.data : record;

          // Check if the expected source object exists for nested data
          if (isDataNested && (!sourceObject || typeof sourceObject !== 'object')) {
              console.warn(`[CSV Conversion] Record ${index}: Expected nested "data" object not found or invalid. Creating empty row.`);
              csvFields.forEach(field => { csvRecord[field] = ''; });
              return csvRecord;
          }

          // Populate the CSV record row
          csvFields.forEach(field => {
            const value = sourceObject ? sourceObject[field] : undefined; // Access field from the correct source

             // console.log(`[CSV Conversion DEBUG] Record ${index}, Field '${field}', Value:`, value); // Verbose logging

            // Handle potential objects/arrays within the data values themselves
            if (value && typeof value === 'object') {
              console.warn(`[CSV Conversion] Record ${index}: Field '${field}' contains object/array, stringifying.`);
              csvRecord[field] = JSON.stringify(value);
            } else {
              // Convert primitive values (or null/undefined) to string and trim
              csvRecord[field] = String(value ?? '').trim();
            }
          });
          return csvRecord;
        });

         console.log(`[CSV Conversion] Prepared ${csvRecords.length} records.`);
         if (csvRecords.length > 0) {
            console.log('[CSV Conversion] First prepared CSV record sample:', JSON.stringify(csvRecords[0]));
         }
    }
  }

  // Ensure we have headers even if records are empty
  if (csvFields.length === 0 && jsonData.length > 0) {
      console.error('[CSV Conversion] Could not determine any headers for CSV, but JSON data exists. Skipping CSV write.');
       return; // Indicate CSV wasn't written properly
  }
   if (csvFields.length === 0 && jsonData.length === 0) {
        console.warn('[CSV Conversion] No headers and no data. Creating an empty CSV file.');
        // writeRecords will handle empty header/records gracefully by default,
        // but let's ensure the header array isn't undefined.
   }


  // Write the CSV file
  try {
    const csvWriterInstance = createCsvWriter({
      path: csvPath,
      // Ensure header IDs match the keys used in csvRecords
      header: csvFields.map(field => ({ id: field, title: field })),
      encoding: 'utf8',
      alwaysQuote: true,
      fieldDelimiter: ',',
      recordDelimiter: '\n'
    });

    await csvWriterInstance.writeRecords(csvRecords); // Write prepared records
    console.log(`[CSV Conversion] Successfully saved CSV to: ${csvPath}`);
  } catch (error) {
    console.error(`[CSV Conversion] Error writing CSV file ${csvPath}:`, error);
    throw new Error(`Failed to write CSV file: ${error.message}`); // Re-throw
  }
}

// ==========================================================
// The main saveResultsToCsv function remains unchanged
// as the fix is within the helper function it calls.
// ==========================================================
export async function saveResultsToCsv(filePath, results, fields) {
  // --- Basic Input Validation ---
  if (!filePath || !filePath.toLowerCase().endsWith('.csv')) {
    throw new Error('Invalid input: filePath is required and must end with .csv');
  }
  if (!Array.isArray(results)) {
    throw new Error('Invalid input: results must be an array.');
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    console.warn('Warning: Input fields array is empty or not an array. Will attempt to infer fields.');
  }

  const jsonPath = filePath.replace(/\.csv$/i, '.json');
  console.log(`[Main Flow] Target JSON path: ${jsonPath}`);
  console.log(`[Main Flow] Target CSV path: ${filePath}`);
  console.log(`[Main Flow] Initial results count: ${results.length}`);


  // --- Handle Empty Input Results ---
  if (results.length === 0) {
    console.warn('[Main Flow] Input results array is empty. Creating empty JSON and CSV.');
    try {
      await fs.writeFile(jsonPath, JSON.stringify([], null, 2), 'utf8');
      console.log(`[Main Flow] Created empty JSON array at: ${jsonPath}`);
      // Use the helper to write empty CSV with headers from original fields
      await writeCsvFromJsonData(filePath, [], fields);
      return `json:${jsonPath},csv:${filePath}`;
    } catch (error) {
      console.error('[Main Flow] Error creating empty files:', error);
      throw new Error('Failed to create empty files: ' + error.message);
    }
  }

  // --- Always Prepare Data for JSON (including review parsing) ---
  let resultsForJson;
  try {
    console.log('[JSON Prep] Starting JSON data preparation...');
    resultsForJson = JSON.parse(JSON.stringify(results)); // Deep copy

    resultsForJson.forEach((result, index) => {
      // Check if 'reviews' field exists and is a string needing parsing
      if (result.hasOwnProperty('reviews') && typeof result.reviews === 'string' && result.reviews.trim().length > 0) {
        const rawReviews = result.reviews.trim();
        // Your review parsing logic (assuming it works correctly for JSON)
        const reviewChunks = rawReviews.split(/\n\n\nlnln(?=Reviewer:)/);
        const reviewsArray = reviewChunks.map((reviewText, chunkIndex) => {
             const trimmedText = reviewText.trim();
             if (!trimmedText) return null;
             const reviewObj = { reviewer: "Unknown", rating: "N/A", date: "", content: "" };
             reviewObj.reviewer = trimmedText.match(/Reviewer:\s*([^\n]+)/)?.[1]?.trim() ?? reviewObj.reviewer;
             reviewObj.rating = trimmedText.match(/Rating:\s*([^\n]+)/)?.[1]?.trim() ?? reviewObj.rating;
             const timeMatch = trimmedText.match(/Time:\s*([^\n]+)/);
             if (timeMatch?.[1]) { reviewObj.date = timeMatch[1].trim(); }
             else {
                 const dateMatch = trimmedText.match(/(a\s+(?:month|year|day|week)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|(?:\d{1,2}\s+)?(?:month|year|day|week)s?\s+ago)/i);
                 if (dateMatch?.[0]) { reviewObj.date = dateMatch[0].trim(); }
             }
             reviewObj.content = trimmedText.match(/Review:\s*([\s\S]*)/)?.[1]?.trim() ?? "";
             if (reviewObj.reviewer === "Unknown" && reviewObj.rating === "N/A" && !reviewObj.date && !reviewObj.content) {
                 console.warn(`[JSON Prep] Record ${index}, Chunk ${chunkIndex}: Failed to parse review chunk meaningfully:`, trimmedText.substring(0, 100));
             }
             return reviewObj;
        }).filter(Boolean);
        result.reviews = reviewsArray;
      } else if (result.hasOwnProperty('reviews') && !Array.isArray(result.reviews)) {
         console.warn(`[JSON Prep] Record ${index}: 'reviews' field exists but is not a parseable string or array. Setting to []. Original type: ${typeof result.reviews}`);
         result.reviews = [];
      }
    });
    console.log('[JSON Prep] JSON data preparation finished.');
    if (resultsForJson.length > 0) {
        console.log('[JSON Prep] First prepared JSON record sample:', JSON.stringify(resultsForJson[0], null, 2));
    }
  } catch (error) {
    console.error('[JSON Prep] Error preparing data for JSON:', error);
    throw new Error('Failed during JSON data preparation: ' + error.message);
  }

  // --- Always Write JSON File ---
  try {
    console.log(`[JSON Write] Attempting to write JSON to: ${jsonPath}`);
    await fs.writeFile(jsonPath, JSON.stringify(resultsForJson, null, 2), 'utf8');
    console.log(`[JSON Write] Successfully saved JSON to: ${jsonPath}`);
  } catch (error) {
    console.error(`[JSON Write] Error writing JSON file ${jsonPath}:`, error);
    throw new Error('Failed to write JSON file: ' + error.message);
  }

  // --- Convert JSON to CSV ---
  try {
    const jsonString = await fs.readFile(jsonPath, 'utf8');
    const resultsFromJson = JSON.parse(jsonString);
    // Call the corrected helper function
    await writeCsvFromJsonData(filePath, resultsFromJson, fields);
    return `json:${jsonPath},csv:${filePath}`;
  } catch (error) {
    console.error(`[Main Flow] Error during JSON read or CSV conversion process:`, error);
    throw new Error(`Failed converting JSON to CSV: ${error.message}`);
  }
}