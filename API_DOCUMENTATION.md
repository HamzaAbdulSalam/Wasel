# Wasel API Documentation & Testing Guide

## Overview

**Project**: Wasel - Smart Mobility & Checkpoint Intelligence Platform
**Version**: 1.0.0
**API Documentation Tool**: APIdog (with OpenAPI 3.0 & Postman support)

This document provides comprehensive API documentation, authentication flows, request/response schemas, and error handling guidelines for the Wasel platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Request & Response Schemas](#request--response-schemas)
5. [Error Handling](#error-handling)
6. [Environment Configurations](#environment-configurations)
7. [Testing Guide](#testing-guide)
8. [APIdog Integration](#apidog-integration)

---

## Getting Started

### Prerequisites

- Node.js v14+
- Express.js v5.0+
- PostgreSQL (for database)
- APIdog Desktop Application or Web Interface
- Postman (optional alternative)

### Base URLs

| Environment | Base URL                      |
| ----------- | ----------------------------- |
| Development | `http://localhost:3000`       |
| Staging     | `http://api.wasel.local:3000` |
| Production  | `https://api.wasel.ps`        |

### API Documentation Files

- **OpenAPI Specification**: `openapi.yaml` - Use this for APIdog import
- **Postman Collection**: `apidog-collection.json` - Use this for APIdog or Postman
- **Environments**: `environments.json` - Contains all environment configurations

---

## Authentication

### JWT Token-Based Authentication

Wasel uses JWT (JSON Web Tokens) for API authentication.

#### Authentication Flow

1. **User Registers** → `/auth/register` (POST)
2. **User Logs In** → `/auth/login` (POST)
3. **Server returns JWT Token**
4. **Client sends token in Authorization header** → `Authorization: Bearer {token}`
5. **Server validates token** for each protected endpoint

#### Token Structure

```
Header.Payload.Signature
```

**Payload contains:**

- `id`: User ID
- `email`: User email
- `role`: User role (user, moderator, admin)
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp

#### Token Expiry

- **Default expiry**: 60 minutes
- **Refresh mechanism**: Not yet implemented (planned for v2.0)

#### Authorization Levels

| Role        | Permissions                                               |
| ----------- | --------------------------------------------------------- |
| `user`      | Create incidents, subscribe to alerts, create updates     |
| `moderator` | All user permissions + manage reports, moderate incidents |
| `admin`     | All permissions + system management, bulk operations      |

---

## API Endpoints

### 1. Authentication Endpoints

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (201 Created):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Login User

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get User Profile

```http
GET /auth/profile
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Incidents Endpoints

#### Create Incident

```http
POST /incidents
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Road accident",
  "description": "Two vehicle collision on Main Street",
  "type": "accident",
  "severity": "high",
  "latitude": 31.9454,
  "longitude": 35.2075,
  "city": "Ramallah"
}
```

**Required Fields:**

- `title` (string)
- `type` (enum: accident, congestion, hazard, checkpoint, weather)
- `latitude` (number)
- `longitude` (number)
- `city` (string)

**Response (201 Created):**

```json
{
  "message": "Incident created successfully",
  "data": {
    "id": 1,
    "title": "Road accident",
    "description": "Two vehicle collision on Main Street",
    "type": "accident",
    "severity": "high",
    "status": "active",
    "latitude": 31.9454,
    "longitude": 35.2075,
    "city": "Ramallah",
    "createdBy": 1,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get All Incidents

```http
GET /incidents?city=Ramallah&status=active&page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

**Query Parameters:**

- `city` (optional, string)
- `type` (optional, enum)
- `severity` (optional, enum)
- `status` (optional, default: "active")
- `page` (optional, default: 1)
- `limit` (optional, default: 10)
- `sortBy` (optional, default: "createdAt")
- `sortOrder` (optional, enum: asc|desc, default: desc)

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Road accident",
      "type": "accident",
      "severity": "high",
      "status": "active",
      "latitude": 31.9454,
      "longitude": 35.2075,
      "city": "Ramallah",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

#### Get Incidents by City

```http
GET /incidents/city/{city}?page=1&limit=10
```

**Path Parameters:**

- `city` (string, required)

**Response (200 OK):** Same as Get All Incidents

#### Get Nearby Incidents

```http
GET /incidents/nearby/{latitude}/{longitude}?radius=10&page=1&limit=10
```

**Path Parameters:**

- `latitude` (number, required)
- `longitude` (number, required)

**Query Parameters:**

- `radius` (optional, default: 10, in kilometers)
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

**Response (200 OK):** Same as Get All Incidents

#### Get Incident by ID

```http
GET /incidents/{id}
```

**Path Parameters:**

- `id` (integer, required)

**Response (200 OK):**

```json
{
  "data": {
    "id": 1,
    "title": "Road accident",
    "description": "Two vehicle collision on Main Street",
    "type": "accident",
    "severity": "high",
    "status": "active",
    "latitude": 31.9454,
    "longitude": 35.2075,
    "city": "Ramallah",
    "createdBy": 1,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Update Incident

```http
PATCH /incidents/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description",
  "severity": "critical",
  "latitude": 31.9454,
  "longitude": 35.2075
}
```

**Editable Fields:**

- `title` (string)
- `description` (string)
- `severity` (enum)
- `latitude` (number)
- `longitude` (number)

**Response (200 OK):** Same as Get Incident by ID

#### Update Incident Status

```http
PATCH /incidents/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "verified",
  "reason": "Verified by patrol units on scene"
}
```

**Required Fields:**

- `status` (enum: verified, rejected, resolved)

**Note:** Admin/Moderator only

**Response (200 OK):** Same as Get Incident by ID

---

### 3. Alerts Endpoints

#### Create Alert Subscription

```http
POST /alerts/subscriptions
Authorization: Bearer {token}
Content-Type: application/json

{
  "incidentTypes": ["accident", "congestion"],
  "cities": ["Ramallah", "Bethlehem"],
  "radiusKm": 10
}
```

**Response (201 Created):**

```json
{
  "message": "Alert subscription created successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "incidentTypes": ["accident", "congestion"],
    "cities": ["Ramallah", "Bethlehem"],
    "radiusKm": 10,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get User Subscriptions

```http
GET /alerts/subscriptions?page=1&limit=10
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "message": "Subscriptions retrieved successfully",
  "data": {
    "data": [
      {
        "id": 1,
        "userId": 1,
        "incidentTypes": ["accident", "congestion"],
        "cities": ["Ramallah", "Bethlehem"],
        "radiusKm": 10,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

#### Update Subscription

```http
PUT /alerts/subscriptions/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "incidentTypes": ["accident"],
  "cities": ["Ramallah"],
  "radiusKm": 15
}
```

**Response (200 OK):** Same as Create Subscription

#### Delete Subscription

```http
DELETE /alerts/subscriptions/{id}
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "message": "Subscription deleted successfully"
}
```

---

### 4. Routes Endpoints

#### Estimate Route

```http
POST /routes/estimate
Content-Type: application/json

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

**Required Fields:**

- `startLatitude` (number)
- `startLongitude` (number)
- `endLatitude` (number)
- `endLongitude` (number)

**Optional Fields:**

- `roadType` (string)
- `congestion` (enum: low, medium, high)
- `includeHazards` (boolean)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Route estimated successfully",
  "data": {
    "estimatedTime": 45,
    "estimatedDistance": 25.5,
    "routeType": "fastest",
    "hazardCount": 3,
    "hazards": [
      {
        "id": 1,
        "title": "Road accident",
        "type": "accident",
        "severity": "high",
        "latitude": 31.9454,
        "longitude": 35.2075,
        "city": "Ramallah"
      }
    ]
  }
}
```

---

### 5. Updates Endpoints

#### Create Update

```http
POST /updates
Authorization: Bearer {token}
Content-Type: application/json

{
  "incidentId": 1,
  "content": "Traffic has been cleared. All lanes are now open."
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "incidentId": 1,
    "userId": 1,
    "content": "Traffic has been cleared. All lanes are now open.",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get All Updates

```http
GET /updates
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "incidentId": 1,
      "userId": 1,
      "content": "Traffic has been cleared.",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Updates by City

```http
GET /updates/city/{city}
```

**Response (200 OK):** Same as Get All Updates

#### Get Update by ID

```http
GET /updates/{id}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "incidentId": 1,
    "userId": 1,
    "content": "Traffic has been cleared.",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Update Status

```http
PATCH /updates/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "resolved"
}
```

**Response (200 OK):** Same as Get Update by ID

---

### 6. Reports Endpoints

#### Get Report Statistics

```http
GET /reports/stats/report?city=Ramallah
```

**Response (200 OK):**

```json
{
  "data": {
    "totalReports": 150,
    "verifiedReports": 120,
    "pendingReports": 20,
    "rejectedReports": 10,
    "averageCredibility": 0.92
  }
}
```

#### Get Duplicate Groups

```http
GET /reports/admin/duplicates/groups?city=Ramallah
Authorization: Bearer {token}
```

**Note:** Admin/Moderator only

**Response (200 OK):**

```json
{
  "data": [
    {
      "groupId": 1,
      "incidentId": 1,
      "reportCount": 5,
      "reports": []
    }
  ],
  "count": 1
}
```

#### Get Pending Moderations

```http
GET /reports/admin/pending/moderations?page=1&limit=10
Authorization: Bearer {token}
```

**Note:** Admin/Moderator only

**Response (200 OK):**

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 10,
  "totalPages": 0
}
```

#### Bulk Moderate Reports

```http
POST /reports/admin/bulk-moderate
Authorization: Bearer {token}
Content-Type: application/json

{
  "reportIds": [1, 2, 3],
  "action": "approve",
  "reason": "Photos verified and clear",
  "notes": "All reports are legitimate"
}
```

**Note:** Admin/Moderator only

**Required Fields:**

- `reportIds` (array of integers)
- `action` (enum: approve, reject)

**Response (200 OK):**

```json
{
  "message": "Bulk moderation completed",
  "data": {
    "processedCount": 3,
    "successCount": 3,
    "failureCount": 0
  }
}
```

---

## Request & Response Schemas

### Common Response Format

#### Success Response (2xx)

```json
{
  "message": "Operation successful",
  "data": {},
  "success": true
}
```

#### Error Response (4xx, 5xx)

```json
{
  "message": "Error description",
  "success": false,
  "details": "Additional error details (if available)"
}
```

### Pagination Format

```json
{
  "data": [],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

### Data Models

#### User

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Incident

```json
{
  "id": 1,
  "title": "Road accident",
  "description": "Two vehicle collision",
  "type": "accident",
  "severity": "high",
  "status": "active",
  "latitude": 31.9454,
  "longitude": 35.2075,
  "city": "Ramallah",
  "createdBy": 1,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### Alert Subscription

```json
{
  "id": 1,
  "userId": 1,
  "incidentTypes": ["accident", "congestion"],
  "cities": ["Ramallah", "Bethlehem"],
  "radiusKm": 10,
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning         | Scenario                         |
| ---- | --------------- | -------------------------------- |
| 200  | OK              | Successful GET/PATCH request     |
| 201  | Created         | Successful POST request          |
| 400  | Bad Request     | Invalid input, validation errors |
| 401  | Unauthorized    | Missing/invalid token            |
| 403  | Forbidden       | Insufficient permissions         |
| 404  | Not Found       | Resource doesn't exist           |
| 500  | Server Error    | Unexpected server error          |
| 501  | Not Implemented | Service temporarily unavailable  |

### Error Response Examples

#### 400 - Validation Error

```json
{
  "message": "Validation error",
  "details": "\"title\" is required",
  "success": false
}
```

#### 401 - Unauthorized

```json
{
  "message": "Access denied. No token provided."
}
```

#### 403 - Forbidden

```json
{
  "message": "Access denied. Insufficient permissions."
}
```

#### 404 - Not Found

```json
{
  "message": "Incident not found"
}
```

#### 500 - Server Error

```json
{
  "message": "Internal server error"
}
```

---

## Environment Configurations

### Development Configuration

```json
{
  "base_url": "http://localhost:3000",
  "timeout": 10000,
  "environment": "development",
  "debug_mode": true
}
```

### Staging Configuration

```json
{
  "base_url": "http://api.wasel.local:3000",
  "timeout": 30000,
  "environment": "staging",
  "debug_mode": false
}
```

### Production Configuration

```json
{
  "base_url": "https://api.wasel.ps",
  "timeout": 30000,
  "environment": "production",
  "debug_mode": false
}
```

---

## Testing Guide

### Test Execution Steps

#### 1. Import Collection into APIdog

1. Open APIdog Desktop/Web application
2. Click "Import" → "Import from File"
3. Select `apidog-collection.json`
4. Confirm import

#### 2. Configure Environment

1. In APIdog, select **Development** environment
2. Set base URL to `http://localhost:3000`
3. Configure any additional headers if needed

#### 3. Run Test Suite

1. **Authentication Tests**
   - Register a new user
   - Login and capture token
   - Get user profile

2. **Incident Tests**
   - Create a new incident
   - Get all incidents
   - Get incidents by city
   - Get nearby incidents
   - Update incident

3. **Alert Tests**
   - Create subscription
   - Get subscriptions
   - Update subscription
   - Delete subscription

4. **Route Tests**
   - Test route estimation with different parameters

5. **Update Tests**
   - Create update
   - Get all updates
   - Update status

6. **Report Tests**
   - Get statistics
   - Get pending moderations
   - Bulk moderate reports

### Test Execution Results

Tests include automated assertions for:

- ✅ Status code validation
- ✅ Response structure validation
- ✅ Required fields presence
- ✅ Data type validation
- ✅ Token extraction and reuse
- ✅ Variable injection (incident_id, subscription_id, etc.)

### Load Testing Recommendations

For production environments:

- Use APIdog's load testing feature
- Test with 100+ concurrent users
- Monitor response times and error rates
- Verify database connection pool

---

## APIdog Integration

### Using APIdog with Wasel API

#### Installation & Setup

1. **Download APIdog**
   - Visit: https://apidog.com/download
   - Install for your OS (Windows, Mac, Linux)

2. **Import OpenAPI Specification**
   - Open APIdog → Import
   - Select `openapi.yaml`
   - Auto-generates all endpoints and documentation

3. **Import Postman Collection**
   - Open APIdog → Import
   - Select `apidog-collection.json`
   - Ready for testing and documentation

#### Creating Tests in APIdog

1. Click on any endpoint
2. Scroll to "Tests" tab
3. Add test cases using APIdog's visual editor
4. Examples provided in collection

#### Exporting from APIdog

1. Right-click project → Export
2. Choose format (OpenAPI, Postman, HTML)
3. Share with team via generated documents

#### Running Tests in APIdog

1. Select environment
2. Click "Run Tests" or "Send" for single requests
3. View results in real-time
4. Export test reports

#### API Documentation Generation

APIdog automatically generates:

- HTML documentation
- OpenAPI specification
- Markdown documentation
- Mock server endpoints

#### Collaboration Features

- Share collections with team
- Version control integration
- Comments on endpoints
- Change tracking

---

## Best Practices

### Security

1. ✅ Always use HTTPS in production
2. ✅ Store tokens securely (not in localStorage)
3. ✅ Implement token refresh mechanism
4. ✅ Validate all inputs on server side
5. ✅ Use environment-specific credentials

### API Design

1. ✅ Use consistent naming conventions
2. ✅ Include pagination for list endpoints
3. ✅ Provide clear error messages
4. ✅ Version your API (e.g., `/v1/incidents`)
5. ✅ Document all parameters and responses

### Testing

1. ✅ Test all happy paths
2. ✅ Test error scenarios
3. ✅ Test with invalid inputs
4. ✅ Test authentication/authorization
5. ✅ Automate regression tests

### Documentation

1. ✅ Keep documentation updated
2. ✅ Provide code examples
3. ✅ Document all error codes
4. ✅ Include rate limiting info
5. ✅ Provide migration guides

---

## Support & Resources

### Documentation Files

- **OpenAPI Spec**: `openapi.yaml` - Standard API specification
- **Postman Collection**: `apidog-collection.json` - Ready-to-import collection
- **Environments**: `environments.json` - All environment configurations
- **This Guide**: `API_DOCUMENTATION.md` - Complete reference

### Useful Links

- APIdog Official: https://apidog.com/
- OpenAPI Specification: https://spec.openapis.org/
- JWT Documentation: https://jwt.io/
- Express.js Documentation: https://expressjs.com/

### Contact

For API support issues:

- Email: support@wasel.ps
- Documentation: See `README.md`

---

## Version History

| Version         | Date       | Changes                      |
| --------------- | ---------- | ---------------------------- |
| 1.0.0           | 2024-01-15 | Initial API release          |
| 1.1.0 (Planned) | 2024-Q2    | Token refresh, Rate limiting |
| 2.0.0 (Planned) | 2024-Q3    | GraphQL support, Webhooks    |

---

**Last Updated**: January 15, 2024
**Generated for**: APIdog Integration
**Status**: Production Ready
