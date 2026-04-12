# Route Estimation & Mobility Intelligence

## Overview

This feature provides API endpoints that estimate routes between two locations, considering road types, traffic congestion, and hazards on the route. The system uses heuristic algorithms for estimation as exact accuracy is not required.

## Key Features

### 1. Basic Route Estimation

- **Estimated Distance**: Calculated using the Haversine formula (air distance converted to road distance)
- **Estimated Duration**: Based on road type and traffic congestion levels
- **Hazard Detection**: Identifies active incidents near the route
- **Explanatory Metadata**: Provides factors affecting the route estimation

### 2. Constrained Route Estimation

- **Avoid Checkpoints**: Warns about checkpoints on or near the route
- **Avoid Specific Areas**: Supports avoiding named areas by name
- **Constraint Impact**: Shows additional distance/duration when constraints are applied
- **Warnings**: Lists specific checkpoints and areas to avoid

### 3. Road Types Supported

- `highway`: Estimated speed 100 km/h
- `major_road`: Estimated speed 60 km/h
- `standard`: Estimated speed 40 km/h (default)
- `urban`: Estimated speed 30 km/h
- `residential`: Estimated speed 20 km/h

### 4. Congestion Levels

- `light`: 1.0x multiplier
- `normal`: 1.2x multiplier (default)
- `moderate`: 1.5x multiplier
- `heavy`: 2.0x multiplier
- `severe`: 2.5x multiplier

## API Endpoints

### POST /routes/estimate

Estimates a basic route between two locations.

**Request:**

```json
{
  "startLatitude": 24.7136,
  "startLongitude": 46.6753,
  "endLatitude": 24.8248,
  "endLongitude": 46.8859,
  "roadType": "standard",
  "congestion": "normal",
  "includeHazards": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Route estimated successfully",
  "data": {
    "startLocation": {
      "latitude": 24.7136,
      "longitude": 46.6753
    },
    "endLocation": {
      "latitude": 24.8248,
      "longitude": 46.8859
    },
    "distance": {
      "km": 18.5,
      "miles": 11.49
    },
    "duration": {
      "minutes": 27,
      "hours": 0.45
    },
    "hazards": [
      {
        "id": 1,
        "title": "Traffic Jam on King Fahd Road",
        "type": "delay",
        "severity": "high",
        "latitude": "24.7856",
        "longitude": "46.7234"
      }
    ],
    "metadata": {
      "roadType": "standard",
      "congestionLevel": "normal",
      "hazardCount": 1,
      "factors": [
        "Estimated on standard roads",
        "Congestion level: normal",
        "1 potential hazards on route"
      ]
    },
    "estimatedAt": "2026-04-11T12:30:00.000Z"
  }
}
```

### POST /routes/estimate-with-constraints

Estimates a route while avoiding specific checkpoints or areas.

**Request:**

```json
{
  "startLatitude": 24.7136,
  "startLongitude": 46.6753,
  "endLatitude": 24.8248,
  "endLongitude": 46.8859,
  "roadType": "standard",
  "congestion": "normal",
  "avoidCheckpoints": true,
  "avoidAreas": [
    {
      "name": "Downtown Riyadh",
      "latitude": 24.7433,
      "longitude": 46.6793
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Route with constraints estimated successfully",
  "data": {
    "startLocation": { ... },
    "endLocation": { ... },
    "distance": { "km": 18.5, "miles": 11.49 },
    "duration": { "minutes": 27, "hours": 0.45 },
    "distanceWithConstraints": { "km": 22.2, "miles": 13.79 },
    "durationWithConstraints": { "minutes": 32, "hours": 0.54 },
    "hazards": [ ... ],
    "checkpointWarnings": [
      {
        "id": 1,
        "title": "Security Checkpoint",
        "type": "checkpoint",
        "message": "Route may pass through checkpoint: Security Checkpoint"
      }
    ],
    "restrictedAreaWarnings": [
      {
        "area": "Downtown Riyadh",
        "impact": "Route avoids Downtown Riyadh"
      }
    ],
    "constraintImpact": {
      "appliedConstraints": {
        "avoidCheckpoints": true,
        "avoidAreas": ["Downtown Riyadh"]
      },
      "additionalDistance": 3.7,
      "additionalDuration": 5
    },
    "metadata": {
      "roadType": "standard",
      "congestionLevel": "normal",
      "hazardCount": 1,
      "factors": [ ... ],
      "constraints": {
        "avoidingCheckpoints": true,
        "avoidingAreas": ["Downtown Riyadh"],
        "checkpointWarnings": 1,
        "restrictedAreaWarnings": 1
      }
    },
    "estimatedAt": "2026-04-11T12:30:00.000Z"
  }
}
```

### GET /routes/hazards

Gets all hazards (active incidents) in a specific area radius.

**Request:**

```
GET /routes/hazards?latitude=24.7136&longitude=46.6753&radius=5
```

**Response:**

```json
{
  "success": true,
  "message": "Area hazards retrieved successfully",
  "data": {
    "hazards": [
      {
        "id": 1,
        "title": "Accident on King Fahd Road",
        "description": "Multi-car collision",
        "type": "accident",
        "severity": "high",
        "latitude": "24.7856",
        "longitude": "46.7234",
        "city": "Riyadh",
        "createdAt": "2026-04-11T10:00:00.000Z"
      }
    ],
    "count": 1,
    "center": {
      "latitude": 24.7136,
      "longitude": 46.6753
    },
    "radius": 5,
    "unit": "km"
  }
}
```

### POST /routes/calculate-distance

Utility endpoint to calculate straight-line distance between two coordinates.

**Request:**

```json
{
  "startLatitude": 24.7136,
  "startLongitude": 46.6753,
  "endLatitude": 24.8248,
  "endLongitude": 46.8859
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "distance": {
      "km": 18.5,
      "miles": 11.49
    }
  }
}
```

## Implementation Details

### Distance Calculation

Uses the Haversine formula to calculate the great-circle distance between two points on Earth. This provides a heuristic estimation that's accurate for route planning purposes.

### Duration Estimation

Duration is calculated based on:

1. **Base Speed**: Determined by road type
2. **Congestion Multiplier**: Applied to base speed
3. **Final Duration**: distance / effective_speed

### Constraint Handling

- **Avoiding Checkpoints**: Adds 20% to distance and duration estimates
- **Avoiding Areas**: Adds 15% per area to estimates
- Returns warnings for each checkpoint/area that affects the route

### Hazard Detection

Pulls from the existing `RoadIncident` table where `status = 'active'` to provide real-time hazard information.

## Integration with Existing Systems

The feature integrates seamlessly with:

- **Road Incidents**: Uses active incidents as hazards
- **User Data**: Can be extended to track user preferences
- **Authentication**: Endpoints can be protected if needed
- **Reporting System**: Works with existing report/incident data

## Future Enhancements

Possible improvements for future versions:

- Historical traffic pattern analysis
- Machine learning-based duration prediction
- Integration with real weather data
- User-specific route preferences
- Route caching for performance
- Alternative route suggestions
- Turn-by-turn directions with waypoints
- Real-time traffic updates from users
