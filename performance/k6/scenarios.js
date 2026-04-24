import http from "k6/http";
import exec from "k6/execution";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

import { createUsersAndTokens, defaultHeaders } from "./lib/auth.js";
import { buildIncidentQuery, buildReportPayload } from "./lib/payloads.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TOKEN_POOL_SIZE = Number(__ENV.TOKEN_POOL_SIZE || 120);
const THINK_TIME_MS = Number(__ENV.THINK_TIME_MS || 200);

const appLatency = new Trend("app_latency", true);
const appErrorRate = new Rate("app_error_rate");
const appThroughput = new Counter("app_throughput");

const scenarioDefinitions = {
  read_heavy: {
    executor: "constant-arrival-rate",
    exec: "readHeavy",
    rate: Number(__ENV.READ_RATE || 25),
    timeUnit: "1s",
    duration: __ENV.READ_DURATION || "5m",
    preAllocatedVUs: Number(__ENV.READ_PRE_VUS || 30),
    maxVUs: Number(__ENV.READ_MAX_VUS || 120),
  },
  write_heavy: {
    executor: "constant-arrival-rate",
    exec: "writeHeavy",
    rate: Number(__ENV.WRITE_RATE || 2),
    timeUnit: "1s",
    duration: __ENV.WRITE_DURATION || "10m",
    preAllocatedVUs: Number(__ENV.WRITE_PRE_VUS || 20),
    maxVUs: Number(__ENV.WRITE_MAX_VUS || 80),
  },
  mixed_workload: {
    executor: "constant-arrival-rate",
    exec: "mixedWorkload",
    rate: Number(__ENV.MIXED_RATE || 5),
    timeUnit: "1s",
    duration: __ENV.MIXED_DURATION || "8m",
    preAllocatedVUs: Number(__ENV.MIXED_PRE_VUS || 20),
    maxVUs: Number(__ENV.MIXED_MAX_VUS || 100),
  },
  spike_test: {
    executor: "ramping-vus",
    exec: "spikeTest",
    startVUs: 0,
    stages: [
      { duration: __ENV.SPIKE_RAMP_UP || "30s", target: Number(__ENV.SPIKE_PEAK_VUS || 160) },
      { duration: __ENV.SPIKE_HOLD || "60s", target: Number(__ENV.SPIKE_PEAK_VUS || 160) },
      { duration: __ENV.SPIKE_RAMP_DOWN || "60s", target: 10 },
      { duration: __ENV.SPIKE_RECOVERY || "60s", target: 0 },
    ],
    gracefulRampDown: "10s",
  },
  soak_test: {
    executor: "constant-vus",
    exec: "soakTest",
    vus: Number(__ENV.SOAK_VUS || 12),
    duration: __ENV.SOAK_DURATION || "30m",
  },
};

function selectedScenarios() {
  const selected = (__ENV.SCENARIO || "all").trim();
  if (selected === "all") {
    return scenarioDefinitions;
  }

  if (!scenarioDefinitions[selected]) {
    throw new Error(
      `Invalid SCENARIO value '${selected}'. Use one of: all, ${Object.keys(scenarioDefinitions).join(", ")}`,
    );
  }

  return { [selected]: scenarioDefinitions[selected] };
}

