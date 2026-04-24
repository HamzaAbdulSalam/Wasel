# Performance Report (k6)

## Scope

Mandatory scenarios covered:

- read-heavy workloads (GET /incidents)
- write-heavy workloads (POST /reports)
- mixed workloads (read/write blend)
- spike testing (rapid VU ramp-up)
- sustained load (soak testing)

## Test Environment

- Date: 2026-04-21
- Commit hash: local workspace run (post-pull state)
- API base URL: http://localhost:3000
- Host machine specs (CPU/RAM): local developer machine
- Database engine/version: PostgreSQL via Prisma
- Dataset size: development dataset

## Metrics Summary

Data source: performance/results/*-summary.md and JSON output.

| Scenario | Avg Response Time (ms) | p95 Latency (ms) | Throughput (req/s) | Error Rate (%) |
|---|---:|---:|---:|---:|
| read_heavy | 7824.70 | 9590.15 | 2.67 | 0.00 |
| write_heavy | 4328.68 | 5925.52 | 0.52 | 0.00 |
| mixed_workload | 3175.24 | 5811.49 | 0.99 | 0.00 |
| spike_test | 8544.07 | 11037.74 | 3.10 | 28.74 |
| soak_test | 2470.34 | 5825.46 | 1.48 | 0.00 |

## Identified Bottlenecks

- Very high tail latency in every scenario (p95 from 5.8s to 11.0s), indicating query and/or DB resource bottlenecks under concurrency.
- Low throughput for read and write paths compared to requested arrival rate, indicating saturation.
- Spike test failure behavior (28.74% errors) under sudden concurrency increase.
- k6 showed Insufficient VUs warning for read-heavy profile, meaning the system could not keep pace with configured arrival rate.

## Observed Limitations

- Tests were executed on a local developer environment, not production-grade hardware.
- Dataset is development-scale and may not reflect production data cardinality.
- Shortened durations were used for quick validation of all mandatory scenarios.
- Current report focuses on API-level metrics; DB internal telemetry was not captured in this pass.

## Root Causes

- Read-heavy endpoint performs list and count in parallel for every request, increasing DB pressure under load.
- Incident list responses included unnecessary user fields before optimization, increasing payload and serialization overhead.
- Write-heavy and mixed paths rely on synchronous validation and DB writes, causing queueing at higher concurrency.
- Spike scenario likely exceeded current DB/app concurrency capacity, causing high tail latency and failures.

## Optimizations Applied

- [x] Reduced incident listing payload size by removing unnecessary user email field from list responses.
- [ ] Add composite DB indexes aligned with high-frequency filters/sorts (status, city, createdAt).
- [ ] Tune DB connection pooling and Prisma settings.
- [ ] Add optional approximate count or cache strategy for read-heavy listing endpoints.
- [ ] Add controlled warm-up and scenario-specific VU/arrival calibration for repeatable load baselines.

## Before/After Comparison

Optimization measured: payload trimming in incident listing repository.

Baseline file: performance/results/read_heavy-summary-baseline.json  
After file: performance/results/read_heavy-summary.json

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Average response time | 7824.70 ms | 7689.78 ms | -1.72% |
| p95 latency | 9590.15 ms | 9721.79 ms | +1.37% |
| Throughput | 2.67 req/s | 2.69 req/s | +0.89% |
| Error rate | 0.00% | 0.00% | n/a |

## Conclusion

Current SLO targets are not met for latency and throughput under load. The applied payload optimization produced a small average latency and throughput improvement but did not improve p95 tail latency, which indicates the dominant bottleneck is DB/query/concurrency behavior rather than response payload size alone. Next optimization cycle should prioritize DB indexing, query strategy (especially count behavior), and connection/concurrency tuning, then repeat the same k6 profiles for a second before/after cycle.
