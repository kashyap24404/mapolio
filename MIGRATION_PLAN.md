# Supabase Migration Plan - Google Maps Scraper Backend

## Overview
This document outlines the complete plan for migrating from the current Supabase project to a new one, with a complete redesign of the database schema and architecture.

## Current State Analysis
- **Current Supabase files**: `config/supabase.js`, `supabase/.temp/` folder
- **Dependencies**: `@supabase/supabase-js@^2.49.1`, `@supabase/mcp-server-supabase@^0.4.5`
- **Usage locations**:
  - `services/scraperService.js` - Main scraping operations
  - `services/scraperHelpers.js` - Helper functions for scraping
  - `controllers/statusController.js` - Status management

## Phase 1: Remove Existing Supabase Code

### Files to Remove/Modify:
1. **Delete**: `config/supabase.js`
2. **Delete**: `supabase/.temp/` folder
3. **Remove imports** from:
   - `services/scraperService.js`
   - `services/scraperHelpers.js`
   - `controllers/statusController.js`
4. **Update package.json**: Remove Supabase dependencies

## Phase 2: New Supabase Architecture

### Directory Structure:
```
supabase/
├── config/
│   ├── client.js          # Main Supabase client
│   ├── admin.js           # Admin client for service operations
│   └── schema.js          # Database schema definitions
├── services/
│   ├── ScrapingService.js # Scraping operations service
│   ├── UserService.js     # User management service
│   ├── StorageService.js  # File storage operations
│   └── AnalyticsService.js # Analytics and reporting
├── repositories/
│   ├── ScrapingRepository.js # Scraping data repository
│   ├── UserRepository.js     # User data repository
│   └── ResultRepository.js   # Results data repository
├── migrations/
│   ├── 001_create_tables.sql  # Initial schema
│   └── 002_create_indexes.sql # Performance indexes
└── types/
    └── database.types.js   # TypeScript type definitions
```

## Phase 3: Database Schema Design

### Core Tables:

#### 1. users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE
);
```

#### 2. scraping_requests
```sql
CREATE TABLE scraping_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    keywords TEXT NOT NULL,
    country TEXT NOT NULL,
    states TEXT[], -- Array of state names
    fields TEXT[], -- Array of requested fields
    rating_filter NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    current_state TEXT,
    result_url TEXT,
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);
```

#### 3. scraping_results
```sql
CREATE TABLE scraping_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES scraping_requests(id) ON DELETE CASCADE,
    place_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    avg_rating NUMERIC,
    rating_count INTEGER,
    address TEXT,
    website TEXT,
    phone TEXT,
    images TEXT[], -- Array of image URLs
    category TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    plus_code TEXT,
    price_level TEXT,
    hours JSONB,
    description TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. file_storage
```sql
CREATE TABLE file_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES scraping_requests(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. analytics
```sql
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES scraping_requests(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes:
```sql
-- Performance indexes
CREATE INDEX idx_scraping_requests_user_id ON scraping_requests(user_id);
CREATE INDEX idx_scraping_requests_task_id ON scraping_requests(task_id);
CREATE INDEX idx_scraping_requests_status ON scraping_requests(status);
CREATE INDEX idx_scraping_requests_created_at ON scraping_requests(created_at DESC);

CREATE INDEX idx_scraping_results_request_id ON scraping_results(request_id);
CREATE INDEX idx_scraping_results_place_id ON scraping_results(place_id);

CREATE INDEX idx_file_storage_user_id ON file_storage(user_id);
CREATE INDEX idx_file_storage_request_id ON file_storage(request_id);

CREATE INDEX idx_analytics_user_id ON analytics(user_id);
CREATE INDEX idx_analytics_created_at ON analytics(created_at DESC);
```

## Phase 4: Service Layer Implementation

### 1. Supabase Client Configuration
- Create environment-based configuration
- Implement connection pooling
- Add error handling and retry logic

### 2. Service Classes
- **ScrapingService**: Handle scraping lifecycle
- **UserService**: User management and authentication
- **StorageService**: File upload/download operations
- **AnalyticsService**: Event tracking and reporting

### 3. Repository Pattern
- **ScrapingRepository**: CRUD operations for scraping data
- **UserRepository**: User data management
- **ResultRepository**: Results data management

## Phase 5: Migration Steps

### Step 1: Environment Setup
1. Create new Supabase project
2. Configure environment variables:
   - `NEW_SUPABASE_URL`
   - `NEW_SUPABASE_ANON_KEY`
   - `NEW_SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Database Migration
1. Run SQL migrations to create new schema
2. Set up Row Level Security (RLS) policies
3. Configure storage buckets for file uploads

### Step 3: Code Migration
1. Remove old Supabase code
2. Create new service layer
3. Update controllers to use new services
4. Implement backward compatibility layer

### Step 4: Testing
1. Unit tests for all services
2. Integration tests for database operations
3. End-to-end testing of scraping workflow
4. Performance testing with large datasets

## Phase 6: API Endpoints Update

### Updated Endpoints:
- `POST /api/scrape` - Create new scraping request
- `GET /api/status/:user_id/:task_id` - Get scraping status
- `POST /api/status/update` - Update scraping status
- `GET /api/results/:request_id` - Get scraping results
- `GET /api/downloads/:file_id` - Download result files

### New Endpoints:
- `GET /api/analytics/:user_id` - Get user analytics
- `DELETE /api/requests/:request_id` - Delete scraping request
- `GET /api/history/:user_id` - Get user scraping history

## Phase 7: Monitoring and Logging

### Monitoring Setup:
1. Database query performance monitoring
2. API endpoint response time tracking
3. Error rate monitoring
4. Storage usage tracking

### Logging Strategy:
1. Structured logging for all operations
2. Error tracking and alerting
3. Performance metrics collection
4. User activity logging

## Implementation Timeline

### Week 1: Foundation
- Remove old Supabase code
- Create new directory structure
- Set up new Supabase project
- Create database schema

### Week 2: Core Services
- Implement Supabase client configuration
- Create service layer classes
- Implement repository pattern
- Create basic CRUD operations

### Week 3: Integration
- Update controllers to use new services
- Implement file storage operations
- Add analytics tracking
- Create API endpoints

### Week 4: Testing & Deployment
- Comprehensive testing
- Performance optimization
- Deployment to production
- Monitoring setup

## Risk Mitigation

### Data Migration:
- Create backup strategy before migration
- Implement rollback plan
- Test migration scripts thoroughly
- Maintain parallel systems during transition

### Performance:
- Implement connection pooling
- Add caching layer where appropriate
- Optimize database queries
- Monitor resource usage

### Security:
- Implement proper RLS policies
- Use service role for admin operations only
- Add rate limiting to API endpoints
- Secure file upload/download operations

## Next Steps
1. Review and approve this plan
2. Set up new Supabase project
3. Begin Phase 1: Remove existing code
4. Create new directory structure
5. Implement database schema

This plan provides a comprehensive roadmap for migrating to a new Supabase project with improved architecture, better performance, and enhanced functionality.