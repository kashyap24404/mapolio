import { processSingleLink } from './ProcessSingle.js';
import { extractLatitude, extractLongitude } from './fieldExtractors.js';
import scrapingConfig from '../config/scrapingConfig.js';

class MainDataPro {
    constructor() {
        this.processedCoordinates = new Set();
        this.skippedLinks = [];
        this.processedCount = 0;
    }

 async processData(link, listFields, context, advancedOptions = {}) {
        this.processedCount++;
        
        // Log progress every 20 links
        if (this.processedCount % 20 === 0) {
            console.log(`MainDataPro: Processed ${this.processedCount} links so far`);
        }
        
        const lat = await extractLatitude({ url: () => link });
        const lon = await extractLongitude({ url: () => link });
        console.log(`Extracted coordinates for ${link}: lat=${lat}, lon=${lon}`);

        if (lat && lon) {
            const coordKey = `${lat},${lon}`;
            if (this.processedCoordinates.has(coordKey)) {
                console.log(`Duplicate location found based on coordinates: ${coordKey}. Skipping.`);
                this.skippedLinks.push({ link, lat, lon });
                return { data: {}, errors: {}, status: 'skipped' };
            }
            this.processedCoordinates.add(coordKey);
        } else {
            console.log(`Could not extract coordinates for ${link}. Proceeding without duplicate check.`);
        }

        let retries = 3;
        while (retries > 0) {
            try {
                // Merge default options with advanced options
                // Prioritize advancedOptions, fallback to scrapingConfig defaults
                const processingOptions = {
                    singleImage: advancedOptions.extract_single_image !== undefined ? 
                        advancedOptions.extract_single_image : 
                        scrapingConfig.processingOptions.singleImage,
                    maxReviews: advancedOptions.max_reviews !== undefined ? 
                        advancedOptions.max_reviews : 
                        scrapingConfig.reviewExtraction.maxReviews,
                    ...advancedOptions
                };
                
                const result = await processSingleLink(link, listFields, context, processingOptions);
                return result;
            } catch (err) {
                retries--;
                if (retries === 0) {
                    console.error(`Failed to process link ${link} after 3 attempts:`, err);
                    return { data: {}, errors: { critical: `Failed to process link after 3 attempts: ${err.message}` } };
                }
                console.warn(`Retrying link ${link} (${retries} attempts remaining)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    getSkippedLinks() {
        return this.skippedLinks;
    }
}

export { MainDataPro };