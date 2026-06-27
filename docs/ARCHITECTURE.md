# Civic Aid Coordinator Architecture

Civic Aid Coordinator is designed for community organizations, municipal volunteers, and nonprofit intake teams that need to coordinate aid without leaking sensitive resident data.

## Workflow

```text
resident intake
  -> privacy redaction
  -> triage score
  -> nearby resource match
  -> dispatcher assignment
  -> audit trail
  -> resolution
```

## Core Modules

| Path | Responsibility |
| --- | --- |
| `server/store.js` | Case persistence, triage scoring, resource matching, audit events |
| `server/privacy.js` | Public case redaction for contact details and notes |
| `server/index.js` | REST API, RBAC, static serving |
| `server/runtime.js` | Request IDs, security headers, runtime metrics |
| `src/App.jsx` | Intake, priority queue, resource assignment, audit UI |

## Real Deployment Path

- Replace JSON with MySQL using `MYSQL_URL`.
- Add Redis for dispatcher queue locks using `REDIS_URL`.
- Add SMS or email adapters only after consent and role checks.
- Keep public queue views redacted by default.

## Safety Notes

- This project is not an emergency services replacement.
- Sensitive contact data is hidden from normal case-list responses.
- Mutations require role headers in the demo and should map to real SSO groups in production.
