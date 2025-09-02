# Progress Tracking and Database Compliance Plan

## Overview
This plan outlines the correct approach for implementing progress tracking and ensuring database schema compliance in the scraping service. The key principle is to use the frontend-provided configuration as the single source of truth, particularly for the `total_selected_zip_codes` value.

## Key Principles

### 1. Frontend Configuration as Source of Truth
- The frontend sends the complete configuration in the POST request
- The `total_selected_zip_codes` value is already calculated by the frontend and provided in the config
- We should use this value directly rather than recalculating it

### 2. Database Schema Compliance
- The `scraper_task` table schema does not include a `total_selected_zip_codes` field
- All database updates must only use fields that exist in the actual database schema
- The `total_selected_zip_codes` should not be included in any database update operations

## Implementation Approach

### Progress Tracking
1. Extract `total_selected_zip_codes` from `config.total_selected_zip_codes`
2. Use this value for accurate progress calculation
3. Calculate progress as: `processed_items / total_selected_zip_codes * 100`
4. Apply appropriate weighting for different phases of the scraping process

### Database Updates
1. Remove all references to `total_selected_zip_codes` in database update operations
2. Only update fields that exist in the `scraper_task` table schema:
   - status
   - progress
   - updated_at
   - total_results
   - credits_used
   - error_message

## Progress Calculation Phases

### Phase 1: Initialization (0-15%)
- Task creation and configuration loading: 0-5%
- Location queue generation: 5-15%

### Phase 2: Link Finding (15-50%)
- Process ZIP codes using frontend-provided `total_selected_zip_codes`
- Progress calculation: `15 + (processed_locations / total_selected_zip_codes) * 35`

### Phase 3: Data Extraction (50-85%)
- Extract data from found links
- Progress calculation: `50 + (processed_links / total_found_links) * 35`

### Phase 4: Finalization (85-100%)
- Save results and complete task: 85-100%

## Performance Considerations
- No additional performance optimizations are needed as the current implementation already handles large ZIP code sets efficiently
- The frontend-provided `total_selected_zip_codes` eliminates the need for counting operations on the backend
- Memory usage is optimized by using the pre-calculated values

## Implementation Checklist
- [ ] Use `config.total_selected_zip_codes` for progress calculations
- [ ] Remove all `total_selected_zip_codes` references from database updates
- [ ] Ensure progress tracking uses the correct formula for each phase
- [ ] Validate that only schema-compliant fields are updated in the database
- [ ] Test with various ZIP code counts to ensure accurate progress reporting