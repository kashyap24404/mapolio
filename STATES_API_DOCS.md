# States API Documentation

This document describes the public API endpoints for accessing the nested states geographical data.

## Base URL
```
http://localhost:3001
```

## Endpoints

### 1. Get All States List
**GET** `/api/states`

Returns a list of all available states with their county counts.

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "name": "alabama",
      "counties": 67
    },
    {
      "name": "alaska", 
      "counties": 29
    }
  ],
  "total": 50,
  "message": "States list retrieved successfully"
}
```

### 2. Get Specific State Data
**GET** `/api/states/:state`

Returns complete data for a specific state including all counties, cities, and zip codes.

**Parameters:**
- `state` (string): State name in lowercase (e.g., "alabama", "california")

**Response Format:**
```json
{
  "success": true,
  "data": {
    "counties": {
      "Jefferson": {
        "cities": {
          "Birmingham": ["35201", "35202", "35203"],
          "Bessemer": ["35020", "35021"]
        }
      }
    }
  },
  "state": "alabama",
  "message": "Data for state 'alabama' retrieved successfully"
}
```

### 3. Get Complete Nested Data
**GET** `/api/states/nested`

Returns the complete nested JSON file containing all states, counties, cities, and zip codes.

**⚠️ Warning:** This endpoint returns a very large response (~5MB+). Use with caution.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "alabama": {
      "counties": { ... }
    },
    "alaska": {
      "counties": { ... }
    }
  },
  "message": "States nested data retrieved successfully"
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `404` - State not found or data file missing
- `500` - Internal server error

## Data Structure

The nested data follows this hierarchy:
```
State → Counties → Cities → Zip Codes
```

**Example Structure:**
```json
{
  "california": {
    "counties": {
      "Los Angeles": {
        "cities": {
          "Los Angeles": ["90001", "90002", "90003"],
          "Beverly Hills": ["90210", "90211"]
        }
      }
    }
  }
}
```

## Usage Examples

### JavaScript/Node.js
```javascript
// Get all states
const response = await fetch('http://localhost:3001/api/states');
const states = await response.json();

// Get California data
const caResponse = await fetch('http://localhost:3001/api/states/california');
const californiaData = await caResponse.json();
```

### cURL
```bash
# Get all states
curl http://localhost:3001/api/states

# Get specific state
curl http://localhost:3001/api/states/texas

# Get complete nested data (large response)
curl http://localhost:3001/api/states/nested
```

## Notes

1. State names must be lowercase in the URL
2. The complete nested endpoint returns a very large response - consider using state-specific endpoints for better performance
3. All responses include a `success` boolean flag for easy error handling
4. The data source is the `utils/all_states_nested.json` file