export const options = {
  scenarios: selectedScenarios(),
  setupTimeout: __ENV.SETUP_TIMEOUT || "3m",
  thresholds: {
    http_req_failed: ["rate<0.03"],
    http_req_duration: ["p(95)<1200"],
    app_error_rate: ["rate<0.03"],
    "http_req_duration{scenario:read_heavy}": ["p(95)<600"],
    "http_req_duration{scenario:write_heavy}": ["p(95)<900"],
    "http_req_duration{scenario:mixed_workload}": ["p(95)<1000"],
    "http_req_duration{scenario:spike_test}": ["p(95)<1500"],
    "http_req_duration{scenario:soak_test}": ["p(95)<1200"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

export function setup() {
  const tokens = createUsersAndTokens(BASE_URL, TOKEN_POOL_SIZE);
  return { tokens };
}

function getToken(data) {
  const tokens = data.tokens || [];
  if (!tokens.length) {
    return null;
  }
  const idx = exec.vu.idInTest % tokens.length;
  return tokens[idx];
}

function recordResult(response) {
  const success = response.status >= 200 && response.status < 400;
  appLatency.add(response.timings.duration);
  appErrorRate.add(!success);
  appThroughput.add(1);

  check(response, {
    "request succeeded": () => success,
  });
}

export function readHeavy() {
  const query = buildIncidentQuery(__ENV.TEST_CITY);
  const response = http.get(`${BASE_URL}/incidents?${query}`, {
    tags: { endpoint: "GET /incidents", workload: "read" },
  });

  recordResult(response);
  sleep(THINK_TIME_MS / 1000);
}

export function writeHeavy(data) {
  const token = getToken(data);
  const payload = buildReportPayload();

  const response = http.post(
    `${BASE_URL}/reports`,
    JSON.stringify(payload),
    {
      ...defaultHeaders(token),
      tags: { endpoint: "POST /reports", workload: "write" },
    },
  );

  recordResult(response);
  sleep(THINK_TIME_MS / 1000);
}

export function mixedWorkload(data) {
  const token = getToken(data);
  const operation = Math.random() < 0.7 ? "read" : "write";

  if (operation === "read") {
    const query = buildIncidentQuery(__ENV.TEST_CITY);
    const response = http.get(`${BASE_URL}/incidents?${query}`, {
      tags: { endpoint: "GET /incidents", workload: "mixed-read" },
    });
    recordResult(response);
  } else {
    const response = http.post(
      `${BASE_URL}/reports`,
      JSON.stringify(buildReportPayload()),
      {
        ...defaultHeaders(token),
        tags: { endpoint: "POST /reports", workload: "mixed-write" },
      },
    );
    recordResult(response);
  }

  sleep((THINK_TIME_MS + Math.random() * THINK_TIME_MS) / 1000);
}

export function spikeTest() {
  const query = buildIncidentQuery(__ENV.TEST_CITY);
  const response = http.get(`${BASE_URL}/incidents?${query}`, {
    tags: { endpoint: "GET /incidents", workload: "spike" },
  });

  recordResult(response);
  sleep(0.05);
}

export function soakTest(data) {
  const token = getToken(data);

  const readResponse = http.get(`${BASE_URL}/incidents?${buildIncidentQuery(__ENV.TEST_CITY)}`, {
    tags: { endpoint: "GET /incidents", workload: "soak-read" },
  });
  recordResult(readResponse);

  if (Math.random() < 0.25) {
    const writeResponse = http.post(
      `${BASE_URL}/reports`,
      JSON.stringify(buildReportPayload()),
      {
        ...defaultHeaders(token),
        tags: { endpoint: "POST /reports", workload: "soak-write" },
      },
    );
    recordResult(writeResponse);
  }

  sleep(1);
}

function bottleneckHints(data) {
  const duration = data.metrics.http_req_duration;
  const failed = data.metrics.http_req_failed;

  const hints = [];
  if (duration?.values?.["p(95)"] > 1200) {
    hints.push("High tail latency detected (p95 > 1200ms). Investigate DB query plans and indexes.");
  }
  if (failed?.values?.rate > 0.03) {
    hints.push("Error rate above target (3%). Check validation failures, DB constraints, and auth token churn.");
  }
  if (!hints.length) {
    hints.push("No major bottleneck threshold breached in this run.");
  }
  return hints;
}

export function handleSummary(data) {
  const scenario = __ENV.SCENARIO || "all";
  const durationAvg = data.metrics.http_req_duration?.values?.avg || 0;
  const durationP95 = data.metrics.http_req_duration?.values?.["p(95)"] || 0;
  const throughput = data.metrics.http_reqs?.values?.rate || 0;
  const errorRate = data.metrics.http_req_failed?.values?.rate || 0;

  const lines = [
    "# k6 Performance Summary",
    "",
    `- Scenario: ${scenario}`,
    `- Average response time: ${durationAvg.toFixed(2)} ms`,
    `- p95 latency: ${durationP95.toFixed(2)} ms`,
    `- Throughput: ${throughput.toFixed(2)} req/s`,
    `- Error rate: ${(errorRate * 100).toFixed(2)}%`,
    "",
    "## Bottleneck Hints",
    ...bottleneckHints(data).map((v) => `- ${v}`),
    "",
  ];

  return {
    stdout: lines.join("\n"),
    [`performance/results/${scenario}-summary.json`]: JSON.stringify(data, null, 2),
    [`performance/results/${scenario}-summary.md`]: lines.join("\n"),
  };
}
