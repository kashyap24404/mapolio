import fs from 'fs/promises';
import path from 'path';

let allStatesData = null;

export async function loadAllStatesData() {
  if (!allStatesData) {
    const filePath = path.join(process.cwd(), 'utils', 'all_states_nested.json');
    const data = await fs.readFile(filePath, 'utf-8');
    allStatesData = JSON.parse(data);
  }
  return allStatesData;
}

function slugifyCity(cityName) {
  return cityName.toLowerCase().replace(/\s+/g, '-');
}

function getStateNameFromSlug(stateSlug) {
  const stateMap = {
    'alabama': 'Alabama',
    'alaska': 'Alaska',
    'arizona': 'Arizona',
    'arkansas': 'Arkansas',
    'california': 'California',
    'colorado': 'Colorado',
    'connecticut': 'Connecticut',
    'delaware': 'Delaware',
    'florida': 'Florida',
    'georgia': 'Georgia',
    'hawaii': 'Hawaii',
    'idaho': 'Idaho',
    'illinois': 'Illinois',
    'indiana': 'Indiana',
    'iowa': 'Iowa',
    'kansas': 'Kansas',
    'kentucky': 'Kentucky',
    'louisiana': 'Louisiana',
    'maine': 'Maine',
    'maryland': 'Maryland',
    'massachusetts': 'Massachusetts',
    'michigan': 'Michigan',
    'minnesota': 'Minnesota',
    'mississippi': 'Mississippi',
    'missouri': 'Missouri',
    'montana': 'Montana',
    'nebraska': 'Nebraska',
    'nevada': 'Nevada',
    'new-hampshire': 'New Hampshire',
    'new-jersey': 'New Jersey',
    'new-mexico': 'New Mexico',
    'new-york': 'New York',
    'north-carolina': 'North Carolina',
    'north-dakota': 'North Dakota',
    'ohio': 'Ohio',
    'oklahoma': 'Oklahoma',
    'oregon': 'Oregon',
    'pennsylvania': 'Pennsylvania',
    'rhode-island': 'Rhode Island',
    'south-carolina': 'South Carolina',
    'south-dakota': 'South Dakota',
    'tennessee': 'Tennessee',
    'texas': 'Texas',
    'utah': 'Utah',
    'vermont': 'Vermont',
    'virginia': 'Virginia',
    'washington': 'Washington',
    'west-virginia': 'West Virginia',
    'wisconsin': 'Wisconsin',
    'wyoming': 'Wyoming'
  };
  return stateMap[stateSlug] || stateSlug;
}

// Unified data access functions
export async function getStateData(stateName, stateSlug) {
  const data = await loadAllStatesData();
  const stateKey = stateName.toLowerCase();
  
  if (!data[stateKey]) {
    return { cities: [], zipsByCity: {} };
  }

  const stateData = data[stateKey];
  const cities = [];
  const zipsByCity = {};

  // Extract all cities from counties structure
  if (stateData.counties) {
    for (const [countyName, countyData] of Object.entries(stateData.counties)) {
      if (countyData.cities) {
        for (const [cityName, zipCodes] of Object.entries(countyData.cities)) {
          if (!cities.includes(cityName)) {
            cities.push(cityName);
          }
          const citySlug = slugifyCity(cityName);
          if (!zipsByCity[citySlug]) {
            zipsByCity[citySlug] = [];
          }
          // Add ZIP codes, flattening the array structure
          if (Array.isArray(zipCodes)) {
            zipsByCity[citySlug].push(...zipCodes);
          }
        }
      }
    }
  }

  return { cities, zipsByCity };
}

export async function getCityNames(stateName, stateSlug) {
  const data = await loadAllStatesData();
  const stateKey = stateName.toLowerCase();
  
  if (!data[stateKey] || !data[stateKey].counties) {
    return [];
  }

  const cities = new Set();
  for (const [countyName, countyData] of Object.entries(data[stateKey].counties)) {
    if (countyData.cities) {
      for (const cityName of Object.keys(countyData.cities)) {
        cities.add(cityName);
      }
    }
  }

  return Array.from(cities).sort();
}

export async function getCountyNames(stateName, stateSlug) {
  const data = await loadAllStatesData();
  const stateKey = stateName.toLowerCase();
  
  if (!data[stateKey] || !data[stateKey].counties) {
    return [];
  }

  return Object.keys(data[stateKey].counties).sort();
}

