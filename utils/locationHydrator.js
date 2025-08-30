// utils/locationHydrator.js
import { getStateData, getCityNames, getCountyNames } from './locationDataManager.js';

/**
 * Processes location rules from task.config.location_rules and returns an array of search locations
 * @param {Object} locationRules - The location_rules object from task config
 * @returns {Array} Array of location objects for scraping
 */
export async function expandLocationRules(locationRules) {
    console.log('🗺️  Processing location rules');
    
    let baseLocations = [];
    let excludeLocations = [];
    let includeLocations = [];

    // Process base locations (required)
    if (locationRules.base && Array.isArray(locationRules.base)) {
        baseLocations = await processLocationList(locationRules.base);
    }

    // Process exclude locations (optional)
    if (locationRules.exclude && Array.isArray(locationRules.exclude)) {
        excludeLocations = await processLocationList(locationRules.exclude);
    }

    // Process include locations (optional - explicitly include specific locations even if in exclude)
    if (locationRules.include && Array.isArray(locationRules.include)) {
        includeLocations = await processLocationList(locationRules.include);
    }

    // Combine and filter locations
    let finalLocations = [...baseLocations];

    // Remove excluded locations
    if (excludeLocations.length > 0) {
        const excludeIds = new Set(excludeLocations.map(loc => loc.id));
        finalLocations = finalLocations.filter(loc => !excludeIds.has(loc.id));
    }

    // Add back explicitly included locations
    if (includeLocations.length > 0) {
        const existingIds = new Set(finalLocations.map(loc => loc.id));
        includeLocations.forEach(loc => {
            if (!existingIds.has(loc.id)) {
                finalLocations.push(loc);
            }
        });
    }

    console.log(`📍 Final locations: ${finalLocations.length} locations for scraping`);
    return finalLocations;
}

/**
 * Process a list of location rules and expand them
 * @param {Array} locationList - Array of location objects
 * @returns {Array} Expanded location objects
 */
async function processLocationList(locationList) {
    const expandedLocations = [];

    for (const location of locationList) {
        try {
            const expanded = await expandSingleLocation(location);
            expandedLocations.push(...expanded);
        } catch (error) {
            console.error(`Error processing location ${JSON.stringify(location)}:`, error);
        }
    }

    return expandedLocations;
}

/**
 * Expand a single location rule based on its type
 * @param {Object} location - Single location object
 * @returns {Array} Array of expanded location objects
 */
async function expandSingleLocation(location) {
    const { type, name, zip_code } = location;

    switch (type) {
        case 'country':
            return await expandCountry(name);
        case 'state':
            return await expandState(name);
        case 'county':
            return await expandCounty(location);
        case 'city':
            return await expandCity(location);
        case 'zip':
            return expandZip(zip_code);
        default:
            console.warn(`Unknown location type: ${type}`);
            return [];
    }
}

/**
 * Expand country-level location rules
 * Default to ZIP code-level expansion for US
 */
async function expandCountry(countryName) {
    if (countryName !== 'US') {
        console.warn(`Country ${countryName} not supported. Only US is currently available.`);
        return [];
    }

    // For US, get all states and expand to ZIP codes
    const allStates = [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
        'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
        'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
        'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
        'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
        'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
        'Wisconsin', 'Wyoming'
    ];

    const locations = [];
    for (const stateName of allStates) {
        const stateLocations = await expandState(stateName);
        locations.push(...stateLocations);
    }

    return locations;
}

/**
 * Expand state-level location rules
 * Default to ZIP code-level expansion
 */
async function expandState(stateName) {
    const normalizedStateName = normalizeStateName(stateName);
    const stateSlug = stateNameToSlug(normalizedStateName);

    // Default to ZIP code-level expansion
    return await expandStateToZips(normalizedStateName, stateSlug);
}

/**
 * Expand state to all ZIP codes in that state
 */
