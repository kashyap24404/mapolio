const fs = require('fs');
const path = require('path');

const statesDir = path.join(__dirname, 'states');
const outputFile = path.join(__dirname, 'all_states.json');

const combinedData = {};

fs.readdir(statesDir, (err, files) => {
    if (err) {
        console.error('Error reading states directory:', err);
        return;
    }

    const jsonFiles = files.filter(file => path.extname(file) === '.json');

    jsonFiles.forEach(file => {
        const stateName = path.basename(file, '.json');
        const filePath = path.join(statesDir, file);
        
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            combinedData[stateName] = jsonData;
        } catch (error) {
            console.error(`Error processing file ${file}:`, error);
        }
    });

    try {
        fs.writeFileSync(outputFile, JSON.stringify(combinedData, null, 2));
        console.log(`Successfully created ${outputFile}`);
    } catch (error) {
        console.error('Error writing combined JSON file:', error);
    }
});