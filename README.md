# Wasel Palestine API

API-centric smart mobility backend for Palestinian movement intelligence.

Wasel Palestine aggregates structured data about incidents, checkpoints, route risk, weather context, and crowdsourced reports, then exposes it through versioned APIs for mobile apps, dashboards, and third-party services.

## Why This Stack

- **Node.js + Express**: efficient I/O model, fast API development, simple service modularization, and good horizontal scalability.
- **PostgreSQL (Relational DB)**: strong consistency, indexing support, SQL power for analytics and geo-adjacent filtering.
- **Prisma ORM + Raw SQL**: maintainable data access for most operations, with raw SQL for performance-sensitive queries (for example nearby incident distance calculations).
- **JWT (Access + Refresh)**: stateless API authentication with secure token rotation workflow.
- **Docker**: repeatable deployments and parity between local/dev/test environments.

## Scope

- Backend only (API design, data modeling, integrations, reliability, performance).
- UI/frontend is intentionally out of scope.

## API Versioning

All core endpoints are exposed under `/api/v1`:

- `/api/v1/auth`
- `/api/v1/incidents`
- `/api/v1/reports`
- `/api/v1/routes`
- `/api/v1/alerts`
- `/api/v1/updates`

## Core Features

- **Road incidents & checkpoints**
  - registry of closures, delays, accidents, and hazards
  - incident status history with audit trail
  - filtering, sorting, pagination
  - moderator/admin verification and lifecycle updates
- **Crowdsourced reporting**
  - citizen report submission with validation
  - anti-abuse checks (rate limiting and spam checks)
  - duplicate detection + moderation workflow
  - credibility scoring via votes
  - auditable moderation actions
- **Route estimation & mobility intelligence**
  - heuristic route distance + duration estimation
  - metadata explaining route-affecting factors
  - constraints: avoid checkpoints / avoid specific areas
  - hazard-aware route enrichment
- **Alerts & regional notifications**
  - user subscriptions by area/category
  - alert record generation for verified incidents
  - notification-ready design for future external delivery channels

## External API Integrations

At least two external APIs are integrated:

- **Geolocation / Routing context**: OpenStreetMap Nominatim
- **Weather context**: OpenWeatherMap

Integration reliability controls:

- request timeouts
- retry logic with backoff
- in-memory caching
- local rate limiting safeguards
- auth/header handling in the API client utility

## Architecture

```mermaid
flowchart LR
  C[Client Apps / Third-Party Systems] --> R[Express Routes /api/v1/*]
  R --> S[Domain Services]
  S --> P[Prisma ORM]
  S --> Q[Raw SQL Queries]
  P --> DB[(PostgreSQL)]
  Q --> DB
  S --> G[Geolocation Service]
  S --> W[Weather Service]
  G --> N[Nominatim API]
  W --> O[OpenWeather API]
```

## Project Structure

```text
middleware/          auth middleware
models/              domain models
repos/               repository layer (ORM + raw SQL)
routes/              API route modules
services/            business logic
utils/               shared utilities (jwt, prisma, api client)
prisma/              schema + migrations
performance/         k6 scripts, outputs, reports
```

## Data Model (ERD Summary)

Main entities:

- `User`
- `RoadIncident`
- `IncidentStatus`
- `Report`
- `ReportVote`
- `ReportModeration`
- `AlertSubscription`
- `Alert`

Highlights:

- one-to-many status history for incident lifecycle tracking
- one-to-many moderation log for full report action auditability
- one-to-many votes for credibility scoring
- subscription-to-alert relationship for regional notifications

## Authentication

JWT authentication is implemented with:

- **Access token** (short-lived, API authorization)
- **Refresh token** (longer-lived, rotates into a new access token)

Endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/profile`

Example:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'
```

## Quick Start (Local)

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env` in project root:

```bash
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://postgres.clwcxxyhzmqfhliagvwk:Beren12345__6789@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# For migrations only
MIGRATION_URL="postgresql://postgres.clwcxxyhzmqfhliagvwk:Beren12345__6789@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"


# Weather API (get free key from https://openweathermap.org/api)
OPENWEATHER_API_KEY=d8fb437972b557a868f739561b84b1e5

# Optional configurations
API_CACHE_ENABLED=true
API_TIMEOUT_MS=8000
WEATHER_CACHE_TTL=600
GEO_CACHE_TTL=3600
```

### 3) Apply database migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4) Start the API

```bash
npm start
```

Server default: `http://localhost:3000`

## Quick Start (Docker)

### Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Ports `3000` and `5432` available

### 1) Review compose configuration

The project includes `docker-compose.yml` with:

- `api` service (Node.js backend)
- `db` service (PostgreSQL 16)
- named volume `pgdata` for persistent DB storage

### 2) Start services

```bash
docker compose up --build
```

To run in detached mode:

```bash
docker compose up --build -d
```

Services:

- `api` on `3000`
- `db` on `5432`

### 3) Check container status

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f db
```

### 4) Run migrations (inside api container)

If you need to apply migrations after startup:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma generate
```

### 5) Stop services

```bash
docker compose down
```

Stop and remove volumes (destructive for local DB data):

```bash
docker compose down -v
```

### Docker environment variables

Compose uses these important variables for the API service:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `OPENWEATHER_API_KEY`

For production-like setups, override secrets through environment injection rather than hardcoding values in compose.

## API Usage Examples

### Create incident

```bash
curl -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "title":"Checkpoint delay at north road",
    "description":"Heavy queue due to intensified checks",
    "type":"delay",
    "severity":"high",
    "city":"Ramallah",
    "latitude":31.9044,
    "longitude":35.2062
  }'
```

### Estimate route with constraints

```bash
curl -X POST http://localhost:3000/api/v1/routes/estimate-with-constraints \
  -H "Content-Type: application/json" \
  -d '{
    "startLatitude":31.9038,
    "startLongitude":35.2034,
    "endLatitude":31.7683,
    "endLongitude":35.2137,
    "avoidCheckpoints":true,
    "avoidAreas":[{"name":"Old City"}]
  }'
```

## Documentation & Testing Artifacts

- OpenAPI: `openapi.yaml`
- APIDog collection: `apidog-collection.json`
- Environments: `environments.json`
- Full API docs: `API_DOCUMENTATION.md`
- APIDog setup: `APIDOG_SETUP.md`
- Test execution docs: `TEST_EXECUTION_RESULTS.md`
- Deliverables summary: `DELIVERABLES_SUMMARY.md`

### Documentation workflow

Recommended order for onboarding and validation:

1. Start with `README.md` for architecture and setup.
2. Import `openapi.yaml` or `apidog-collection.json` into APIDog.
3. Load `environments.json` and choose development environment.
4. Run auth flow (`register` -> `login` -> `refresh` -> `profile`).
5. Run endpoint collections by domain (incidents, reports, routes, alerts).
6. Validate output against `API_DOCUMENTATION.md`.
7. Record execution evidence with `TEST_EXECUTION_RESULTS.md`.

### APIDog usage notes

- Keep `base_url` aligned with deployment target (local/docker/staging/prod).
- Reuse token variables from auth responses for protected endpoints.
- Validate both success and error format consistency (400/401/403/404/500).
- Export run results as part of submission evidence.

### Keeping docs synchronized

When APIs change, update these files together:

- `routes/*` + `services/*` (implementation)
- `openapi.yaml` (contract)
- `apidog-collection.json` (test collection)
- `API_DOCUMENTATION.md` (human-readable reference)
- `README.md` (developer onboarding and architecture)

## Performance & Load Testing (k6)

Implemented mandatory scenarios:

- read-heavy
- write-heavy
- mixed workload
- spike test
- soak test

Scripts:

- `npm run perf:read`
- `npm run perf:write`
- `npm run perf:mixed`
- `npm run perf:spike`
- `npm run perf:soak`
- `npm run perf:all`
- `npm run perf:compare`

Reports:

- `performance/PERFORMANCE_REPORT.md`
- `performance/results/`

## Security Notes

- Input validation with Joi schemas.
- Password hashing with bcrypt.
- Route-level authentication/authorization middleware.
- Access control for moderator/admin actions.
- Token verification on protected endpoints.
- External API usage guarded with timeout/retry/rate-limiting logic.

## Requirement Traceability

- **Versioned REST API**: `/api/v1/*`
- **Relational DB mandatory**: PostgreSQL
- **ORM + raw queries**: Prisma + raw SQL in repository layer
- **JWT / OAuth2 requirement**: JWT access + refresh implemented
- **Docker deployment requirement**: `Dockerfile` + `docker-compose.yml`
- **External APIs requirement**: Geolocation + Weather integrations
- **Performance testing requirement**: k6 scenarios and report artifacts
- **API documentation requirement**: OpenAPI + APIDog collection + environment configs

## Team Workflow

Project follows a Git-based collaborative workflow with:

- feature branches
- pull requests for merges
- meaningful commit messages

## License

ISC
