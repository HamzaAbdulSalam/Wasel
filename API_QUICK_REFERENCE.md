# Wasel API - Quick Reference Guide

## Base URL

```
Development: http://localhost:3000
Staging: http://api.wasel.local:3000
Production: https://api.wasel.ps
```

## Authentication

```
Type: Bearer Token (JWT)
Header: Authorization: Bearer {token}
Expiry: 60 minutes
```

---

## Authentication Endpoints

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe"
}
```

**Response**: 201 - User object + no token

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response**: 200 - User object + JWT token

### Get Profile

```http
GET /auth/profile
Authorization: Bearer {token}
```

**Response**: 200 - User object

---

## Incident Endpoints

### Create Incident ⭐

```http
POST /incidents
Authorization: Bearer {token}

{
  "title": "Road accident",
  "type": "accident",
  "severity": "high",
  "latitude": 31.9454,
  "longitude": 35.2075,
  "city": "Ramallah",
  "description": "Two vehicle collision"
}
```

**Required**: title, type, latitude, longitude, city

### List All Incidents

```http
GET /incidents?city=Ramallah&status=active&page=1&limit=10
```

**Query Params**: city, type, severity, status, page, limit, sortBy, sortOrder

### Get by City

```http
GET /incidents/city/{city}?page=1&limit=10
```

### Get Nearby

```http
GET /incidents/nearby/{latitude}/{longitude}?radius=10
```

### Get by ID

```http
GET /incidents/{id}
```

### Update Incident ⭐

```http
PATCH /incidents/{id}
Authorization: Bearer {token}

{
  "severity": "critical",
  "description": "Updated description"
}
```

### Update Status (Admin/Moderator)

```http
PATCH /incidents/{id}/status
Authorization: Bearer {token}

{
  "status": "verified",
  "reason": "Patrol confirmed"
}
```

**Status Values**: verified, rejected, resolved

---

## Alert Endpoints

### Create Subscription ⭐

```http
POST /alerts/subscriptions
Authorization: Bearer {token}

{
  "incidentTypes": ["accident", "congestion"],
  "cities": ["Ramallah", "Bethlehem"],
  "radiusKm": 10
}
```

### List Subscriptions

```http
GET /alerts/subscriptions?page=1&limit=10
Authorization: Bearer {token}
```

### Update Subscription

```http
PUT /alerts/subscriptions/{id}
Authorization: Bearer {token}

{
  "incidentTypes": ["accident"],
  "cities": ["Ramallah"],
  "radiusKm": 15
}
```

### Delete Subscription

```http
DELETE /alerts/subscriptions/{id}
Authorization: Bearer {token}
```

---

## Route Endpoints

### Estimate Route

```http
POST /routes/estimate

{
  "startLatitude": 31.9454,
  "startLongitude": 35.2075,
  "endLatitude": 31.9400,
  "endLongitude": 35.2100,
  "roadType": "highway",
  "congestion": "medium",
  "includeHazards": true
}
```

**Required**: startLat, startLng, endLat, endLng
**Returns**: estimatedTime, estimatedDistance, hazards array

---

## Update Endpoints

### Create Update ⭐

```http
POST /updates
Authorization: Bearer {token}

{
  "incidentId": 1,
  "content": "Traffic has been cleared"
}
```

### Get All Updates

```http
GET /updates
```

### Get by City

```http
GET /updates/city/{city}
```

### Get by ID

```http
GET /updates/{id}
```

### Update Status

```http
PATCH /updates/{id}/status
Authorization: Bearer {token}

{
  "status": "resolved"
}
```

---

## Report Endpoints

### Get Statistics

```http
GET /reports/stats/report?city=Ramallah
```

### Get Duplicate Groups (Admin/Moderator)

```http
GET /reports/admin/duplicates/groups?city=Ramallah
Authorization: Bearer {admin_token}
```

### Get Pending Moderations (Admin/Moderator)

```http
GET /reports/admin/pending/moderations?page=1&limit=10
Authorization: Bearer {admin_token}
```

### Bulk Moderate Reports (Admin/Moderator) ⭐

```http
POST /reports/admin/bulk-moderate
Authorization: Bearer {admin_token}

