const fs = require("fs");
const path = require("path");

function usage() {
  console.error(
    "Usage: node performance/compare-results.js <baseline-summary.json> <optimized-summary.json> [output-markdown]",
  );
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function metric(summary, key, stat = "avg") {
  const values = summary?.metrics?.[key]?.values;
  if (!values) return null;
  return values[stat] ?? values["p(95)"] ?? null;
}

function percentDelta(before, after) {
  if (before === 0 || before == null || after == null) return "n/a";
  const delta = ((after - before) / before) * 100;
  return `${delta.toFixed(2)}%`;
}

function formatMs(v) {
  return v == null ? "n/a" : `${v.toFixed(2)} ms`;
}

function formatRate(v) {
  return v == null ? "n/a" : `${v.toFixed(2)} req/s`;
}

function formatPct(v) {
  return v == null ? "n/a" : `${(v * 100).toFixed(2)}%`;
}

function detectBottlenecks(summary) {
  const p95 = metric(summary, "http_req_duration", "p(95)");
  const errorRate = metric(summary, "http_req_failed", "rate");
  const throughput = metric(summary, "http_reqs", "rate");

  const findings = [];
  if (p95 != null && p95 > 1200) {
    findings.push("Tail latency is high (p95 > 1200ms), likely DB-bound under concurrency.");
  }
  if (errorRate != null && errorRate > 0.03) {
    findings.push("Error rate breached 3%, check rate limits, validation paths, and connection limits.");
  }
  if (throughput != null && throughput < 5) {
    findings.push("Throughput is low (<5 req/s), likely constrained by synchronous operations.");
  }
  if (findings.length === 0) {
    findings.push("No threshold breach detected in compared metrics.");
  }
  return findings;
}

function buildReport(baseline, optimized, baselinePath, optimizedPath) {
  const bAvg = metric(baseline, "http_req_duration", "avg");
  const bP95 = metric(baseline, "http_req_duration", "p(95)");
  const bTp = metric(baseline, "http_reqs", "rate");
  const bErr = metric(baseline, "http_req_failed", "rate");

  const oAvg = metric(optimized, "http_req_duration", "avg");
  const oP95 = metric(optimized, "http_req_duration", "p(95)");
  const oTp = metric(optimized, "http_reqs", "rate");
  const oErr = metric(optimized, "http_req_failed", "rate");

  const lines = [
    "# Performance Report (k6)",
    "",
    `- Baseline summary: ${baselinePath}`,
    `- Optimized summary: ${optimizedPath}`,
    "",
    "## Before/After Comparison",
    "",
    "| Metric | Before | After | Delta |",
    "|---|---:|---:|---:|",
    `| Average response time | ${formatMs(bAvg)} | ${formatMs(oAvg)} | ${percentDelta(bAvg, oAvg)} |`,
    `| p95 latency | ${formatMs(bP95)} | ${formatMs(oP95)} | ${percentDelta(bP95, oP95)} |`,
    `| Throughput | ${formatRate(bTp)} | ${formatRate(oTp)} | ${percentDelta(bTp, oTp)} |`,
    `| Error rate | ${formatPct(bErr)} | ${formatPct(oErr)} | ${percentDelta(bErr, oErr)} |`,
    "",
    "## Observed Limitations",
    "- Add your environment constraints here (CPU, DB size, network, container limits).",
    "",
    "## Identified Bottlenecks",
    ...detectBottlenecks(optimized).map((f) => `- ${f}`),
    "",
    "## Root Causes",
    "- Correlate slow endpoints with DB query plans, lock contention, or external API waits.",
    "",
    "## Optimizations Applied",
    "- Document concrete fixes (indexes, pagination caps, pooling, caching, async offload).",
    "",
    "## Validation Notes",
    "- Re-run the same scenario profile for baseline and optimized versions to ensure fairness.",
    "",
  ];

  return lines.join("\n");
}

(function main() {
  const baselinePath = process.argv[2];
  const optimizedPath = process.argv[3];
  const outputPath = process.argv[4] || path.join("performance", "PERFORMANCE_REPORT.md");

  if (!baselinePath || !optimizedPath) {
    usage();
  }

  const baseline = readJson(baselinePath);
  const optimized = readJson(optimizedPath);
  const report = buildReport(baseline, optimized, baselinePath, optimizedPath);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, report);
  console.log(`Report written to ${outputPath}`);
})();
