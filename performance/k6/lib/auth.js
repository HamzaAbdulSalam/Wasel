import http from "k6/http";
import { fail } from "k6";

export function defaultHeaders(token) {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
}

function tryLogin(baseUrl, email, password) {
  const response = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" }, tags: { endpoint: "POST /auth/login" } },
  );

  if (response.status !== 200) {
    fail(`Login failed for ${email}. Status: ${response.status}. Body: ${response.body}`);
  }

  const payload = response.json();
  if (!payload || !payload.token) {
    fail(`Login did not return token for ${email}`);
  }

  return payload.token;
}

export function createUsersAndTokens(baseUrl, userCount) {
  if (__ENV.AUTH_TOKEN) {
    return [__ENV.AUTH_TOKEN];
  }

  if (__ENV.PERF_USER_EMAIL && __ENV.PERF_USER_PASSWORD) {
    return [tryLogin(baseUrl, __ENV.PERF_USER_EMAIL, __ENV.PERF_USER_PASSWORD)];
  }

  const tokens = [];
  const baseSeed = Date.now();

  for (let i = 0; i < userCount; i += 1) {
    const username = `k6_user_${baseSeed}_${i}`;
    const email = `${username}@example.com`;
    const password = `K6pass!${i}A`;

    const registerResponse = http.post(
      `${baseUrl}/auth/register`,
      JSON.stringify({ username, email, password, role: "user" }),
      { headers: { "Content-Type": "application/json" }, tags: { endpoint: "POST /auth/register" } },
    );

    if (registerResponse.status !== 201 && registerResponse.status !== 400) {
      fail(`Register failed for ${email}. Status: ${registerResponse.status}. Body: ${registerResponse.body}`);
    }

    tokens.push(tryLogin(baseUrl, email, password));
  }

  if (tokens.length === 0) {
    fail("No auth tokens available for write-heavy tests");
  }

  return tokens;
}
