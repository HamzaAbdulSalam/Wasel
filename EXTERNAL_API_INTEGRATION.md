# External API Integration Configuration Guide

## Overview
The Wasel platform integrates with external APIs to provide real-world data for:
- Geolocation/Reverse Geocoding (OpenStreetMap Nominatim)
- Weather Information (OpenWeatherMap)

All external API calls include:
- Automatic caching (with configurable TTL)
- Rate limiting (request throttling)
- Timeout handling (with exponential backoff retries)
- Error recovery and graceful degradation

## Environment Variables

### OpenStreetMap / Nominatim Geolocation API
**Status:** FREE, No authentication required

```bash
# No configuration needed - Nominatim is free and doesn't require API keys
# Rate limit: 1 request per second (enforced automatically by ApiClient)
# Cache TTL: 1 hour for addresses
```

**API Details:**
- Base URL: `https://nominatim.openstreetmap.org`
- Rate Limit: 1 req/second (configured in GeolocationService)
- Cache TTL: 1 hour (configurable)
- Timeout: 8 seconds
- Retries: 2 attempts with exponential backoff

### OpenWeatherMap Weather API
**Status:** REQUIRES API Key (Free tier available)

```bash
# Get free API key from: https://openweathermap.org/api
OPENWEATHER_API_KEY=your_api_key_here

# Optional: Configure weather cache TTL (default: 600 seconds)
WEATHER_CACHE_TTL=600

# Optional: Configure weather API timeout (default: 8000 ms)
WEATHER_TIMEOUT=8000
```

**API Details:**
- Base URL: `https://api.openweathermap.org/data/2.5`
- Free Tier Rate Limit: 60 calls/minute
- Cache TTL: 10 minutes (weather changes frequently)
- Timeout: 8 seconds
- Retries: 2 attempts with exponential backoff

### Configuration Template (.env file)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wasel_db

# JWT
JWT_SECRET=your-secret-key-here

# Weather API
OPENWEATHER_API_KEY=your_openweather_api_key

