// utils/exporter.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Base Directory ---
// All other paths will be constructed dynamically from this.
const STATES_DIR = path.join(__dirname, 'states');

// --- Helper Functions ---

/**
 * Loads a JSON file safely.
 * Returns undefined if the file is not found (ENOENT).
 * Throws other errors (e.g., JSON parsing errors).
 */
async function loadJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // This is an expected case (e.g., a city file might not exist), so we don't log a warning here.
      return undefined;
    }
    // For actual errors like malformed JSON, log it.
    console.error(`Error loading or parsing JSON file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Creates a URL-friendly slug from a city name for use in filenames.
 * @param {string} cityName - The name of the city (e.g., "Fort Collins").
 * @returns {string} The slugified name (e.g., "fort-collins").
 */
function slugifyCityForFilename(cityName) {
  return cityName
    .toLowerCase()
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
}

/**
 * Generic function to get city and ZIP code data for a state.
 * @param {string} stateName - The display name of the state (e.g., "Colorado").
 * @param {string} stateSlug - The slug of the state used in file paths (e.g., "colorado").
 * @returns {Promise<object>} An object with 'cities' array and 'zipsByCity' object.
 */
async function getStateData(stateName, stateSlug) {
  const stateData = {
    cities: [],       // Default to empty array
    zipsByCity: {},   // Default to empty object
  };

  const cityIndexFilePath = path.join(STATES_DIR, `${stateSlug}.json`);

  try {
    // 1. Load the list of all cities for the state.
    const loadedCities = await loadJsonFile(cityIndexFilePath);

    if (!Array.isArray(loadedCities)) {
      console.warn(`City index file for ${stateName} (${cityIndexFilePath}) was not found or did not contain an array.`);
      return stateData; // Return default empty data
    }
    
    stateData.cities = loadedCities;
    const stateDataDir = path.join(STATES_DIR, stateSlug);

    // 2. For each city, load its corresponding ZIP code file.
    for (const cityName of stateData.cities) {
      const citySlug = slugifyCityForFilename(cityName);
      const zipsFilePath = path.join(stateDataDir, `${citySlug}.json`);
      
      try {
        const loadedZips = await loadJsonFile(zipsFilePath);

        if (Array.isArray(loadedZips)) {
          stateData.zipsByCity[citySlug] = loadedZips;
        } else {
          // This can happen if a city is in the index but its file is missing/corrupt.
          console.warn(`ZIP code data for ${cityName} in ${stateName} was not found or invalid. Assigning empty list.`);
          stateData.zipsByCity[citySlug] = [];
        }
      } catch (error) {
        // Catches errors from loadJsonFile (e.g., JSON parse error).
        console.error(`Failed to process ZIP codes for ${cityName} in ${stateName}. Setting empty list.`, error);
        stateData.zipsByCity[citySlug] = [];
      }
    }
  } catch (error) {
    // This catches errors from loading the main city index file.
    console.error(`FATAL: Could not load city index for ${stateName} from ${cityIndexFilePath}.`, error);
    // Return the default empty object.
  }

  return stateData;
}

/**
 * Generic function to get city names for a state, optimized to only read the city index.
 * @param {string} stateName - The display name of the state (e.g., "Colorado").
 * @param {string} stateSlug - The slug of the state used in file paths (e.g., "colorado").
 * @returns {Promise<string[]>} An array of city names.
 */
async function getCityNames(stateName, stateSlug) {
  const cityIndexFilePath = path.join(STATES_DIR, `${stateSlug}.json`);
  try {
    const loadedCities = await loadJsonFile(cityIndexFilePath);
    if (!Array.isArray(loadedCities)) {
      console.warn(`City index file for ${stateName} (${cityIndexFilePath}) was not found or did not contain an array.`);
      return []; // Return empty array on failure
    }
    return loadedCities;
  } catch (error) {
    console.error(`FATAL: Could not load city index for ${stateName} from ${cityIndexFilePath}.`, error);
    return []; // Return empty array on fatal error
  }
}

/**
 * Generic function to get county names for a state.
 * @param {string} stateName - The display name of the state (e.g., "Colorado").
 * @param {string} stateSlug - The slug of the state used in file paths (e.g., "colorado").
 * @returns {Promise<string[]>} An array of county names.
 */
async function getCountyNames(stateName, stateSlug) {
  const countyFilePath = path.join(STATES_DIR, stateSlug, 'counties.json');
  try {
    const loadedCounties = await loadJsonFile(countyFilePath);
    if (!Array.isArray(loadedCounties)) {
      console.warn(`County file for ${stateName} (${countyFilePath}) was not found or did not contain an array.`);
      return []; // Return empty array on failure
    }
    return loadedCounties;
  } catch (error) {
    console.error(`FATAL: Could not load county file for ${stateName} from ${countyFilePath}.`, error);
    return []; // Return empty array on fatal error
  }
}

// --- EXPORTED FUNCTIONS ---
// Each function now calls the generic loader with the state's name and slug.

export async function getAlabamaData() {
  return getStateData("Alabama", "alabama");
}

export async function getAlaskaData() {
  return getStateData("Alaska", "alaska");
}

export async function getArizonaData() {
  return getStateData("Arizona", "arizona");
}

export async function getArkansasData() {
  return getStateData("Arkansas", "arkansas");
}

export async function getCaliforniaData() {
  return getStateData("California", "california");
}

export async function getColoradoData() {
  return getStateData("Colorado", "colorado");
}

export async function getConnecticutData() {
  return getStateData("Connecticut", "connecticut");
}

export async function getDelawareData() {
  return getStateData("Delaware", "delaware");
}

export async function getFloridaData() {
  return getStateData("Florida", "florida");
}

export async function getGeorgiaData() {
  return getStateData("Georgia", "georgia");
}

export async function getHawaiiData() {
  return getStateData("Hawaii", "hawaii");
}

export async function getIdahoData() {
  return getStateData("Idaho", "idaho");
}

export async function getIllinoisData() {
  return getStateData("Illinois", "illinois");
}

export async function getIndianaData() {
  return getStateData("Indiana", "indiana");
}

export async function getIowaData() {
  return getStateData("Iowa", "iowa");
}

export async function getKansasData() {
  return getStateData("Kansas", "kansas");
}

export async function getKentuckyData() {
  return getStateData("Kentucky", "kentucky");
}

export async function getLouisianaData() {
  return getStateData("Louisiana", "louisiana");
}

export async function getMaineData() {
  return getStateData("Maine", "maine");
}

export async function getMarylandData() {
  return getStateData("Maryland", "maryland");
}

export async function getMassachusettsData() {
  return getStateData("Massachusetts", "massachusetts");
}

export async function getMichiganData() {
  return getStateData("Michigan", "michigan");
}

export async function getMinnesotaData() {
  return getStateData("Minnesota", "minnesota");
}

export async function getMississippiData() {
  return getStateData("Mississippi", "mississippi");
}

export async function getMissouriData() {
  return getStateData("Missouri", "missouri");
}

export async function getMontanaData() {
  return getStateData("Montana", "montana");
}

export async function getNebraskaData() {
  return getStateData("Nebraska", "nebraska");
}

export async function getNevadaData() {
  return getStateData("Nevada", "nevada");
}

export async function getNewHampshireData() {
  return getStateData("New Hampshire", "new-hampshire");
}

export async function getNewJerseyData() {
  return getStateData("New Jersey", "new-jersey");
}

export async function getNewMexicoData() {
  return getStateData("New Mexico", "new-mexico");
}

export async function getNewYorkData() {
  return getStateData("New York", "new-york");
}

export async function getNorthCarolinaData() {
  return getStateData("North Carolina", "north-carolina");
}

export async function getNorthDakotaData() {
  return getStateData("North Dakota", "north-dakota");
}

export async function getOhioData() {
  return getStateData("Ohio", "ohio");
}

export async function getOklahomaData() {
  return getStateData("Oklahoma", "oklahoma");
}

export async function getOregonData() {
  return getStateData("Oregon", "oregon");
}

export async function getPennsylvaniaData() {
  return getStateData("Pennsylvania", "pennsylvania");
}

export async function getRhodeIslandData() {
  return getStateData("Rhode Island", "rhode-island");
}

export async function getSouthCarolinaData() {
  return getStateData("South Carolina", "south-carolina");
}

export async function getSouthDakotaData() {
  return getStateData("South Dakota", "south-dakota");
}

export async function getTennesseeData() {
  return getStateData("Tennessee", "tennessee");
}

export async function getTexasData() {
  return getStateData("Texas", "texas");
}

export async function getUtahData() {
  return getStateData("Utah", "utah");
}

export async function getVermontData() {
  return getStateData("Vermont", "vermont");
}

export async function getVirginiaData() {
  return getStateData("Virginia", "virginia");
}

// --- EXPORTED CITY NAME FUNCTIONS ---

export async function getAlabamaCityNames() { return getCityNames("Alabama", "alabama"); }
export async function getAlaskaCityNames() { return getCityNames("Alaska", "alaska"); }
export async function getArizonaCityNames() { return getCityNames("Arizona", "arizona"); }
export async function getArkansasCityNames() { return getCityNames("Arkansas", "arkansas"); }
export async function getCaliforniaCityNames() { return getCityNames("California", "california"); }
export async function getColoradoCityNames() { return getCityNames("Colorado", "colorado"); }
export async function getConnecticutCityNames() { return getCityNames("Connecticut", "connecticut"); }
export async function getDelawareCityNames() { return getCityNames("Delaware", "delaware"); }
export async function getFloridaCityNames() { return getCityNames("Florida", "florida"); }
export async function getGeorgiaCityNames() { return getCityNames("Georgia", "georgia"); }
export async function getHawaiiCityNames() { return getCityNames("Hawaii", "hawaii"); }
export async function getIdahoCityNames() { return getCityNames("Idaho", "idaho"); }
export async function getIllinoisCityNames() { return getCityNames("Illinois", "illinois"); }
export async function getIndianaCityNames() { return getCityNames("Indiana", "indiana"); }
export async function getIowaCityNames() { return getCityNames("Iowa", "iowa"); }
export async function getKansasCityNames() { return getCityNames("Kansas", "kansas"); }
export async function getKentuckyCityNames() { return getCityNames("Kentucky", "kentucky"); }
export async function getLouisianaCityNames() { return getCityNames("Louisiana", "louisiana"); }
export async function getMaineCityNames() { return getCityNames("Maine", "maine"); }
export async function getMarylandCityNames() { return getCityNames("Maryland", "maryland"); }
export async function getMassachusettsCityNames() { return getCityNames("Massachusetts", "massachusetts"); }
export async function getMichiganCityNames() { return getCityNames("Michigan", "michigan"); }
export async function getMinnesotaCityNames() { return getCityNames("Minnesota", "minnesota"); }
export async function getMississippiCityNames() { return getCityNames("Mississippi", "mississippi"); }
export async function getMissouriCityNames() { return getCityNames("Missouri", "missouri"); }
export async function getMontanaCityNames() { return getCityNames("Montana", "montana"); }
export async function getNebraskaCityNames() { return getCityNames("Nebraska", "nebraska"); }
export async function getNevadaCityNames() { return getCityNames("Nevada", "nevada"); }
export async function getNewHampshireCityNames() { return getCityNames("New Hampshire", "new-hampshire"); }
export async function getNewJerseyCityNames() { return getCityNames("New Jersey", "new-jersey"); }
export async function getNewMexicoCityNames() { return getCityNames("New Mexico", "new-mexico"); }
export async function getNewYorkCityNames() { return getCityNames("New York", "new-york"); }
export async function getNorthCarolinaCityNames() { return getCityNames("North Carolina", "north-carolina"); }
export async function getNorthDakotaCityNames() { return getCityNames("North Dakota", "north-dakota"); }
export async function getOhioCityNames() { return getCityNames("Ohio", "ohio"); }
export async function getOklahomaCityNames() { return getCityNames("Oklahoma", "oklahoma"); }
export async function getOregonCityNames() { return getCityNames("Oregon", "oregon"); }
export async function getPennsylvaniaCityNames() { return getCityNames("Pennsylvania", "pennsylvania"); }
export async function getRhodeIslandCityNames() { return getCityNames("Rhode Island", "rhode-island"); }
export async function getSouthCarolinaCityNames() { return getCityNames("South Carolina", "south-carolina"); }
export async function getSouthDakotaCityNames() { return getCityNames("South Dakota", "south-dakota"); }
export async function getTennesseeCityNames() { return getCityNames("Tennessee", "tennessee"); }
export async function getTexasCityNames() { return getCityNames("Texas", "texas"); }
export async function getUtahCityNames() { return getCityNames("Utah", "utah"); }
export async function getVermontCityNames() { return getCityNames("Vermont", "vermont"); }
export async function getVirginiaCityNames() { return getCityNames("Virginia", "virginia"); }
export async function getWashingtonCityNames() { return getCityNames("Washington", "washington"); }
export async function getWestVirginiaCityNames() { return getCityNames("West Virginia", "west-virginia"); }
export async function getWisconsinCityNames() { return getCityNames("Wisconsin", "wisconsin"); }
export async function getWyomingCityNames() { return getCityNames("Wyoming", "wyoming"); }

// --- EXPORTED COUNTY NAME FUNCTIONS ---

export async function getAlabamaCountyNames() { return getCountyNames("Alabama", "alabama"); }
export async function getAlaskaCountyNames() { return getCountyNames("Alaska", "alaska"); }
export async function getArizonaCountyNames() { return getCountyNames("Arizona", "arizona"); }
export async function getArkansasCountyNames() { return getCountyNames("Arkansas", "arkansas"); }
export async function getCaliforniaCountyNames() { return getCountyNames("California", "california"); }
export async function getColoradoCountyNames() { return getCountyNames("Colorado", "colorado"); }
export async function getConnecticutCountyNames() { return getCountyNames("Connecticut", "connecticut"); }
export async function getDelawareCountyNames() { return getCountyNames("Delaware", "delaware"); }
export async function getFloridaCountyNames() { return getCountyNames("Florida", "florida"); }
export async function getGeorgiaCountyNames() { return getCountyNames("Georgia", "georgia"); }
export async function getHawaiiCountyNames() { return getCountyNames("Hawaii", "hawaii"); }
export async function getIdahoCountyNames() { return getCountyNames("Idaho", "idaho"); }
export async function getIllinoisCountyNames() { return getCountyNames("Illinois", "illinois"); }
export async function getIndianaCountyNames() { return getCountyNames("Indiana", "indiana"); }
export async function getIowaCountyNames() { return getCountyNames("Iowa", "iowa"); }
export async function getKansasCountyNames() { return getCountyNames("Kansas", "kansas"); }
export async function getKentuckyCountyNames() { return getCountyNames("Kentucky", "kentucky"); }
export async function getLouisianaCountyNames() { return getCountyNames("Louisiana", "louisiana"); }
export async function getMaineCountyNames() { return getCountyNames("Maine", "maine"); }
export async function getMarylandCountyNames() { return getCountyNames("Maryland", "maryland"); }
export async function getMassachusettsCountyNames() { return getCountyNames("Massachusetts", "massachusetts"); }
export async function getMichiganCountyNames() { return getCountyNames("Michigan", "michigan"); }
export async function getMinnesotaCountyNames() { return getCountyNames("Minnesota", "minnesota"); }
export async function getMississippiCountyNames() { return getCountyNames("Mississippi", "mississippi"); }
export async function getMissouriCountyNames() { return getCountyNames("Missouri", "missouri"); }
export async function getMontanaCountyNames() { return getCountyNames("Montana", "montana"); }
export async function getNebraskaCountyNames() { return getCountyNames("Nebraska", "nebraska"); }
export async function getNevadaCountyNames() { return getCountyNames("Nevada", "nevada"); }
export async function getNewHampshireCountyNames() { return getCountyNames("New Hampshire", "new-hampshire"); }
export async function getNewJerseyCountyNames() { return getCountyNames("New Jersey", "new-jersey"); }
export async function getNewMexicoCountyNames() { return getCountyNames("New Mexico", "new-mexico"); }
export async function getNewYorkCountyNames() { return getCountyNames("New York", "new-york"); }
export async function getNorthCarolinaCountyNames() { return getCountyNames("North Carolina", "north-carolina"); }
export async function getNorthDakotaCountyNames() { return getCountyNames("North Dakota", "north-dakota"); }
export async function getOhioCountyNames() { return getCountyNames("Ohio", "ohio"); }
export async function getOklahomaCountyNames() { return getCountyNames("Oklahoma", "oklahoma"); }
export async function getOregonCountyNames() { return getCountyNames("Oregon", "oregon"); }
export async function getPennsylvaniaCountyNames() { return getCountyNames("Pennsylvania", "pennsylvania"); }
export async function getRhodeIslandCountyNames() { return getCountyNames("Rhode Island", "rhode-island"); }
export async function getSouthCarolinaCountyNames() { return getCountyNames("South Carolina", "south-carolina"); }
export async function getSouthDakotaCountyNames() { return getCountyNames("South Dakota", "south-dakota"); }
export async function getTennesseeCountyNames() { return getCountyNames("Tennessee", "tennessee"); }
export async function getTexasCountyNames() { return getCountyNames("Texas", "texas"); }
export async function getUtahCountyNames() { return getCountyNames("Utah", "utah"); }
export async function getVermontCountyNames() { return getCountyNames("Vermont", "vermont"); }
export async function getVirginiaCountyNames() { return getCountyNames("Virginia", "virginia"); }
export async function getWashingtonCountyNames() { return getCountyNames("Washington", "washington"); }
export async function getWestVirginiaCountyNames() { return getCountyNames("West Virginia", "west-virginia"); }
export async function getWisconsinCountyNames() { return getCountyNames("Wisconsin", "wisconsin"); }
export async function getWyomingCountyNames() { return getCountyNames("Wyoming", "wyoming"); }

export async function getWashingtonData() {
  return getStateData("Washington", "washington");
}

export async function getWestVirginiaData() {
  return getStateData("West Virginia", "west-virginia");
}

export async function getWisconsinData() {
  return getStateData("Wisconsin", "wisconsin");
}

export async function getWyomingData() {
  return getStateData("Wyoming", "wyoming");
}

