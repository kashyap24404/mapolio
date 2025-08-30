// Filename: deepsearch.js
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration for ALL states ---
// This list contains all states to be scraped.
const STATE_CONFIG = [
  { name: "Alabama", slug: "alabama" }, { name: "Alaska", slug: "alaska" },
  { name: "Arizona", slug: "arizona" }, { name: "Arkansas", slug: "arkansas" },
  { name: "California", slug: "california" }, { name: "Colorado", slug: "colorado" },
  { name: "Connecticut", slug: "connecticut" }, { name: "Delaware", slug: "delaware" },
  { name: "Florida", slug: "florida" }, { name: "Georgia", slug: "georgia" },
  { name: "Hawaii", slug: "hawaii" }, { name: "Idaho", slug: "idaho" },
  { name: "Illinois", slug: "illinois" }, { name: "Indiana", slug: "indiana" },
  { name: "Iowa", slug: "iowa" }, { name: "Kansas", slug: "kansas" },
  { name: "Kentucky", slug: "kentucky" }, { name: "Louisiana", slug: "louisiana" },
  { name: "Maine", slug: "maine" }, { name: "Maryland", slug: "maryland" },
  { name: "Massachusetts", slug: "massachusetts" }, { name: "Michigan", slug: "michigan" },
  { name: "Minnesota", slug: "minnesota" }, { name: "Mississippi", slug: "mississippi" },
  { name: "Missouri", slug: "missouri" }, { name: "Montana", slug: "montana" },
  { name: "Nebraska", slug: "nebraska" }, { name: "Nevada", slug: "nevada" },
  { name: "New Hampshire", slug: "new-hampshire" }, { name: "New Jersey", slug: "new-jersey" },
  { name: "New Mexico", slug: "new-mexico" }, { name: "New York", slug: "new-york" },
  { name: "North Carolina", slug: "north-carolina" }, { name: "North Dakota", slug: "north-dakota" },
  { name: "Ohio", slug: "ohio" }, { name: "Oklahoma", slug: "oklahoma" },
  { name: "Oregon", slug: "oregon" }, { name: "Pennsylvania", slug: "pennsylvania" },
  { name: "Rhode Island", slug: "rhode-island" }, { name: "South Carolina", slug: "south-carolina" },
  { name: "South Dakota", slug: "south-dakota" }, { name: "Tennessee", slug: "tennessee" },
  { name: "Texas", slug: "texas" }, { name: "Utah", slug: "utah" },
  { name: "Vermont", slug: "vermont" }, { name: "Virginia", slug: "virginia" },
  { name: "Washington", slug: "washington" }, { name: "West Virginia", slug: "west-virginia" },
  { name: "Wisconsin", slug: "wisconsin" }, { name: "Wyoming", slug: "wyoming" }
];

// --- REQUIRED MAPPING for URL construction ---
// This object maps the state slug to its two-letter abbreviation for the URL.
const STATE_ABBREVIATIONS = {
    'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca',
    'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga',
    'hawaii': 'hi', 'idaho': 'id', 'illinois': 'il', 'indiana': 'in', 'iowa': 'ia', 'kansas': 'ks',
    'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md', 'massachusetts': 'ma',
    'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms', 'missouri': 'mo', 'montana': 'mt',
    'nebraska': 'ne', 'nevada': 'nv', 'new-hampshire': 'nh', 'new-jersey': 'nj', 'new-mexico': 'nm',
    'new-york': 'ny', 'north-carolina': 'nc', 'north-dakota': 'nd', 'ohio': 'oh', 'oklahoma': 'ok',
    'oregon': 'or', 'pennsylvania': 'pa', 'rhode-island': 'ri', 'south-carolina': 'sc', 'south-dakota': 'sd',
    'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt', 'virginia': 'va', 'washington': 'wa',
    'west-virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy'
};


// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = 'https://www.zip-codes.com/state/';
const OUTPUT_FILE = path.join(__dirname, 'all_states_nested.json');

