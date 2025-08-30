// Simple test to verify options priority
const scrapingConfig = {
  processingOptions: {
    singleImage: true
  }
};

// Test case 1: advancedOptions provided
const advancedOptions1 = {
  singleImage: false,
  maxReviews: 20
};

// Test case 2: no advancedOptions for singleImage
const advancedOptions2 = {
  maxReviews: 15
};

// Test case 3: empty advancedOptions
const advancedOptions3 = {};

console.log('Testing options priority...');

// Simulate the merging logic
const processingOptions1 = {
  singleImage: advancedOptions1.singleImage !== undefined ? 
    advancedOptions1.singleImage : 
    scrapingConfig.processingOptions.singleImage,
  ...advancedOptions1
};

console.log('Test 1 - advancedOptions with singleImage false:');
console.log('Result:', processingOptions1);
console.log('Expected singleImage: false');
console.log('Actual singleImage:', processingOptions1.singleImage);
console.log('Match:', processingOptions1.singleImage === false ? '✓' : '✗');
console.log('');

const processingOptions2 = {
  singleImage: advancedOptions2.singleImage !== undefined ? 
    advancedOptions2.singleImage : 
    scrapingConfig.processingOptions.singleImage,
  ...advancedOptions2
};

console.log('Test 2 - advancedOptions without singleImage:');
console.log('Result:', processingOptions2);
console.log('Expected singleImage: true (fallback to config)');
console.log('Actual singleImage:', processingOptions2.singleImage);
console.log('Match:', processingOptions2.singleImage === true ? '✓' : '✗');
console.log('');

const processingOptions3 = {
  singleImage: advancedOptions3.singleImage !== undefined ? 
    advancedOptions3.singleImage : 
    scrapingConfig.processingOptions.singleImage,
  ...advancedOptions3
};

console.log('Test 3 - empty advancedOptions:');
console.log('Result:', processingOptions3);
console.log('Expected singleImage: true (fallback to config)');
console.log('Actual singleImage:', processingOptions3.singleImage);
console.log('Match:', processingOptions3.singleImage === true ? '✓' : '✗');