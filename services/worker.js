// services/worker.js
import { searchGoogleMaps } from './searchService.js';
// processData is now part of MainDataPro, which will be instantiated in scraperService

// --- Producer Worker ---
export async function linkFinderWorker(workerId, locationQueue, sharedQueue, context, keywords, rating, user_id, task_id, captchaManager) {
    const totalLocations = locationQueue.length;
    let processedLocations = 0;
    
    while (locationQueue.length > 0) {
        const location = locationQueue.shift();
        if (!location) continue;

        processedLocations++;
        const { type, zipCode, city, county, state, stateSlug, searchQuery } = location;
        let query;
        let locationIdentifier;

        // Use the searchQuery directly if available
        if (searchQuery) {
            query = `${keywords} in ${searchQuery}`;
            locationIdentifier = `Location: ${searchQuery}`;
        } else if (type === 'zip' && zipCode) {
            query = `${keywords} in ${zipCode}, ${city || ''}, ${state || ''}, US`;
            locationIdentifier = `ZIP: ${zipCode} (${city || 'unknown'}, ${state || 'unknown'})`;
        } else if (type === 'city' && city && state) {
            query = `${keywords} in ${city}, ${state}, US`;
            locationIdentifier = `City: ${city}, ${state}`;
        } else if (type === 'county' && county && state) {
            query = `${keywords} in ${county}, ${state}, US`;
            locationIdentifier = `County: ${county}, ${state}`;
        } else if (type === 'state' && state) {
            query = `${keywords} in ${state}, US`;
            locationIdentifier = `State: ${state}`;
        } else {
            // Fallback to using whatever information we have
            const locationParts = [zipCode, city, county, state].filter(Boolean);
            query = `${keywords} in ${locationParts.join(', ')}, US`;
            locationIdentifier = `${type}: ${locationParts.join(', ')}`;
        }

        try {
            const links = await searchGoogleMapsWithRetry(context, query, user_id, task_id, rating, captchaManager, 2, `LinkFinder-${workerId}`);
            links.forEach(link => sharedQueue.addLink(link));
            console.log(`LinkFinder Worker ${workerId} found ${links.length} links for ${locationIdentifier}. Queue size: ${sharedQueue.queue.length}`);
        } catch (err) {
            console.error(`  LinkFinder Worker ${workerId}: Permanently failed to process location "${locationIdentifier}" after retries.`);
        }

        // Log progress every 5 locations
        if (processedLocations % 5 === 0 || processedLocations === totalLocations) {
            console.log(`LinkFinder Worker ${workerId}: Processed ${processedLocations}/${totalLocations} locations`);
        }

        await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
    }
    
    console.log(`LinkFinder Worker ${workerId}: Completed processing all ${processedLocations} locations`);
}

// --- Consumer Worker ---
export async function dataExtractorWorker(workerId, sharedQueue, listFields, context, allResults, mainDataPro, advancedOptions = {}) {
    let processedLinks = 0;
    
    while (true) {
        const link = await sharedQueue.getLink();
        if (link === null) {
            console.log(`DataExtractor Worker ${workerId}: No more links to process. Shutting down.`);
            break;
        }

        try {
            // Pass advancedOptions to the processData method
            const result = await mainDataPro.processData(link, listFields, context, advancedOptions);
            
            // Push the entire result object to handle different statuses if needed later
            if (result) {
                allResults.push(result);
                processedLinks++;
                
                // Log progress every 10 links
                if (processedLinks % 10 === 0) {
                    console.log(`DataExtractor Worker ${workerId}: Processed ${processedLinks} links so far`);
                }
            }
        } catch (error) {
            console.error(`DataExtractor Worker ${workerId} failed to process link ${link}:`, error.message);
        }
    }
    
    console.log(`DataExtractor Worker ${workerId}: Completed processing ${processedLinks} links`);
}

async function searchGoogleMapsWithRetry(context, query, user_id, task_id, rating, captchaManager, maxRetries = 3, workerId = 'N/A') {
    let attempts = 0;
    while (attempts <= maxRetries) {
        let page;
        try {
            page = await context.newPage(); // Create a fresh page for the attempt
            // The searchGoogleMaps function is now imported
            return await searchGoogleMaps(page, query, user_id, task_id, rating, captchaManager);
        } catch (error) {
            attempts++;
            console.warn(`  Worker ${workerId} (Task ${task_id}): Attempt ${attempts}/${maxRetries + 1} failed for query "${query}". Error: ${error.message.split('\n')[0]}`);
            if (attempts > maxRetries) {
                console.error(`  Worker ${workerId} (Task ${task_id}): Max retries reached for query "${query}". Giving up.`);
                throw error;
            }
            const delay = Math.pow(2, attempts) * 1000 + Math.random() * 1000;
            console.log(`  Worker ${workerId} (Task ${task_id}): Retrying in ${Math.round(delay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        } finally {
            if (page && !page.isClosed()) {
                await page.close(); // Ensure page is closed after each attempt
            }
        }
    }
    return [];
}