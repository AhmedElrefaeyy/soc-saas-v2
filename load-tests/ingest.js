/**
 * k6 load test — agent ingest endpoint
 *
 * --- Quick start (Railway) ---
 * 1. Log into your Railway account and note your email, password, and a tenant ID.
 * 2. Run:
 *      k6 run load-tests/ingest.js \
 *        -e BASE_URL=https://backend-production-a9cb4.up.railway.app \
 *        -e LOAD_EMAIL=you@example.com \
 *        -e LOAD_PASSWORD=YourPassword \
 *        -e LOAD_TENANT_ID=<uuid>
 *
 * --- New account (local dev only — Railway requires email verification) ---
 *      k6 run load-tests/ingest.js
 *
 * --- Custom load profile ---
 *      --stage 0s:1,30s:50,60s:50,10s:0
 *
 * What it measures
 *   p95 / p99 latency for POST /agents/ingest, throughput (events/s),
 *   and error rate at increasing concurrency.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const API = `${BASE_URL}/api/v1`;

// Pre-provisioned account (required for production — new accounts need email verification)
const LOAD_EMAIL    = __ENV.LOAD_EMAIL    || "";
const LOAD_PASSWORD = __ENV.LOAD_PASSWORD || "";
const LOAD_TENANT_ID = __ENV.LOAD_TENANT_ID || "";

// How many events to pack into each batch request (backend accepts up to 500)
const EVENTS_PER_BATCH = parseInt(__ENV.EVENTS_PER_BATCH || "10", 10);

// ─── Custom metrics ───────────────────────────────────────────────────────────

const eventsAccepted = new Counter("events_accepted");
const eventsRejected = new Counter("events_rejected");
const ingestErrors   = new Rate("ingest_error_rate");
const ingestLatency  = new Trend("ingest_latency_ms", true);

// ─── Test options ─────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: "10s", target: 5  },  // warm-up
    { duration: "30s", target: 20 },  // ramp to 20 VUs
    { duration: "60s", target: 20 },  // hold
    { duration: "10s", target: 0  },  // ramp down
  ],
  thresholds: {
    http_req_failed:  ["rate<0.01"],   // <1% HTTP errors
    ingest_error_rate: ["rate<0.01"],  // <1% app-level rejections
    ingest_latency_ms: ["p(95)<500"],  // p95 under 500 ms
    http_req_duration: ["p(99)<1000"], // p99 under 1 s
  },
};

// ─── Setup ───────────────────────────────────────────────────────────────────
// Returns { tenantId, agentId, agentToken } shared across all VUs.

export function setup() {
  let tenantId, authHeaders;

  if (LOAD_EMAIL && LOAD_PASSWORD && LOAD_TENANT_ID) {
    // ── Warm path: use pre-provisioned verified account ───────────────────
    const loginResp = http.post(
      `${API}/auth/login`,
      JSON.stringify({ email: LOAD_EMAIL, password: LOAD_PASSWORD }),
      { headers: { "Content-Type": "application/json" } },
    );
    if (loginResp.status !== 200) {
      throw new Error(`login failed: ${loginResp.status} ${loginResp.body}`);
    }
    const token = loginResp.json("data.access_token");
    tenantId    = LOAD_TENANT_ID;
    authHeaders = {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${token}`,
    };
    console.log(`Warm setup — tenant: ${tenantId}`);
  } else {
    // ── Cold path: register + create tenant (local dev only) ─────────────
    const email    = `loadtest-${Date.now()}@example.com`;
    const password = "LoadTest1!Pass99X";

    const regResp = http.post(
      `${API}/auth/register`,
      JSON.stringify({ email, password, full_name: "Load Tester" }),
      { headers: { "Content-Type": "application/json" } },
    );
    if (regResp.status !== 201) {
      throw new Error(`register failed (note: production requires email verification — use LOAD_EMAIL/LOAD_PASSWORD env vars): ${regResp.status} ${regResp.body}`);
    }
    const token = regResp.json("data.access_token");
    authHeaders = {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${token}`,
    };

    const tenantResp = http.post(
      `${API}/tenants`,
      JSON.stringify({ name: "Load Test Tenant", slug: `lt-${Date.now()}` }),
      { headers: authHeaders },
    );
    if (tenantResp.status !== 201) {
      throw new Error(`create tenant failed: ${tenantResp.status} ${tenantResp.body}`);
    }
    tenantId = tenantResp.json("data.id");
    console.log(`Cold setup — registered ${email}, tenant: ${tenantId}`);
  }

  // Enroll a dedicated load-test agent
  const fullHeaders = { ...authHeaders, "X-Tenant-ID": tenantId };
  const enrollResp  = http.post(
    `${API}/agents/enroll`,
    JSON.stringify({
      name:          "k6-load-agent",
      hostname:      "k6-load-host",
      os_type:       "linux",
      agent_version: "1.0.0",
      ip_address:    "10.0.0.99",
    }),
    { headers: fullHeaders },
  );
  if (enrollResp.status !== 201) {
    throw new Error(`enroll agent failed: ${enrollResp.status} ${enrollResp.body}`);
  }
  const agentData = enrollResp.json("data");
  console.log(`Agent enrolled: ${agentData.agent_id}`);

  return {
    tenantId,
    agentId:    agentData.agent_id,
    agentToken: agentData.enrollment_token,
  };
}

// ─── Main test loop ───────────────────────────────────────────────────────────

export default function (data) {
  const { tenantId, agentId, agentToken } = data;

  const now    = new Date().toISOString();
  const events = Array.from({ length: EVENTS_PER_BATCH }, (_, i) => ({
    event_id:  `k6-${__VU}-${__ITER}-${i}`,
    timestamp: now,
    category:  "process",
    hostname:  `k6-host-${__VU}`,
    os_type:   "linux",
    process: {
      pid:          1000 + i,
      name:         "bash",
      command_line: `bash -c "echo load-${i}"`,
    },
    raw: { source: "k6", vu: __VU, iter: __ITER },
  }));

  const headers = {
    "Content-Type":  "application/json",
    "X-Agent-ID":    agentId,
    "X-Agent-Token": agentToken,
    "X-Tenant-ID":   tenantId,
  };

  const start = Date.now();
  const resp  = http.post(
    `${API}/agents/ingest`,
    JSON.stringify({ events }),
    { headers },
  );
  const elapsed = Date.now() - start;

  ingestLatency.add(elapsed);

  const ok = check(resp, {
    "status 200":    (r) => r.status === 200,
    "accepted > 0":  (r) => { try { return r.json("data.accepted") > 0; } catch { return false; } },
  });

  if (ok && resp.status === 200) {
    const body = resp.json();
    eventsAccepted.add(body.data?.accepted ?? 0);
    eventsRejected.add(body.data?.rejected ?? 0);
    ingestErrors.add(0);
  } else {
    ingestErrors.add(1);
  }

  sleep(1); // simulate real agent cadence: ~1 batch/second per VU
}

// ─── Teardown ────────────────────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Load test complete — agent: ${data.agentId}  tenant: ${data.tenantId}`);
}
