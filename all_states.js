// This script will combine all individual state JSON files into a single JSON file
// with a nested structure: states -> counties -> cities -> zip codes.

const fs = require('fs');
const path = require('path');

const statesDir = path.join(__dirname, 'utils', 'states');
const allStatesFile = path.join(__dirname, 'utils', 'all_states.json');

async function combineStates() {
  const allStatesData = {};

  // 1. Identify State Files
  const stateFiles = fs.readdirSync(statesDir)
    .filter(file => file.endsWith('.json') && !file.includes('all_states.json'));

  // 2. Process Each State File
  for (const stateFile of stateFiles) {
    const stateName = path.basename(stateFile, '.json');
    allStatesData[stateName] = {};

    const stateFilePath = path.join(statesDir, stateFile);
    const cities = JSON.parse(fs.readFileSync(stateFilePath, 'utf-8'));

    // Assuming each city has a county folder with the same name as the state
    const countyDir = path.join(statesDir, stateName, 'counties');

    for (const city of cities) {
      const cityName = city.replace(/ /g, '-'); // Replace spaces with dashes for filename
      const cityFilePath = path.join(countyDir, `${cityName}.json`);
      let zipCodes = [];

      try {
        zipCodes = JSON.parse(fs.readFileSync(cityFilePath, 'utf-8'));
      } catch (error) {
        // City file doesn't exist, use an empty array for zip codes
        console.log(`City file not found: ${cityFilePath}`);
      }

      const countyName = stateName; // Assign the state name as county name since we don't have county info
      if (!allStatesData[stateName][countyName]) {
        allStatesData[stateName][countyName] = {};
      }
      allStatesData[stateName][countyName][city] = zipCodes;
    }
  }

  // 3. Create the Final JSON File
  fs.writeFileSync(allStatesFile, JSON.stringify(allStatesData, null, 2));

  console.log('Combined states data written to utils/all_states.json');
}

combineStates();