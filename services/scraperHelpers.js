// services/scraperHelpers.js
import fs from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '../config/supabase.js';
import scrapingConfig from '../config/scrapingConfig.js';
import { saveResultsToCsv, convertJsonToCsv } from '../utils/csvUtils.js';

// Extract the needed configurations from the default export
const { DEEP_SEARCH_CONFIG, STATE_ABBREVIATIONS } = scrapingConfig;

export function getResultsFilePath(userId, taskId, keywords, states, country) {
    const safeKeywords = keywords.replace(/[^a-zA-Z0-9]/g, '');
    const safeCountry = country.replace(/[^a-zA-Z0-9]/g, '');
    
    const statesArray = Array.isArray(states) ? states : (states || '').split(',');
    let safeStates;
    if (statesArray.length > 3) {
        safeStates = `${statesArray.length}states`;
    } else {
        safeStates = statesArray.join('').replace(/[^a-zA-Z0-9]/g, '');
    }

    const sanitizedQuery = `${safeKeywords}_${safeStates}_${safeCountry}`;
    
    if (userId) {
        const publicDir = path.join(process.cwd(), 'public');
        const filename = `results_${userId}_${taskId}_${sanitizedQuery}.csv`;
        return path.join(publicDir, filename);
    }
    
    // Local run
    const personalDir = path.join(process.cwd(), 'public', 'personal');
    const filename = `results_${sanitizedQuery}_${taskId}.csv`;
    return path.join(personalDir, filename);
}

