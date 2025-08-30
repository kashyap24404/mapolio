// Test script to verify advancedOptions functionality
import { MainDataPro } from '../services/MainDataPro.js';

// Mock context and link for testing
const mockContext = {
  newPage: async () => {
    return {
      goto: async () => {},
      waitForSelector: async () => {},
      url: () => 'https://www.google.com/maps/place/Test+Business',
      close: async () => {}
    };
  }
};

const testLink = 'https://www.google.com/maps/place/Test+Business';

// Test with advanced options
async function testAdvancedOptions() {
  console.log('Testing advancedOptions functionality...');
  
  const mainDataPro = new MainDataPro();
  
  // Test with conditional scraping enabled
  const advancedOptions = {
    singleImage: false,
    conditionalScraping: {
      enabled: true,
      keyField: 'category',
      targetValue: ['restaurant', 'cafe'],
      heavyFields: ['reviews', 'images'],
      skipmissmatch: false
    },
    maxReviews: 20
  };
  
  try {
    console.log('Testing processData with advancedOptions...');
    const result = await mainDataPro.processData(
      testLink,
      ['title', 'category', 'reviews', 'images'],
      mockContext,
      advancedOptions
    );
    
    console.log('Test completed successfully.');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testAdvancedOptions().then(() => {
  console.log('Test finished.');
}).catch((error) => {
  console.error('Test encountered an error:', error);
});