import { scrollUntilEndForWeb } from '../utils/scrollUtils.js';

// No changes needed in this helper function
function processLinkText(url) {
  if (!url) return null;
  try {
    const urlObject = new URL(url);
    const hostname = urlObject.hostname;
    const key = hostname.replace('www.', '').split('.')[0];
    return { key, value: url };
  } catch (error) {
    console.warn(`Could not process text into a valid URL: "${url}"`);
    return null;
  }
}

/**
 * Extracts web results by finding and parsing a hidden JavaScript data map.
 * This version robustly iterates through all scripts to find the map.
 * @param {import('playwright').Page} page - The Playwright page object.
 * @returns {Promise<Object<string, string>>}
 */
export async function extractWebResults(page) {
  await scrollUntilEndForWeb(page);

  const iframe = page.frameLocator('iframe.rvN3ke');
  let urlMap = {};

  // --- Step 1: Robustly find the script with the URL map ---
  try {
    // Get all script tags within the iframe
    const allScripts = await iframe.locator('script').all();
    
    for (const scriptLocator of allScripts) {
      const scriptContent = await scriptLocator.innerText();
      // Use a regex to check if this script contains our target object.
      // The 's' flag allows '.' to match newlines, making it more robust.
      const match = scriptContent.match(/var m\s*=\s*({.*?});/s);
      
      if (match && match[1]) {
        try {
          // Found it! Parse the JSON string into our map.
          urlMap = JSON.parse(match[1]);
          // We found the map, so we can stop looking.
          break; 
        } catch (e) {
          // This script contained something that looked like the map but wasn't valid JSON.
          // Continue to the next script.
          console.warn('Found a script that matched the pattern but failed to parse as JSON. Trying next script.');
        }
      }
    }

    if (Object.keys(urlMap).length === 0) {
        console.warn("Could not find the URL data map after checking all scripts.");
    }

  } catch(error) {
    console.error("An error occurred while trying to find and parse the URL data map:", error);
  }

  // --- Step 2: Iterate through containers and look up URLs in our map ---
  const resultContainers = await iframe.locator('div.HTomEb').all();
  const results = {};

  for (const container of resultContainers) {
    const jsdata = await container.getAttribute('jsdata');
    if (!jsdata || !jsdata.includes(';_;')) continue;

    const parts = jsdata.split(';_;');
    const lookupKey = parts[parts.length - 1];

    if (lookupKey && urlMap[lookupKey]) {
      const finalUrl = urlMap[lookupKey][0];
      
      if (finalUrl) {
        const processedData = processLinkText(finalUrl);
        if (processedData && !results[processedData.key]) {
          results[processedData.key] = processedData.value;
        }
      }
    }
  }

  return results;
}