// Compatibility layer - generates all state-specific functions
export const getAlabamaData = () => getStateData('Alabama', 'alabama');
export const getAlaskaData = () => getStateData('Alaska', 'alaska');
export const getArizonaData = () => getStateData('Arizona', 'arizona');
export const getArkansasData = () => getStateData('Arkansas', 'arkansas');
export const getCaliforniaData = () => getStateData('California', 'california');
export const getColoradoData = () => getStateData('Colorado', 'colorado');
export const getConnecticutData = () => getStateData('Connecticut', 'connecticut');
export const getDelawareData = () => getStateData('Delaware', 'delaware');
export const getFloridaData = () => getStateData('Florida', 'florida');
export const getGeorgiaData = () => getStateData('Georgia', 'georgia');
export const getHawaiiData = () => getStateData('Hawaii', 'hawaii');
export const getIdahoData = () => getStateData('Idaho', 'idaho');
export const getIllinoisData = () => getStateData('Illinois', 'illinois');
export const getIndianaData = () => getStateData('Indiana', 'indiana');
export const getIowaData = () => getStateData('Iowa', 'iowa');
export const getKansasData = () => getStateData('Kansas', 'kansas');
export const getKentuckyData = () => getStateData('Kentucky', 'kentucky');
export const getLouisianaData = () => getStateData('Louisiana', 'louisiana');
export const getMaineData = () => getStateData('Maine', 'maine');
export const getMarylandData = () => getStateData('Maryland', 'maryland');
export const getMassachusettsData = () => getStateData('Massachusetts', 'massachusetts');
export const getMichiganData = () => getStateData('Michigan', 'michigan');
export const getMinnesotaData = () => getStateData('Minnesota', 'minnesota');
export const getMississippiData = () => getStateData('Mississippi', 'mississippi');
export const getMissouriData = () => getStateData('Missouri', 'missouri');
export const getMontanaData = () => getStateData('Montana', 'montana');
export const getNebraskaData = () => getStateData('Nebraska', 'nebraska');
export const getNevadaData = () => getStateData('Nevada', 'nevada');
export const getNewHampshireData = () => getStateData('New Hampshire', 'new-hampshire');
export const getNewJerseyData = () => getStateData('New Jersey', 'new-jersey');
export const getNewMexicoData = () => getStateData('New Mexico', 'new-mexico');
export const getNewYorkData = () => getStateData('New York', 'new-york');
export const getNorthCarolinaData = () => getStateData('North Carolina', 'north-carolina');
export const getNorthDakotaData = () => getStateData('North Dakota', 'north-dakota');
export const getOhioData = () => getStateData('Ohio', 'ohio');
export const getOklahomaData = () => getStateData('Oklahoma', 'oklahoma');
export const getOregonData = () => getStateData('Oregon', 'oregon');
export const getPennsylvaniaData = () => getStateData('Pennsylvania', 'pennsylvania');
export const getRhodeIslandData = () => getStateData('Rhode Island', 'rhode-island');
export const getSouthCarolinaData = () => getStateData('South Carolina', 'south-carolina');
export const getSouthDakotaData = () => getStateData('South Dakota', 'south-dakota');
export const getTennesseeData = () => getStateData('Tennessee', 'tennessee');
export const getTexasData = () => getStateData('Texas', 'texas');
export const getUtahData = () => getStateData('Utah', 'utah');
export const getVermontData = () => getStateData('Vermont', 'vermont');
export const getVirginiaData = () => getStateData('Virginia', 'virginia');
export const getWashingtonData = () => getStateData('Washington', 'washington');
export const getWestVirginiaData = () => getStateData('West Virginia', 'west-virginia');
export const getWisconsinData = () => getStateData('Wisconsin', 'wisconsin');
export const getWyomingData = () => getStateData('Wyoming', 'wyoming');

