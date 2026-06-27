import { randomUUID } from "node:crypto";

export function createRuntimeState(serviceName) {
  return {
    serviceName,
    startedAt: new Date().toISOString(),
    requests: 0,
    errors: 0,
    byStatus: {}
  };
}

export function installRuntimeControls(app, state) {
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.requestId = req.get("x-request-id") || randomUUID();
    res.setHeader("x-request-id", req.requestId);
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'");
    next();
  });
  app.use((req, res, next) => {
    state.requests += 1;
    res.on("finish", () => {
      const status = String(res.statusCode);
      state.byStatus[status] = (state.byStatus[status] || 0) + 1;
      if (res.statusCode >= 500) state.errors += 1;
    });
    next();
  });
}

export function runtimeMetrics(state) {
  return {
    service: state.serviceName,
    startedAt: state.startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    requests: state.requests,
    errors: state.errors,
    byStatus: state.byStatus
  };
}
