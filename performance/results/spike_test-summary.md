# k6 Performance Summary

- Scenario: spike_test
- Average response time: 8544.07 ms
- p95 latency: 11037.74 ms
- Throughput: 3.10 req/s
- Error rate: 28.74%

## Bottleneck Hints
- High tail latency detected (p95 > 1200ms). Investigate DB query plans and indexes.
- Error rate above target (3%). Check validation failures, DB constraints, and auth token churn.
