// Filename: compare-zips.js
// Place this file in the root directory of your project.

import fs from 'fs/promises';
import { getColoradoData } from './utils/exporter.js';

/**
 * Compares our scraped ZIP code data for Colorado against a master JSON file.
 */
async function compareZipCodes() {
  console.log("--- Starting ZIP Code Comparison for Colorado ---");

  try {
    // --- STEP 1: Load our scraped data ---
    console.log("\n[1/3] Loading data from our scraper...");
    const scrapedData = await getColoradoData();
    if (!scrapedData || !scrapedData.zipsByCity || Object.keys(scrapedData.zipsByCity).length === 0) {
      throw new Error("Our scraped data for Colorado is empty. Please run the scraper script first.");
    }
    
    // Flatten all ZIP code arrays into a single list and put it in a Set for fast lookups.
    const allScrapedZips = Object.values(scrapedData.zipsByCity).flat();
    const scrapedZipsSet = new Set(allScrapedZips);
    console.log(`  > Found ${scrapedZipsSet.size} unique ZIP codes in our scraped data.`);


    // --- STEP 2: Load the master JSON file data ---
    console.log("\n[2/3] Loading reference data from zipcodes.us.json...");
    const masterJsonFilePath = 'zipcodes.us.json';
    const jsonFileRaw = await fs.readFile(masterJsonFilePath, 'utf-8');
    const allZipsFromMasterFile = JSON.parse(jsonFileRaw);

    // Filter for Colorado entries, extract the zipcodes, and put them in a Set.
    const coloradoZipsFromMaster = allZipsFromMasterFile
      .filter(item => item.state === 'Colorado')
      .map(item => item.zipcode);
    const masterZipsSet = new Set(coloradoZipsFromMaster);
    console.log(`  > Found ${masterZipsSet.size} unique Colorado ZIP codes in the master JSON file.`);


    // --- STEP 3: Find the differences ---
    console.log("\n[3/3] Comparing the two lists...");
    const missingInMasterFile = []; // Zips we have that the master file does NOT have
    for (const zip of scrapedZipsSet) {
      if (!masterZipsSet.has(zip)) {
        missingInMasterFile.push(zip);
      }
    }

    const missingInOurData = []; // Zips the master file has that we do NOT have
    for (const zip of masterZipsSet) {
      if (!scrapedZipsSet.has(zip)) {
        missingInOurData.push(zip);
      }
    }


    // --- FINAL REPORT ---
    console.log("\n\n--- COMPARISON REPORT ---");
    console.log("--------------------------------------------------");
    
    console.log(`\n🔴 ZIPs in OUR SCRAPED DATA but NOT in master file (${missingInMasterFile.length} found):`);
    if (missingInMasterFile.length > 0) {
      console.log(missingInMasterFile.sort().join(', '));
    } else {
      console.log("  > None. Our scraped data is a perfect subset of the master file.");
    }

    console.log(`\n\n🟢 ZIPs in MASTER FILE but NOT in our scraped data (${missingInOurData.length} found):`);
    if (missingInOurData.length > 0) {
      console.log(missingInOurData.sort().join(', '));
    } else {
      console.log("  > None. Our scraper has captured every ZIP code from the master file.");
    }
    
    console.log("\n--------------------------------------------------");
    console.log("Comparison complete.");

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`\n❌ TEST FAILED: The file '${error.path}' was not found.`);
      console.error("   Please make sure 'zipcodes.us.json' is in the same directory as this script.");
    } else {
      console.error("\n❌ TEST FAILED with an unexpected error:", error.message);
    }
  }
}

// Run the comparison script
compareZipCodes();