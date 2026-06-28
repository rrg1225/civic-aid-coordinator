import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server/index.js";

async function startServer(dataFile) {
  const app = await createApp({ dataFile });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

test("lists redacted, scored aid cases with security headers", async (t) => {
  const tempDir = await mkdtemp(join(tmpdir(), "civic-aid-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const { server, baseUrl } = await startServer(join(tempDir, "data.json"));
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/cases`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  const cases = await response.json();
  assert.ok(cases[0].triageScore >= cases[1].triageScore);
  assert.match(cases.find((item) => item.id === "CASE-1001").notes, /redacted/);

  const metrics = await fetch(`${baseUrl}/api/metrics`);
  const metricBody = await metrics.json();
  assert.ok(metricBody.capacityUtilization >= 0);
  assert.ok("unassignedCritical" in metricBody);
});

test("enforces roles and assigns resources", async (t) => {
  const tempDir = await mkdtemp(join(tmpdir(), "civic-aid-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const { server, baseUrl } = await startServer(join(tempDir, "data.json"));
  t.after(() => server.close());

  const denied = await fetch(`${baseUrl}/api/cases`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-role": "viewer" },
    body: JSON.stringify({ needType: "Food" })
  });
  assert.equal(denied.status, 403);

  const created = await fetch(`${baseUrl}/api/cases`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-role": "intake" },
    body: JSON.stringify({
      requester: "Resident",
      contact: "resident@example.com",
      needType: "Food",
      neighborhood: "East Market",
      vulnerability: "Family with infant",
      urgency: 8
    })
  });
  assert.equal(created.status, 201);
  const item = await created.json();
  assert.equal(item.contact, "[redacted-contact]");

  const assigned = await fetch(`${baseUrl}/api/cases/${item.id}/assignments`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-role": "dispatcher" },
    body: JSON.stringify({ resourceId: "RES-2" })
  });
  assert.equal(assigned.status, 200);
  assert.equal((await assigned.json()).status, "Assigned");
});

test("exposes an operational scorecard", async (t) => {
  const tempDir = await mkdtemp(join(tmpdir(), "civic-aid-"));
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  const { server, baseUrl } = await startServer(join(tempDir, "data.json"));
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/metrics/scorecard`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.grade, "A");
  assert.ok(body.checks.some((check) => check.id === "security_headers"));
});