async function expandStateToZips(stateName, stateSlug) {
    try {
        const stateData = await getStateData(stateName, stateSlug);
        const zipLocations = [];
        
        // Iterate through all cities and their ZIP codes
        for (const [citySlug, zipCodes] of Object.entries(stateData.zipsByCity)) {
            // Convert slug back to a readable city name
            const cityName = citySlug.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            for (const zipCode of zipCodes) {
                zipLocations.push({
                    id: `zip_${zipCode}`,
                    type: 'zip',
                    zipCode: zipCode,
                    city: cityName,
                    state: stateName,
                    stateSlug: stateSlug,
                    searchQuery: `${zipCode}, ${cityName}, ${stateName}, US`
                });
            }
        }
        
        return zipLocations;
    } catch (error) {
        console.error(`Error expanding state ${stateName} to ZIP codes:`, error);
        return [];
    }
}

/**
 * Expand county-level location rules to ZIP codes
 */
async function expandCounty(location) {
    const { name: countyName, state } = location;
    if (!state) {
        console.warn('County location must include state');
        return [];
    }

    const normalizedStateName = normalizeStateName(state);
    const stateSlug = stateNameToSlug(normalizedStateName);

    try {
        const stateData = await getStateData(normalizedStateName, stateSlug);
        const zipLocations = [];
        
        // Find the county and get ZIP codes for all cities in that county
        const allStatesData = await import('./locationDataManager.js').then(module => module.loadAllStatesData());
        const stateKey = normalizedStateName.toLowerCase();
        
        if (allStatesData[stateKey] && allStatesData[stateKey].counties && allStatesData[stateKey].counties[countyName]) {
            const countyData = allStatesData[stateKey].counties[countyName];
            
            // Iterate through all cities in the county and their ZIP codes
            if (countyData.cities) {
                for (const [cityName, zipCodes] of Object.entries(countyData.cities)) {
                    const citySlug = slugify(cityName);
                    for (const zipCode of zipCodes) {
                        zipLocations.push({
                            id: `zip_${zipCode}`,
                            type: 'zip',
                            zipCode: zipCode,
                            city: cityName,
                            county: countyName,
                            state: normalizedStateName,
                            stateSlug: stateSlug,
                            searchQuery: `${zipCode}, ${cityName}, ${countyName}, ${normalizedStateName}, US`
                        });
                    }
                }
            }
        }
        
        return zipLocations;
    } catch (error) {
        console.error(`Error expanding county ${countyName}, ${state} to ZIP codes:`, error);
        return [];
    }
}

/**
 * Expand city-level location rules to ZIP codes
 */
async function expandCity(location) {
    const { name: cityName, state } = location;
    if (!state) {
        console.warn('City location must include state');
        return [];
    }

    const normalizedStateName = normalizeStateName(state);
    const stateSlug = stateNameToSlug(normalizedStateName);
    const citySlug = slugify(cityName);

    try {
        const stateData = await getStateData(normalizedStateName, stateSlug);
        
        // Get ZIP codes for this specific city
        if (stateData.zipsByCity[citySlug]) {
            return stateData.zipsByCity[citySlug].map(zipCode => ({
                id: `zip_${zipCode}`,
                type: 'zip',
                zipCode: zipCode,
                city: cityName,
                state: normalizedStateName,
                stateSlug: stateSlug,
                searchQuery: `${zipCode}, ${cityName}, ${normalizedStateName}, US`
            }));
        } else {
            console.warn(`No ZIP codes found for city ${cityName}, ${state}`);
            return [];
        }
    } catch (error) {
        console.error(`Error expanding city ${cityName}, ${state} to ZIP codes:`, error);
        return [];
    }
}

/**
 * Expand ZIP code location rules
 */
function expandZip(zipCode) {
    return [{
        id: `zip_${zipCode}`,
        type: 'zip',
        zipCode: zipCode,
        searchQuery: `${zipCode}, US`
    }];
}

/**
 * Utility functions
 */
function normalizeStateName(stateName) {
    // Convert state abbreviations to full names if needed
    const stateAbbreviations = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
        'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
        'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
        'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
        'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
        'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
        'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
        'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };

    return stateAbbreviations[stateName.toUpperCase()] || stateName;
}

function stateNameToSlug(stateName) {
    return stateName.toLowerCase().replace(/\s+/g, '-');
}

function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}