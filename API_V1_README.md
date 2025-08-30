# API v1 - New Scraping Task System

## Overview
The new API system provides secure, asynchronous job processing for web scraping tasks.

## API Endpoints

### Create Task
**POST** `/api/v1/tasks`

Creates a new scraping task and queues it for processing.

**Headers:**
- `Authorization: Bearer <jwt_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "search_query": "restaurants",
  "location_rules": {
    "base": [{ "type": "country", "name": "US" }],
    "exclude": [
      { "type": "state", "name": "California" },
      { "type": "zip", "zip_code": "12345" }
    ]
  },
  "data_fields": ["name", "address", "phone"],
  "rating_filter": "4",
  "advanced_options": {
    "extract_single_image": true,
    "max_reviews": 50
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Task created successfully and queued for processing",
  "task": {
    "id": "uuid",
    "status": "pending",
    "created_at": "timestamp",
    "estimated_credits": 25
  }
}
```

### Get Task Status
**GET** `/api/v1/tasks/:taskId`

Returns the current status and details of a specific task.

### Get User Tasks
**GET** `/api/v1/tasks`

Returns all tasks for the authenticated user with optional filtering.

## Running the System

1. **Start API Server:**
   ```bash
   npm start
   ```

2. **Start Worker Listener:**
   ```bash
   npm run worker
   ```

## Development Mode

```bash
npm run dev        # API server with nodemon
npm run dev:worker # Worker listener with nodemon
```