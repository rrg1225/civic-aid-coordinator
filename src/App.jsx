import { useEffect, useState } from "react";

const initialCase = {
  requester: "",
  contact: "",
  neighborhood: "Riverside",
  needType: "Food",
  vulnerability: "",
  urgency: 6,
  notes: ""
};

export default function App() {
  const [role, setRole] = useState("dispatcher");
  const [cases, setCases] = useState([]);
  const [resources, setResources] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [audit, setAudit] = useState([]);
  const [query, setQuery] = useState("");
  const [needType, setNeedType] = useState("");
  const [form, setForm] = useState(initialCase);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (needType) params.set("needType", needType);
      const suffix = params.toString() ? `?${params}` : "";
      const [casesResponse, resourcesResponse, metricsResponse, auditResponse] = await Promise.all([
        fetch(`/api/cases${suffix}`),
        fetch("/api/resources"),
        fetch("/api/metrics"),
        fetch("/api/audit")
      ]);
      if (!casesResponse.ok || !resourcesResponse.ok || !metricsResponse.ok) throw new Error("API request failed");
      setCases(await casesResponse.json());
      setResources(await resourcesResponse.json());
      setMetrics(await metricsResponse.json());
      setAudit(await auditResponse.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [query, needType]);

  async function createCase(event) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-role": role },
      body: JSON.stringify(form)
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error?.message || "Create failed");
      return;
    }
    setForm(initialCase);
    await load();
  }

  async function assign(caseItem, resourceId) {
    const response = await fetch(`/api/cases/${caseItem.id}/assignments`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-role": role },
      body: JSON.stringify({ resourceId })
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error?.message || "Assignment failed");
      return;
    }
    await load();
  }

  async function resolveCase(caseItem) {
    const response = await fetch(`/api/cases/${caseItem.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-user-role": role },
      body: JSON.stringify({ status: "Resolved", notes: "Resolved by field team." })
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error?.message || "Update failed");
      return;
    }
    await load();
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Civic response operations</p>
          <h1>Civic Aid Coordinator</h1>
          <p>Coordinate urgent community aid requests, protect sensitive details, and match people with nearby capacity.</p>
        </div>
        <label className="role-picker">
          Role
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="viewer">viewer</option>
            <option value="intake">intake</option>
            <option value="dispatcher">dispatcher</option>
            <option value="admin">admin</option>
          </select>
        </label>
      </section>

      {error && <div className="alert">{error}</div>}

      <section className="metric-grid">
        <Metric label="Open cases" value={metrics?.openCases ?? "-"} />
        <Metric label="Critical" value={metrics?.criticalCases ?? "-"} />
        <Metric label="Available resources" value={metrics?.availableResources ?? "-"} />
        <Metric label="Total cases" value={metrics?.totalCases ?? "-"} />
      </section>

      <section className="workspace">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Priority queue</h2>
              <p>Redacted public case view sorted by triage risk.</p>
            </div>
            <div className="filters">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search neighborhood, need, notes..." />
              <select value={needType} onChange={(event) => setNeedType(event.target.value)}>
                <option value="">All needs</option>
                <option>Food</option>
                <option>Medication</option>
                <option>Shelter</option>
                <option>Transport</option>
              </select>
            </div>
          </div>

          {loading ? <p className="muted">Loading cases...</p> : cases.map((caseItem) => (
            <article key={caseItem.id} className="case-card">
              <div className="case-title">
                <span className={`band ${caseItem.priorityBand.toLowerCase()}`}>{caseItem.priorityBand}</span>
                <div>
                  <h3>{caseItem.needType} in {caseItem.neighborhood}</h3>
                  <p>{caseItem.vulnerability}</p>
                </div>
                <strong className="score">{caseItem.triageScore}</strong>
              </div>
              <p className="notes">{caseItem.notes}</p>
              <div className="meta">
                <span>{caseItem.status}</span>
                <span>{caseItem.requester}</span>
                <span>{caseItem.assignedTeam || "Unassigned"}</span>
              </div>
              <div className="actions">
                {caseItem.matches.map((match) => (
                  <button key={match.id} type="button" onClick={() => assign(caseItem, match.id)}>
                    Assign {match.name}
                  </button>
                ))}
                <button type="button" className="secondary" onClick={() => resolveCase(caseItem)}>Resolve</button>
              </div>
            </article>
          ))}
        </div>

        <aside className="panel">
          <h2>New intake</h2>
          <form className="form" onSubmit={createCase}>
            <label>Requester<input value={form.requester} onChange={(event) => setForm({ ...form, requester: event.target.value })} /></label>
            <label>Contact<input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></label>
            <label>Neighborhood<input value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} /></label>
            <label>Need<select value={form.needType} onChange={(event) => setForm({ ...form, needType: event.target.value })}>
              <option>Food</option>
              <option>Medication</option>
              <option>Shelter</option>
              <option>Transport</option>
            </select></label>
            <label>Vulnerability<input value={form.vulnerability} onChange={(event) => setForm({ ...form, vulnerability: event.target.value })} /></label>
            <label>Urgency<input type="number" min="1" max="10" value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value })} /></label>
            <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <button type="submit">Create protected case</button>
          </form>
        </aside>
      </section>

      <section className="lower-grid">
        <div className="panel">
          <h2>Resource capacity</h2>
          <div className="resource-list">
            {resources.map((resource) => (
              <div key={resource.id}>
                <strong>{resource.name}</strong>
                <span>{resource.type} · {resource.neighborhood} · {resource.available}/{resource.capacity}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Audit trail</h2>
          <div className="resource-list">
            {audit.slice(0, 6).map((entry) => (
              <div key={entry.id}>
                <strong>{entry.action}</strong>
                <span>{entry.actor} · {entry.target}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