// City name functions
export const getAlabamaCityNames = () => getCityNames('Alabama', 'alabama');
export const getAlaskaCityNames = () => getCityNames('Alaska', 'alaska');
export const getArizonaCityNames = () => getCityNames('Arizona', 'arizona');
export const getArkansasCityNames = () => getCityNames('Arkansas', 'arkansas');
export const getCaliforniaCityNames = () => getCityNames('California', 'california');
export const getColoradoCityNames = () => getCityNames('Colorado', 'colorado');
export const getConnecticutCityNames = () => getCityNames('Connecticut', 'connecticut');
export const getDelawareCityNames = () => getCityNames('Delaware', 'delaware');
export const getFloridaCityNames = () => getCityNames('Florida', 'florida');
export const getGeorgiaCityNames = () => getCityNames('Georgia', 'georgia');
export const getHawaiiCityNames = () => getCityNames('Hawaii', 'hawaii');
export const getIdahoCityNames = () => getCityNames('Idaho', 'idaho');
export const getIllinoisCityNames = () => getCityNames('Illinois', 'illinois');
export const getIndianaCityNames = () => getCityNames('Indiana', 'indiana');
export const getIowaCityNames = () => getCityNames('Iowa', 'iowa');
export const getKansasCityNames = () => getCityNames('Kansas', 'kansas');
export const getKentuckyCityNames = () => getCityNames('Kentucky', 'kentucky');
export const getLouisianaCityNames = () => getCityNames('Louisiana', 'louisiana');
export const getMaineCityNames = () => getCityNames('Maine', 'maine');
export const getMarylandCityNames = () => getCityNames('Maryland', 'maryland');
export const getMassachusettsCityNames = () => getCityNames('Massachusetts', 'massachusetts');
export const getMichiganCityNames = () => getCityNames('Michigan', 'michigan');
export const getMinnesotaCityNames = () => getCityNames('Minnesota', 'minnesota');
export const getMississippiCityNames = () => getCityNames('Mississippi', 'mississippi');
export const getMissouriCityNames = () => getCityNames('Missouri', 'missouri');
export const getMontanaCityNames = () => getCityNames('Montana', 'montana');
export const getNebraskaCityNames = () => getCityNames('Nebraska', 'nebraska');
export const getNevadaCityNames = () => getCityNames('Nevada', 'nevada');
export const getNewHampshireCityNames = () => getCityNames('New Hampshire', 'new-hampshire');
export const getNewJerseyCityNames = () => getCityNames('New Jersey', 'new-jersey');
export const getNewMexicoCityNames = () => getCityNames('New Mexico', 'new-mexico');
export const getNewYorkCityNames = () => getCityNames('New York', 'new-york');
export const getNorthCarolinaCityNames = () => getCityNames('North Carolina', 'north-carolina');
export const getNorthDakotaCityNames = () => getCityNames('North Dakota', 'north-dakota');
export const getOhioCityNames = () => getCityNames('Ohio', 'ohio');
export const getOklahomaCityNames = () => getCityNames('Oklahoma', 'oklahoma');
export const getOregonCityNames = () => getCityNames('Oregon', 'oregon');
export const getPennsylvaniaCityNames = () => getCityNames('Pennsylvania', 'pennsylvania');
export const getRhodeIslandCityNames = () => getCityNames('Rhode Island', 'rhode-island');
export const getSouthCarolinaCityNames = () => getCityNames('South Carolina', 'south-carolina');
export const getSouthDakotaCityNames = () => getCityNames('South Dakota', 'south-dakota');
export const getTennesseeCityNames = () => getCityNames('Tennessee', 'tennessee');
export const getTexasCityNames = () => getCityNames('Texas', 'texas');
export const getUtahCityNames = () => getCityNames('Utah', 'utah');
export const getVermontCityNames = () => getCityNames('Vermont', 'vermont');
export const getVirginiaCityNames = () => getCityNames('Virginia', 'virginia');
export const getWashingtonCityNames = () => getCityNames('Washington', 'washington');
export const getWestVirginiaCityNames = () => getCityNames('West Virginia', 'west-virginia');
export const getWisconsinCityNames = () => getCityNames('Wisconsin', 'wisconsin');
export const getWyomingCityNames = () => getCityNames('Wyoming', 'wyoming');

