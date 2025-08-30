import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4242';

async function testStatesAPI() {
    console.log('Testing States API Endpoints...\n');

    try {
        // Test 1: Get all states list
        console.log('1. Testing GET /api/states');
        const statesResponse = await fetch(`${BASE_URL}/api/states`);
        const statesData = await statesResponse.json();
        
        if (statesData.success) {
            console.log(`✅ States list retrieved successfully - Found ${statesData.total} states`);
            console.log(`First 3 states:`, statesData.data.slice(0, 3));
        } else {
            console.log('❌ Failed to get states list:', statesData.message);
        }

        console.log('\n---\n');

        // Test 2: Get specific state data
        console.log('2. Testing GET /api/states/alabama');
        const alabamaResponse = await fetch(`${BASE_URL}/api/states/alabama`);
        const alabamaData = await alabamaResponse.json();
        
        if (alabamaData.success) {
            console.log('✅ Alabama state data retrieved successfully');
            const counties = Object.keys(alabamaData.data.counties || {});
            console.log(`Counties in Alabama: ${counties.length}`);
            console.log(`First 3 counties:`, counties.slice(0, 3));
        } else {
            console.log('❌ Failed to get Alabama data:', alabamaData.message);
        }

        console.log('\n---\n');

        // Test 3: Get complete nested data (warning: large response)
        console.log('3. Testing GET /api/states/nested (checking response size only)');
        const nestedResponse = await fetch(`${BASE_URL}/api/states/nested`);
        
        if (nestedResponse.ok) {
            const contentLength = nestedResponse.headers.get('content-length');
            console.log('✅ Nested states data endpoint is accessible');
            console.log(`Response size: ${contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}`);
        } else {
            console.log('❌ Failed to access nested states data');
        }

        console.log('\n---\n');

        // Test 4: Test invalid state
        console.log('4. Testing GET /api/states/invalidstate');
        const invalidResponse = await fetch(`${BASE_URL}/api/states/invalidstate`);
        const invalidData = await invalidResponse.json();
        
        if (!invalidData.success && invalidResponse.status === 404) {
            console.log('✅ Invalid state correctly returns 404');
        } else {
            console.log('❌ Invalid state test failed');
        }

    } catch (error) {
        console.error('❌ Error testing API:', error.message);
        console.log('\nMake sure the server is running with: npm start');
    }
}

// Run the tests
testStatesAPI();