{
  "reportIds": [1, 2, 3],
  "action": "approve",
  "reason": "Verified",
  "notes": "All clear"
}
```

**Action Values**: approve, reject

---

## HTTP Status Codes

| Code | Meaning                       |
| ---- | ----------------------------- |
| 200  | Success (GET/PATCH)           |
| 201  | Created (POST)                |
| 400  | Bad Request                   |
| 401  | Unauthorized (missing token)  |
| 403  | Forbidden (insufficient role) |
| 404  | Not Found                     |
| 500  | Server Error                  |
| 501  | Service Unavailable           |

---

## Incident Types

- `accident`
- `congestion`
- `hazard`
- `checkpoint`
- `weather`

## Severity Levels

- `low`
- `medium`
- `high`
- `critical`

## Status Values

- `active` (incidents)
- `resolved` (incidents)
- `archived` (incidents)
- `verified` (status update)
- `rejected` (status update)

---

## Common Request Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {jwt_token}
X-API-Version: 1.0
```

## Response Format

### Success

```json
{
  "message": "Success",
  "data": { ... },
  "success": true
}
```

### Error

```json
{
  "message": "Error description",
  "success": false,
  "details": "Additional details"
}
```

---

## Pagination

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

---

## Variables for Testing

```
{{base_url}} - Current environment URL
{{token}} - JWT token from login
{{incident_id}} - ID from create incident
{{subscription_id}} - ID from create subscription
{{update_id}} - ID from create update
```

---

## Common Locations

```json
{
  "ramallah": { "lat": 31.9454, "lng": 35.2075 },
  "bethlehem": { "lat": 31.7075, "lng": 35.2007 },
  "jerusalem": { "lat": 31.7683, "lng": 35.2137 }
}
```

---

## Test Data

### Admin User

```json
{
  "email": "admin@example.com",
  "password": "AdminPassword123!",
  "role": "admin"
}
```

### Moderator User

```json
{
  "email": "moderator@example.com",
  "password": "ModeratorPassword123!",
  "role": "moderator"
}
```

### Regular User

```json
{
  "email": "user@example.com",
  "password": "UserPassword123!",
  "role": "user"
}
```

---

## Quick Test Flow

1. **Register** → POST /auth/register → Save user
2. **Login** → POST /auth/login → Save token
3. **Get Profile** → GET /auth/profile → Verify user
4. **Create Incident** → POST /incidents → Save incident_id
5. **Get Incident** → GET /incidents/{incident_id}
6. **Create Subscription** → POST /alerts/subscriptions → Save subscription_id
7. **List Subscriptions** → GET /alerts/subscriptions
8. **Create Update** → POST /updates → Save update_id
9. **Estimate Route** → POST /routes/estimate
10. **Get Stats** → GET /reports/stats/report

---

## Files Reference

- **openapi.yaml** - Full OpenAPI spec
- **apidog-collection.json** - Ready to import
- **environments.json** - Configs for dev/staging/prod
- **API_DOCUMENTATION.md** - Complete reference
- **APIDOG_SETUP.md** - Setup instructions
- **TEST_EXECUTION_RESULTS.md** - Test cases & scenarios
- **API_QUICK_REFERENCE.md** - This file

---

## Links

- 📖 Full Documentation: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- 🚀 Setup Guide: [APIDOG_SETUP.md](APIDOG_SETUP.md)
- 🧪 Test Results: [TEST_EXECUTION_RESULTS.md](TEST_EXECUTION_RESULTS.md)
- 📝 OpenAPI Spec: [openapi.yaml](openapi.yaml)

---

**Last Updated**: January 15, 2024
**Version**: 1.0.0