// County name functions
export const getAlabamaCountyNames = () => getCountyNames('Alabama', 'alabama');
export const getAlaskaCountyNames = () => getCountyNames('Alaska', 'alaska');
export const getArizonaCountyNames = () => getCountyNames('Arizona', 'arizona');
export const getArkansasCountyNames = () => getCountyNames('Arkansas', 'arkansas');
export const getCaliforniaCountyNames = () => getCountyNames('California', 'california');
export const getColoradoCountyNames = () => getCountyNames('Colorado', 'colorado');
export const getConnecticutCountyNames = () => getCountyNames('Connecticut', 'connecticut');
export const getDelawareCountyNames = () => getCountyNames('Delaware', 'delaware');
export const getFloridaCountyNames = () => getCountyNames('Florida', 'florida');
export const getGeorgiaCountyNames = () => getCountyNames('Georgia', 'georgia');
export const getHawaiiCountyNames = () => getCountyNames('Hawaii', 'hawaii');
export const getIdahoCountyNames = () => getCountyNames('Idaho', 'idaho');
export const getIllinoisCountyNames = () => getCountyNames('Illinois', 'illinois');
export const getIndianaCountyNames = () => getCountyNames('Indiana', 'indiana');
export const getIowaCountyNames = () => getCountyNames('Iowa', 'iowa');
export const getKansasCountyNames = () => getCountyNames('Kansas', 'kansas');
export const getKentuckyCountyNames = () => getCountyNames('Kentucky', 'kentucky');
export const getLouisianaCountyNames = () => getCountyNames('Louisiana', 'louisiana');
export const getMaineCountyNames = () => getCountyNames('Maine', 'maine');
export const getMarylandCountyNames = () => getCountyNames('Maryland', 'maryland');
export const getMassachusettsCountyNames = () => getCountyNames('Massachusetts', 'massachusetts');
export const getMichiganCountyNames = () => getCountyNames('Michigan', 'michigan');
export const getMinnesotaCountyNames = () => getCountyNames('Minnesota', 'minnesota');
export const getMississippiCountyNames = () => getCountyNames('Mississippi', 'mississippi');
export const getMissouriCountyNames = () => getCountyNames('Missouri', 'missouri');
export const getMontanaCountyNames = () => getCountyNames('Montana', 'montana');
export const getNebraskaCountyNames = () => getCountyNames('Nebraska', 'nebraska');
export const getNevadaCountyNames = () => getCountyNames('Nevada', 'nevada');
export const getNewHampshireCountyNames = () => getCountyNames('New Hampshire', 'new-hampshire');
export const getNewJerseyCountyNames = () => getCountyNames('New Jersey', 'new-jersey');
export const getNewMexicoCountyNames = () => getCountyNames('New Mexico', 'new-mexico');
export const getNewYorkCountyNames = () => getCountyNames('New York', 'new-york');
export const getNorthCarolinaCountyNames = () => getCountyNames('North Carolina', 'north-carolina');
export const getNorthDakotaCountyNames = () => getCountyNames('North Dakota', 'north-dakota');
export const getOhioCountyNames = () => getCountyNames('Ohio', 'ohio');
export const getOklahomaCountyNames = () => getCountyNames('Oklahoma', 'oklahoma');
export const getOregonCountyNames = () => getCountyNames('Oregon', 'oregon');
export const getPennsylvaniaCountyNames = () => getCountyNames('Pennsylvania', 'pennsylvania');
export const getRhodeIslandCountyNames = () => getCountyNames('Rhode Island', 'rhode-island');
export const getSouthCarolinaCountyNames = () => getCountyNames('South Carolina', 'south-carolina');
export const getSouthDakotaCountyNames = () => getCountyNames('South Dakota', 'south-dakota');
export const getTennesseeCountyNames = () => getCountyNames('Tennessee', 'tennessee');
export const getTexasCountyNames = () => getCountyNames('Texas', 'texas');
export const getUtahCountyNames = () => getCountyNames('Utah', 'utah');
export const getVermontCountyNames = () => getCountyNames('Vermont', 'vermont');
export const getVirginiaCountyNames = () => getCountyNames('Virginia', 'virginia');
export const getWashingtonCountyNames = () => getCountyNames('Washington', 'washington');
export const getWestVirginiaCountyNames = () => getCountyNames('West Virginia', 'west-virginia');
export const getWisconsinCountyNames = () => getCountyNames('Wisconsin', 'wisconsin');
export const getWyomingCountyNames = () => getCountyNames('Wyoming', 'wyoming');