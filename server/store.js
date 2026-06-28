import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { seedData } from "./seed.js";
import { ApiError } from "./http.js";
import { publicCaseView, redactSensitiveText } from "./privacy.js";

const VALID_STATUSES = new Set(["Open", "Assigned", "In Progress", "Resolved"]);

export function triageScore(item) {
  const urgency = clamp(item.urgency, 1, 10, 5) * 8;
  const vulnerability = /senior|child|disabled|medical|displaced|alone|fire/i.test(`${item.vulnerability} ${item.notes}`) ? 18 : 6;
  const unassigned = item.assignedTeam ? 0 : 12;
  const statusPressure = item.status === "Open" ? 10 : item.status === "Assigned" ? 5 : 0;
  return Math.min(100, urgency + vulnerability + unassigned + statusPressure);
}

export function priorityBand(item) {
  const score = triageScore(item);
  if (score >= 85) return "Critical";
  if (score >= 65) return "High";
  if (score >= 45) return "Moderate";
  return "Routine";
}

export function matchResources(item, resources) {
  return resources
    .filter((resource) => resource.type === item.needType && resource.available > 0)
    .map((resource) => ({
      ...resource,
      matchScore: (resource.neighborhood === item.neighborhood ? 30 : 10) + Math.min(resource.available, 10) * 4
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function enrichCase(item, resources) {
  return {
    ...publicCaseView(item),
    triageScore: triageScore(item),
    priorityBand: priorityBand(item),
    matches: matchResources(item, resources).slice(0, 3)
  };
}

export async function createStore(filePath) {
  async function ensureFile() {
    await mkdir(dirname(filePath), { recursive: true });
    try {
      await readFile(filePath, "utf8");
    } catch {
      await write(seedData);
    }
  }

  async function read() {
    await ensureFile();
    return JSON.parse(await readFile(filePath, "utf8"));
  }

  async function write(data) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2));
    return data;
  }

  function audit(data, actor, action, target, details = {}) {
    data.auditLog.unshift({ id: randomUUID(), at: new Date().toISOString(), actor, action, target, details });
    data.auditLog = data.auditLog.slice(0, 150);
  }

  return {
    async listCases(filters = {}) {
      const data = await read();
      const query = String(filters.q || "").trim().toLowerCase();
      return data.cases
        .filter((item) => !filters.status || item.status === filters.status)
        .filter((item) => !filters.needType || item.needType === filters.needType)
        .filter((item) => !query || [item.neighborhood, item.needType, item.vulnerability, item.notes].join(" ").toLowerCase().includes(query))
        .map((item) => enrichCase(item, data.resources))
        .sort((a, b) => b.triageScore - a.triageScore);
    },

    async resources() {
      return (await read()).resources;
    },

    async createCase(input, actor) {
      const needType = String(input.needType || "").trim();
      if (needType.length < 3) throw new ApiError(400, "invalid_case", "needType is required");
      const item = {
        id: `CASE-${randomUUID().slice(0, 8).toUpperCase()}`,
        requester: String(input.requester || "Anonymous").trim(),
        contact: String(input.contact || "").trim(),
        neighborhood: String(input.neighborhood || "Unknown").trim(),
        needType,
        vulnerability: String(input.vulnerability || "Needs assessment").trim(),
        urgency: clamp(input.urgency, 1, 10, 5),
        status: "Open",
        assignedTeam: "",
        notes: redactSensitiveText(input.notes || ""),
        createdAt: new Date().toISOString()
      };
      const data = await read();
      data.cases.push(item);
      audit(data, actor, "case.created", item.id, { needType: item.needType, neighborhood: item.neighborhood });
      await write(data);
      return enrichCase(item, data.resources);
    },

    async assignCase(id, input, actor) {
      const data = await read();
      const item = data.cases.find((entry) => entry.id === id);
      if (!item) throw new ApiError(404, "case_not_found", "case was not found");
      const resource = data.resources.find((entry) => entry.id === input.resourceId);
      if (!resource || resource.available <= 0) throw new ApiError(400, "resource_unavailable", "resource is not available");
      item.assignedTeam = resource.name;
      item.status = "Assigned";
      resource.available -= 1;
      audit(data, actor, "case.assigned", item.id, { resource: resource.name });
      await write(data);
      return enrichCase(item, data.resources);
    },

    async updateCase(id, patch, actor) {
      const data = await read();
      const item = data.cases.find((entry) => entry.id === id);
      if (!item) throw new ApiError(404, "case_not_found", "case was not found");
      if (patch.status && VALID_STATUSES.has(patch.status)) item.status = patch.status;
      if (patch.notes) item.notes = redactSensitiveText(`${item.notes}\n${patch.notes}`);
      audit(data, actor, "case.updated", item.id, { status: item.status });
      await write(data);
      return enrichCase(item, data.resources);
    },

    async metrics() {
      const data = await read();
      const enriched = data.cases.map((item) => enrichCase(item, data.resources));
      const activeCases = enriched.filter((item) => item.status !== "Resolved");
      const unavailableNeeds = activeCases.filter((item) => !data.resources.some((resource) => resource.type === item.needType && resource.available > 0));
      const totalCapacity = data.resources.reduce((sum, item) => sum + item.capacity, 0);
      const availableResources = data.resources.reduce((sum, item) => sum + item.available, 0);
      return {
        totalCases: enriched.length,
        criticalCases: enriched.filter((item) => item.priorityBand === "Critical").length,
        openCases: activeCases.length,
        unassignedCritical: activeCases.filter((item) => item.priorityBand === "Critical" && !item.assignedTeam).length,
        availableResources,
        capacityUtilization: totalCapacity ? Math.round(((totalCapacity - availableResources) / totalCapacity) * 100) : 0,
        coverageGaps: groupCount(unavailableNeeds, "needType"),
        byNeedType: groupCount(enriched, "needType"),
        byStatus: groupCount(enriched, "status"),
        topPriority: enriched.slice().sort((a, b) => b.triageScore - a.triageScore).slice(0, 5)
      };
    },

    async auditLog() {
      return (await read()).auditLog;
    }
  };
}

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function groupCount(items, field) {
  return items.reduce((result, item) => {
    result[item[field]] = (result[item[field]] || 0) + 1;
    return result;
  }, {});
}