// --- Helper Functions ---
// A simple helper function to pause execution between requests to be polite to the server.
async function delay(ms) {
  console.log(`  Waiting for ${ms / 1000}s before next state...`);
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrapes ZIP code data for a single state and organizes it into the required nested structure.
 * @param {object} state - The state object from STATE_CONFIG, e.g., { name: "Alabama", slug: "alabama" }
 * @returns {Promise<object|null>} - A promise that resolves to the nested state data or null on failure.
 */
async function scrapeDataForState(state) {
  const stateAbbr = STATE_ABBREVIATIONS[state.slug];
  if (!stateAbbr) {
    console.error(`  ERROR: No abbreviation found for ${state.name}. Skipping.`);
    return null;
  }

  const url = `${BASE_URL}${stateAbbr}.asp`;
  console.log(`  Fetching data from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        // Using a common user-agent can help avoid being blocked.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // This object will hold the final nested structure for the current state.
    const stateData = {
      counties: {}
    };

    // Find the table by its ID and iterate over each row (tr) in its body (tbody).
    $('table#tblZIP tbody tr').each((i, rowElement) => {
      const row = $(rowElement);
      
      // Use the specified selectors to find the data cells (td) and extract the text.
      const zipCode = row.find('td:nth-child(1) a').text().trim();
      const cityName = row.find('td:nth-child(3) a').text().trim();
      const countyName = row.find('td:nth-child(4)').text().trim();

      // Basic validation: Skip rows where essential data is missing.
      if (!zipCode || !cityName || !countyName) {
        console.warn(`  [WARN] Skipping row in ${state.name} due to missing data: zip=${zipCode}, city=${cityName}, county=${countyName}`);
        return; // 'return' here is like 'continue' in a for loop.
      }

      // Further validation: Ensure the ZIP code is a 5-digit number.
      const cleanZip = zipCode.replace(/\D/g, ''); // Remove any non-digit characters
      if (cleanZip.length !== 5) {
        console.warn(`  [WARN] Skipping invalid zip code format in ${state.name}: ${zipCode}`);
        return;
      }

      // --- Build the nested structure as requested ---

      // 1. Check if the county exists. If not, create it with a 'cities' object.
      if (!stateData.counties[countyName]) {
        stateData.counties[countyName] = { cities: {} };
      }

      // 2. Check if the city exists within that county. If not, create it as an empty array for zip codes.
      if (!stateData.counties[countyName].cities[cityName]) {
        stateData.counties[countyName].cities[cityName] = [];
      }

      // 3. Add the ZIP code to the city's array, ensuring no duplicates.
      if (!stateData.counties[countyName].cities[cityName].includes(cleanZip)) {
        stateData.counties[countyName].cities[cityName].push(cleanZip);
      }
    });

    const countyCount = Object.keys(stateData.counties).length;
    if (countyCount === 0) {
      console.warn(`  [WARN] No counties found for ${state.name}. The page structure might have changed or there was an error.`);
      return null;
    }

    console.log(`  Successfully found ${countyCount} unique counties in ${state.name}.`);
    return stateData;

  } catch (error) {
    console.error(`  [ERROR] Failed to scrape ${state.name}:`, error.message);
    return null;
  }
}

// --- Main Execution Orchestrator ---
async function main() {
  console.log(`Starting to scrape all ${STATE_CONFIG.length} states...`);
  const masterData = {}; // This object will hold all data for all states.

  // Loop through every state in the configuration.
  let stateCounter = 1;
  for (const state of STATE_CONFIG) {
    console.log(`\n[${stateCounter}/${STATE_CONFIG.length}] Processing State: ${state.name}`);
    const stateData = await scrapeDataForState(state);
    
    // If scraping was successful, add the state's data to the master object.
    if (stateData) {
      masterData[state.slug] = stateData;
    }
    
    // Add a polite delay between state requests to avoid overwhelming the server.
    // Skip the delay after the very last state.
    if (stateCounter < STATE_CONFIG.length) {
      // Wait for a random duration between 2 to 3 seconds.
      await delay(2000 + Math.random() * 1000); 
    }
    stateCounter++;
  }

  // After processing all states, write the complete master data object to a single JSON file.
  try {
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(masterData, null, 2));
    console.log('\n--- SCRIPT FINISHED ---');
    console.log(`All state data has been successfully written to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error(`\n[FATAL ERROR] Could not write the final JSON file:`, error);
  }
}

main().catch(error => {
  console.error('[FATAL ERROR] An unhandled error occurred in the main execution:', error);
});