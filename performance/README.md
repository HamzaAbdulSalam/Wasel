# Performance and Load Testing (k6)

This folder contains mandatory performance scenarios for Wasel using k6:

- read-heavy workloads (incident listing)
- write-heavy workloads (report submissions)
- mixed workloads
- spike testing
- sustained load (soak testing)

## Prerequisites

1. Start API server on port 3000 (or set BASE_URL).
2. Ensure database is running and migrations are applied.
3. Install k6: https://k6.io/docs/get-started/installation/

## Scenarios

The script is at `performance/k6/scenarios.js`.

Run each scenario separately (recommended):

```bash
npm run perf:read
npm run perf:write
npm run perf:mixed
npm run perf:spike
npm run perf:soak
```

Run all scenarios together:

```bash
npm run perf:all
```

## Useful Environment Variables

- `BASE_URL` (default: `http://localhost:3000`)
- `SCENARIO` (`read_heavy`, `write_heavy`, `mixed_workload`, `spike_test`, `soak_test`, `all`)
- `TOKEN_POOL_SIZE` (default: `120`)
- `AUTH_TOKEN` (optional fixed bearer token)
- `PERF_USER_EMAIL`, `PERF_USER_PASSWORD` (optional login credentials)

Scenario tuning:

- `READ_RATE`, `READ_DURATION`
- `WRITE_RATE`, `WRITE_DURATION`
- `MIXED_RATE`, `MIXED_DURATION`
- `SPIKE_PEAK_VUS`, `SPIKE_RAMP_UP`, `SPIKE_HOLD`, `SPIKE_RAMP_DOWN`
- `SOAK_VUS`, `SOAK_DURATION`

## Generated Outputs

Each run writes:

- `performance/results/<scenario>-summary.json`
- `performance/results/<scenario>-summary.md`

These include required metrics:

- average response time
- p95 latency
- throughput
- error rate
- bottleneck hints

## Before/After Comparison Report

1. Capture baseline:

```bash
k6 run performance/k6/scenarios.js --env SCENARIO=read_heavy
```

2. Apply optimizations.
3. Capture optimized run:

```bash
k6 run performance/k6/scenarios.js --env SCENARIO=read_heavy
```

4. Generate report:

```bash
npm run perf:compare -- performance/results/read_heavy-summary-baseline.json performance/results/read_heavy-summary-optimized.json performance/PERFORMANCE_REPORT.md
```

Note: rename or copy generated summary files between runs so baseline and optimized are preserved.