# Optional API Configurations
API_CACHE_ENABLED=true
API_TIMEOUT_MS=8000
API_MAX_RETRIES=2
WEATHER_CACHE_TTL=600
GEO_CACHE_TTL=3600
```

## API Endpoints (External Data Integration)

### Geolocation / Location Services

**1. Search Locations by Address**
```
GET /routes/geolocation/search?address=Dubai%20Marina
```

Query Parameters:
- `address` (required): Location name or address (min 2 characters)

Response:
```json
{
  "success": true,
  "message": "Location search completed",
  "data": {
    "query": "Dubai Marina",
    "results": [
      {
        "latitude": 25.0775,
        "longitude": 55.1457,
        "address": "Marina Street",
        "city": "Dubai",
        "country": "United Arab Emirates",
        "displayName": "...",
        "placeType": "...",
        "importance": 0.65,
        "cached": false
      }
    ],
    "count": 1
  }
}
```

**2. Reverse Geocoding (Coordinates to Address)**
```
GET /routes/geolocation/reverse?latitude=25.2048&longitude=55.2708
```

Query Parameters:
- `latitude` (required): Latitude (-90 to 90)
- `longitude` (required): Longitude (-180 to 180)

Response:
```json
{
  "success": true,
  "message": "Location details retrieved",
  "data": {
    "latitude": 25.2048,
    "longitude": 55.2708,
    "address": "Sheikh Zayed Road",
    "city": "Dubai",
    "state": null,
    "country": "United Arab Emirates",
    "postalCode": null,
    "displayName": "...",
    "placeType": "...",
    "cached": true
  }
}
```

### Weather Data Services

**1. Current Weather at Coordinates**
```
GET /routes/weather/current?latitude=25.2048&longitude=55.2708
```

Query Parameters:
- `latitude` (required): Latitude (-90 to 90)
- `longitude` (required): Longitude (-180 to 180)

Response:
```json
{
  "success": true,
  "message": "Current weather retrieved successfully",
  "data": {
    "city": "Dubai",
    "country": "AE",
    "coordinates": {
      "latitude": 25.2048,
      "longitude": 55.2708
    },
    "weather": [
      {
        "main": "Clear",
        "description": "clear sky",
        "icon": "01d"
      }
    ],
    "main": {
      "temperature": 35.5,
      "feelsLike": 38.2,
      "tempMin": 32.1,
      "tempMax": 37.8,
      "pressure": 1013,
      "humidity": 45
    },
    "wind": {
      "speed": 5.5,
      "direction": 230,
      "gust": 8.2
    },
    "clouds": 5,
    "visibility": 10000,
    "precipitation": 0,
    "timestamp": "2026-04-20T14:30:00.000Z",
    "sunrise": "2026-04-20T05:45:00.000Z",
    "sunset": "2026-04-20T18:45:00.000Z",
    "cached": false
  }
}
```

**2. Weather Forecast (5 days, 3-hour intervals)**
```
GET /routes/weather/forecast?latitude=25.2048&longitude=55.2708
```

Query Parameters:
- `latitude` (required): Latitude (-90 to 90)
- `longitude` (required): Longitude (-180 to 180)

Response:
```json
{
  "success": true,
  "message": "Weather forecast retrieved successfully",
  "data": {
    "city": "Dubai",
    "country": "AE",
    "timezone": 14400,
    "forecast": {
      "2026-04-20": [
        {
          "timestamp": "2026-04-20T15:00:00.000Z",
          "temperature": 35.5,
          "feelsLike": 38.2,
          "description": "clear sky",
          "windSpeed": 5.5,
          "precipitation": 0,
          "humidity": 45
        }
      ]
    },
    "cached": false,
    "fetchedAt": "2026-04-20T14:30:00.000Z"
  }
}
```

**3. Weather Risk Assessment**
```
GET /routes/weather/risk-assessment?latitude=25.2048&longitude=55.2708
```

Query Parameters:
- `latitude` (required): Latitude (-90 to 90)
- `longitude` (required): Longitude (-180 to 180)

Response:
```json
{
  "success": true,
  "message": "Weather risk assessment completed",
  "data": {
    "location": {
      "latitude": 25.2048,
      "longitude": 55.2708,
      "city": "Dubai"
    },
    "riskLevel": "safe",
    "risks": {
      "wind": false,
      "rain": false,
      "snow": false,
      "fog": false,
      "thunder": false,
      "extreme": false
    },
    "conditions": ["clear sky"],
    "temperature": 35.5,
    "windSpeed": 5.5,
    "humidity": 45,
    "visibility": 10000,
    "recommendations": [
      "ℹ️ Weather conditions are favorable for travel."
    ],
    "assessedAt": "2026-04-20T14:30:00.000Z",
    "cached": false
  }
}
```

**4. Weather by City Name**
```
GET /routes/weather/city/Dubai
```

URL Parameters:
- `cityName` (required): City name (min 2 characters)

Response: Same as "Current Weather at Coordinates"

### Enhanced Route Estimation

**Estimate Route with Location Details & Weather**
```
POST /routes/estimate-enhanced
```

Request Body:
```json
{
  "startLatitude": 25.1972,
  "startLongitude": 55.2744,
  "endLatitude": 25.2048,
  "endLongitude": 55.2708,
  "roadType": "standard",
  "congestion": "normal",
  "includeHazards": true
}
```

Response:
```json
{
  "success": true,
  "message": "Enhanced route estimated successfully (with location details and weather)",
  "data": {
    "startLocation": {
      "latitude": 25.1972,
      "longitude": 55.2744,
      "address": "Business Bay",
      "city": "Dubai",
      "country": "United Arab Emirates",
      "cached": true
    },
    "endLocation": {
      "latitude": 25.2048,
      "longitude": 55.2708,
      "address": "Sheikh Zayed Road",
      "city": "Dubai",
      "country": "United Arab Emirates",
      "cached": true
    },
    "distance": {
      "km": 8.5,
      "miles": 5.3
    },
    "duration": {
      "minutes": 17,
      "hours": 0.3
    },
    "hazards": [],
    "weatherData": {
      "startPoint": {
        "weather": {...},
        "riskAssessment": {...}
      },
      "endPoint": {
        "weather": {...},
        "riskAssessment": {...}
      },
      "maxRiskLevel": "safe",
      "routeWeatherFactors": []
    },
    "metadata": {
      "roadType": "standard",
      "congestionLevel": "normal",
      "hazardCount": 0,
      "factors": [...]
    },
    "enhancedWithExternalAPIs": true,
    "estimatedAt": "2026-04-20T14:30:00.000Z"
  }
}
```

### Cache Statistics

**Get API Cache Statistics** (Authenticated users only)
```
GET /routes/api/cache-stats
```

Headers:
```
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "success": true,
  "message": "API cache statistics",
  "data": {
    "geolocation": {
      "cacheHits": 15,
      "cacheMisses": 3,
      "keys": ["reverse:25.2048:55.2708", "search:dubai"],
      "size": 2
    },
    "weather": {
      "cacheHits": 42,
      "cacheMisses": 8,
      "keys": ["weather:25.2048:55.2708", "forecast:25.2048:55.2708"],
      "size": 2
    }
  }
}
```

## Error Handling

All external API calls gracefully handle errors:

### Rate Limiting Error
```json
{
  "success": false,
  "message": "Rate limit exceeded. Max 60 requests per 60000ms"
}
```

### Network Timeout
```json
{
  "success": false,
  "message": "Failed to fetch current weather: Network timeout after 3 attempts"
}
```

### Invalid Credentials
```json
{
  "success": false,
  "message": "Failed to fetch current weather: HTTP 401: Unauthorized"
}
```

## Performance Features

### Caching Strategy
- **Geolocation Results**: Cached for 1 hour (addresses don't change frequently)
- **Weather Data**: Cached for 10 minutes (weather updates regularly)
- **Cache Keys**: Generated from request method, URL, and parameters

### Rate Limiting
- **Nominatim**: 1 request/second (enforced by ApiClient)
- **OpenWeatherMap**: 60 requests/minute (free tier)
- Automatic request throttling prevents API violations

### Retry Logic
- Up to 3 retry attempts for transient failures
- Exponential backoff (1s → 2s → 4s delays)
- Client errors (4xx) not retried

### Timeout Handling
- Default: 8 seconds per request
- Prevents hanging requests
- Configurable via environment variables

## Best Practices

1. **Always include error handling** when calling external API endpoints
2. **Use enhanced route estimation** when weather/location accuracy is important
3. **Cache results** on client side for frequently accessed data
4. **Check cache statistics** to optimize performance
5. **Monitor rate limit headers** (returned in response headers)
6. **Implement exponential backoff** for retries in client code

## Troubleshooting

### "OpenWeatherMap API key not configured"
Solution: Add `OPENWEATHER_API_KEY` to your `.env` file

### Rate limit errors
Solution: Reduce request frequency or wait before retrying

### Timeout errors
Solution: Increase `API_TIMEOUT_MS` in `.env` (default: 8000ms)

### Inaccurate weather data
Solution: Verify coordinates are precise (lat/lon with 4+ decimal places)

## Integration Status Check

Test the integration:
```bash
# Check geolocation
curl "http://localhost:3000/routes/geolocation/reverse?latitude=25.2048&longitude=55.2708"

# Check weather (requires API key)
curl "http://localhost:3000/routes/weather/current?latitude=25.2048&longitude=55.2708"

# Check enhanced routes
curl -X POST http://localhost:3000/routes/estimate-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "startLatitude": 25.1972,
    "startLongitude": 55.2744,
    "endLatitude": 25.2048,
    "endLongitude": 55.2708
  }'
```

---
**Last Updated**: April 2026
**API Version**: 1.0