export function slugifyCity(cityName) {
    if (typeof cityName !== 'string') return '';
    return cityName.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Update task status in scraper_task table
 * Updated to use scraper_task table instead of legacy scraping_requests
 * @param {String} taskId - Task ID (not user_id + task_id combo)
 * @param {String} status - New status
 * @param {Object} additionalData - Additional data to update
 */
export async function updateScrapingStatus(taskId, status, additionalData = {}) {
    try {
        const updateData = { 
            status, 
            updated_at: new Date().toISOString(), 
            ...additionalData 
        };
        
        const { error } = await supabaseAdmin
            .from('scraper_task')
            .update(updateData)
            .eq('id', taskId);
            
        if (error) {
            console.error(`Error updating status for task ${taskId}:`, error.message);
            throw error;
        }
        
        console.log(`Task ${taskId} status updated to: ${status}`);
    } catch (error) {
        console.error(`Failed to update task ${taskId} status:`, error);
        throw error;
    }
}

/**
 * Update task progress in scraper_task table
 * @param {String} taskId - Task ID
 * @param {Number} progress - Progress percentage (0-100)
 * @param {Object} additionalData - Additional data to update
 */
export async function updateTaskProgress(taskId, progress, additionalData = {}) {
    try {
        const updateData = {
            progress: Math.max(0, Math.min(100, progress)),
            updated_at: new Date().toISOString(),
            ...additionalData
        };
        
        const { error } = await supabaseAdmin
            .from('scraper_task')
            .update(updateData)
            .eq('id', taskId);
            
        if (error) {
            console.error(`Error updating progress for task ${taskId}:`, error.message);
            throw error;
        }
        
        console.log(`Task ${taskId} progress updated to: ${progress}%`);
    } catch (error) {
        console.error(`Failed to update task ${taskId} progress:`, error);
        throw error;
    }
}

/**
 * Build the location queue respecting:
 * - initialStates (array of state slugs)
 * - countryCap (e.g., 'US')
 * - optional selection (single-state or multi-state) as defined in communicator/REQUEST-SCHEMA.md
 *
 * If a selection object is provided, it will constrain/expand the queue accordingly:
 * - When selection.states[] is present (multi-state), merge per-state queues.
 * - For single-state selection:
 *   - include.zips === true -> zip-level for all cities (minus excludes)
 *   - include.cities === true && include.zips === false -> city-level (minus excludes)
 *   - else, fall back to county-level for that state
 *
 * Notes:
 * - Current dataset lacks county→city mapping; include.counties is approximated by including all cities.
 * - Default granularity is county-level
 */
export async function buildLocationQueue(initialStates, countryCap, selection = undefined) {
    const locationQueue = [];

    // Helper to expand a single state with optional selection entry
    const expandState = async (stateSlug, selectionEntry) => {
        const stateName = stateSlug; // already slug
        const configKey = stateName.replace(/-/g, ' ');
        const stateConfig = DEEP_SEARCH_CONFIG[configKey];
        const stateAbbrDraft = STATE_ABBREVIATIONS[stateName];
        const stateAbbr = stateAbbrDraft ? stateAbbrDraft.toUpperCase() : undefined;
        const ForStateGranularity = stateName;

        if (!stateConfig || !stateAbbr) return;

        // Read geo data once if needed
        let geoData = null;
        let allCities = null;
        const ensureGeoData = async () => {
            if (!geoData) {
                geoData = await stateConfig.getDataFunction();
                allCities = geoData?.cities || [];
            }
            return geoData;
        };

        // Selection-driven expansion
        if (selectionEntry) {
            const include = selectionEntry.include || {};
            const exclude = selectionEntry.exclude || {};
            const includeCitiesAll = include.cities === true;
            const includeZipsAll = include.zips === true;

            // Resolve excludes
            const excludedCityNames = new Set();
            if (Array.isArray(exclude.cities)) {
                for (const c of exclude.cities) {
                    if (c?.city) excludedCityNames.add(c.city);
                }
            }
            const excludedZips = new Set(Array.isArray(exclude.zips) ? exclude.zips.map(z => String(z).trim()) : []);

            // Zip-level include all
            if (includeZipsAll) {
                await ensureGeoData();
                for (const cityName of allCities) {
                    if (excludedCityNames.has(cityName)) continue;
                    const citySlug = slugifyCity(cityName);
                    const zipsInCity = geoData.zipsByCity[citySlug] || [];
                    for (const zipCode of zipsInCity) {
                        if (excludedZips.has(String(zipCode))) continue;
                        locationQueue.push({ type: 'zip', zip: zipCode, city: cityName, stateAbbr, country: countryCap });
                    }
                }
                return;
            }

            // City-level include all cities (no zip expansion)
            if (includeCitiesAll && include.zips === false) {
                const cityNames = await stateConfig.getCityNamesFunction();
                for (const cityName of cityNames) {
                    if (excludedCityNames.has(cityName)) continue;
                    locationQueue.push({ type: 'city', zip: null, city: cityName, stateAbbr, country: countryCap });
                }
                return;
            }

            // Explicit lists handling (zip array or cities array)
            if (Array.isArray(include.zips) && include.zips.length > 0) {
                for (const z of include.zips) {
                    const code = String(z).trim();
                    if (!/^\d{5}$/.test(code)) continue;
                    if (excludedZips.has(code)) continue;
                    locationQueue.push({ type: 'zip', zip: code, city: null, stateAbbr, country: countryCap });
                }
                return;
            }

            if (Array.isArray(include.cities) && include.cities.length > 0) {
                for (const entry of include.cities) {
                    if (entry?.city && !excludedCityNames.has(entry.city)) {
                        locationQueue.push({ type: 'city', zip: null, city: entry.city, stateAbbr, country: countryCap });
                    }
                }
                return;
            }

            // Counties true/array -> approximate all cities at city level (no precise county mapping available)
            if (include.counties === true || (Array.isArray(include.counties) && include.counties.length > 0)) {
                const cityNames = await stateConfig.getCityNamesFunction();
                for (const cityName of cityNames) {
                    if (excludedCityNames.has(cityName)) continue;
                    locationQueue.push({ type: 'city', zip: null, city: cityName, stateAbbr, country: countryCap });
                }
                return;
            }
            // If selectionEntry present but none of the above matched, fall back to county-level below.
        }

        // Fallback: default to county-level
        const countyNames = await stateConfig.getCountyNamesFunction();
        for (const countyName of countyNames) {
            locationQueue.push({ type: 'county', zip: null, city: null, county: countyName, stateAbbr, country: countryCap });
        }
    };

    // Determine if a multi-state selection is provided
    let selectionMap = undefined;
    if (selection && Array.isArray(selection.states)) {
        selectionMap = new Map();
        for (const s of selection.states) {
            if (s?.state) {
                const slug = String(s.state).trim().toLowerCase().replace(/\s+/g, '-');
                selectionMap.set(slug, s);
            }
        }
    }

    for (const stateSlug of initialStates) {
        const selEntry = selectionMap ? selectionMap.get(stateSlug) : (selection && selection.state ? selection : undefined);
        // If single-state selection is present but targets a different state, ignore for this state
        const effectiveSel = selEntry && (selEntry.state ? String(selEntry.state).trim().toLowerCase().replace(/\s+/g, '-') === stateSlug : true) ? selEntry : undefined;
        // Expand this state
        await expandState(stateSlug, effectiveSel);
    }

    return locationQueue;
}

/**
 * Save scraping results and update task status
 * Updated to work with scraper_task table
 * @param {Object} params - Parameters object
 * @returns {Object} Results with download link and row count
 */
export async function saveResults({ user_id, task_id, keywords, states, country, processedResults, listFields }) {
    const outputFilePath = getResultsFilePath(user_id, task_id, keywords, states, country);
    const outputFileName = path.basename(outputFilePath);
    
    // Ensure the directory exists
    await fs.mkdir(path.dirname(outputFilePath), { recursive: true }).catch(e => { if (e.code !== 'EEXIST') throw e; });

    // Update progress to saving results
    if (task_id) {
        await updateTaskProgress(task_id, 95);
    }

    // Save results to JSON file first, then convert to CSV
    if (processedResults.length > 0) {
        const jsonPath = outputFilePath.replace(/\.csv$/i, '.json');
        // Save JSON first
        await fs.writeFile(jsonPath, JSON.stringify(processedResults, null, 2), 'utf-8');
        // Then convert JSON to CSV
        await convertJsonToCsv(jsonPath, outputFilePath, listFields);
    } else {
        await fs.writeFile(outputFilePath, "No data processed.\n", 'utf-8');
        const jsonPath = outputFilePath.replace(/\.csv$/i, '.json');
        await fs.writeFile(jsonPath, JSON.stringify([], null, 2), 'utf-8');
    }

    // Generate download links and update final status
    if (user_id && task_id) {
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
        const outputFileNameWithoutExt = outputFileName.replace(/\.[^/.]+$/, ""); // Remove extension
        const csvDownloadLink = `${baseUrl}/download/csv/${user_id}/${task_id}/${outputFileName}`;
        const jsonDownloadLink = `${baseUrl}/download/json/${user_id}/${task_id}/${outputFileNameWithoutExt}.json`;
        
        // Update task with final results and both URLs
        await updateScrapingStatus(task_id, 'completed', { 
            progress: 100,
            total_results: processedResults.length,
            result_csv_url: csvDownloadLink,
            result_json_url: jsonDownloadLink
        });
        
        return { 
            downloadLink: csvDownloadLink, 
            jsonDownloadLink: jsonDownloadLink,
            rowCount: processedResults.length 
        };
    }

    // For local runs without user context
    return { downloadLink: null, rowCount: processedResults.length };
}