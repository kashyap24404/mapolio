// testdirect.js
// Standalone test script to process links from a CSV and run processData

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { processData } from './services/MainDataPro.js';

// Path to the links CSV file
const linksFilePath = path.join(process.cwd(), 'public', 'links_5b26768e-f086-47a9-b4a8-2de1f059e9a4_0e0956d6-4101-483a-a64b-4c13e29002f7_Hot_Springs_in_us.csv');

// Read and parse the CSV file
const fileContent = fs.readFileSync(linksFilePath, 'utf8');
const records = parse(fileContent, { columns: true });
const uniqueGoogleSearchLinks = records.map(row => row.href).filter(Boolean);

// Define the fields you want to extract (customize as needed)
const listFields = [
  'title',
  'avg_rating',
  'rating_count',
  'address',
  'website',
  'phone',
  'category',
  'wheelchair',
  'workhours',
  'images',
  'reviews'
];

(async () => {
  try {
    console.log('Processing', uniqueGoogleSearchLinks.length, 'links...');
    const processedResults = await processData(uniqueGoogleSearchLinks, listFields);
    
    // Write results to files
    if (processedResults && processedResults.length > 0) {
      // Proceed to CSV and JSON output only.
      const outputFilePath = path.join(process.cwd(), 'public', 'output.csv');
      const createObjectCsvWriter = (await import('csv-writer')).createObjectCsvWriter;
      
      // Headers
      const headers = Object.keys(processedResults[0].data || {}).map(key => ({ id: key, title: key }));
      headers.push({ id: 'errors', title: 'errors' });
      
      // Prepare CSV records
      const csvRecords = processedResults.map(res => {
        const record = {};
        for (const key in res.data) {
          if (key === 'reviews') {
            // For CSV, replace newlines with a visible marker
            const reviews = res.data[key] || '';
            record[key] = reviews.replace(/\r?\n/g, '⏎ ');
          } else {
            record[key] = res.data[key];
          }
        }
        record.errors = JSON.stringify(res.errors || {});
        return record;
      });
      
      try {
        const csvWriter = createObjectCsvWriter({
          path: outputFilePath,
          header: headers,
          fieldDelimiter: ',',
          alwaysQuote: true,
        });
        await csvWriter.writeRecords(csvRecords);
        console.log('CSV results written to', outputFilePath);
      } catch (csvError) {
        console.error('Error creating CSV file:', csvError);
      }

      // JSON output (unchanged)
      try {
        const jsonOutputPath = path.join(process.cwd(), 'public', 'test_results.json');
        
        // Create a deep copy of the results to modify
        const structuredResults = JSON.parse(JSON.stringify(processedResults));
        
        // Process each result to structure reviews as an array
        structuredResults.forEach(result => {
          if (result.data && result.data.reviews) {
            const rawReviews = result.data.reviews;
            const reviewsArray = [];
            
            // Parse reviews using the same logic as before
            let reviewTexts = [];
            try {
              if (rawReviews.includes('-----------------------')) {
                reviewTexts = rawReviews
                  .split('-----------------------')
                  .map(r => r.trim())
                  .filter(r => r.length > 0);
              } else if (rawReviews.startsWith('{') && rawReviews.endsWith('}')) {
                const content = rawReviews.substring(1, rawReviews.length - 1);
                reviewTexts = [content];
              } else {
                reviewTexts = rawReviews.split(/\n\s*\n/).filter(r => r.trim().length > 0);
                if (reviewTexts.length === 0) {
                  reviewTexts = [rawReviews];
                }
              }
            } catch (e) {
              reviewTexts = [rawReviews];
            }
            
            // Parse each review text into structured objects
            reviewTexts.forEach(reviewText => {
              const reviewObj = {
                reviewer: "Unknown",
                rating: "N/A",
                date: "",
                content: ""
              };
              
              // Extract reviewer name
              const reviewerMatch = reviewText.match(/Reviewer:\s*([^\n]+)/);
              if (reviewerMatch) reviewObj.reviewer = reviewerMatch[1].trim();
              
              // Extract rating
              const ratingMatch = reviewText.match(/Rating:\s*([^\n]+)/);
              if (ratingMatch) reviewObj.rating = ratingMatch[1].trim();
              
              // Extract date
              const dateMatch = reviewText.match(/(a\s+(?:month|year|day|week)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|(?:\d{1,2}\s+)?(?:month|year|day|week)s?\s+ago)/i);
              if (dateMatch) reviewObj.date = dateMatch[1].trim();
              
              // Extract content
              const contentMatch = reviewText.match(/Review:\s*([^\n].*)/s);
              if (contentMatch) reviewObj.content = contentMatch[1].trim();
              
              reviewsArray.push(reviewObj);
            });
            
            // Replace the reviews string with the structured array
            result.data.reviews = reviewsArray;
          }
        });
        
        // Write the structured JSON
        fs.writeFileSync(jsonOutputPath, JSON.stringify(structuredResults, null, 2), 'utf8');
        console.log('JSON backup with structured reviews written to', jsonOutputPath);
      } catch (jsonError) {
        console.error('Error creating JSON file:', jsonError);
      }
    } else {
      console.log('No results to write to files.');
    }
  } catch (err) {
    console.error('Error running processData:', err);
  }
})();
