import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createStore } from "./store.js";
import { createRuntimeState, installRuntimeControls, operationalScorecard, runtimeMetrics } from "./runtime.js";
import { asyncRoute, errorHandler, notFound, requireObjectBody, requireRole } from "./http.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

export async function createApp(options = {}) {
  const dataFile = resolve(rootDir, options.dataFile || process.env.DATA_FILE || "./data/civic-aid.json");
  const store = await createStore(dataFile);
  const runtime = createRuntimeState("civic-aid-coordinator");
  const app = express();

  installRuntimeControls(app, runtime);
  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "civic-aid-coordinator", storage: process.env.MYSQL_URL ? "mysql-ready" : "local-json" });
  });
  app.get("/api/metrics/runtime", (_req, res) => res.json(runtimeMetrics(runtime)));
  app.get("/api/metrics/scorecard", (_req, res) => res.json(operationalScorecard(runtime)));
  app.get("/api/metrics", asyncRoute(async (_req, res) => res.json(await store.metrics())));
  app.get("/api/cases", asyncRoute(async (req, res) => res.json(await store.listCases(req.query))));
  app.get("/api/resources", asyncRoute(async (_req, res) => res.json(await store.resources())));
  app.get("/api/audit", asyncRoute(async (_req, res) => res.json(await store.auditLog())));

  app.post("/api/cases", asyncRoute(async (req, res) => {
    const role = requireRole(req, ["intake", "dispatcher", "admin"]);
    res.status(201).json(await store.createCase(requireObjectBody(req.body), role));
  }));

  app.post("/api/cases/:id/assignments", asyncRoute(async (req, res) => {
    const role = requireRole(req, ["dispatcher", "admin"]);
    res.json(await store.assignCase(req.params.id, requireObjectBody(req.body), role));
  }));

  app.patch("/api/cases/:id", asyncRoute(async (req, res) => {
    const role = requireRole(req, ["dispatcher", "admin"]);
    res.json(await store.updateCase(req.params.id, requireObjectBody(req.body), role));
  }));

  app.use("/api", notFound);
  app.use(express.static(join(rootDir, "dist")));
  app.get("*", (_req, res) => res.sendFile(join(rootDir, "dist", "index.html")));
  app.use(errorHandler("civic-aid-coordinator"));
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4510);
  const app = await createApp();
  app.listen(port, () => console.log(`Civic Aid Coordinator running on http://localhost:${port}`));
}
