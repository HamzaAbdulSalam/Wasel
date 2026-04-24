# Performance Report (k6)

- Baseline summary: performance/results/read_heavy-summary-baseline.json
- Optimized summary: performance/results/read_heavy-summary.json

## Before/After Comparison

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Average response time | 7824.70 ms | 7689.78 ms | -1.72% |
| p95 latency | 9590.15 ms | 9721.79 ms | 1.37% |
| Throughput | 2.67 req/s | 2.69 req/s | 0.89% |
| Error rate | 0.00% | 0.00% | n/a |

## Observed Limitations
- Add your environment constraints here (CPU, DB size, network, container limits).

## Identified Bottlenecks
- Tail latency is high (p95 > 1200ms), likely DB-bound under concurrency.
- Throughput is low (<5 req/s), likely constrained by synchronous operations.

## Root Causes
- Correlate slow endpoints with DB query plans, lock contention, or external API waits.

## Optimizations Applied
- Document concrete fixes (indexes, pagination caps, pooling, caching, async offload).

## Validation Notes
- Re-run the same scenario profile for baseline and optimized versions to ensure fairness.
