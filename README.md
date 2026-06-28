# Civic Aid Coordinator

[![CI](https://github.com/rrg1225/civic-aid-coordinator/actions/workflows/ci.yml/badge.svg)](https://github.com/rrg1225/civic-aid-coordinator/actions/workflows/ci.yml)
![Civic Tech](https://img.shields.io/badge/Civic%20Tech-Community%20Aid-1B6B4A)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-REST%20API-111827?logo=express)
![License](https://img.shields.io/badge/License-MIT-green)

Civic Aid Coordinator is a full-stack community aid dispatch platform. It helps nonprofits, neighborhood groups, and local governments triage vulnerable-neighbor requests, protect contact information, match nearby resource capacity, and audit response work.

## Social Pain Point

During heat waves, storms, fires, public-health disruptions, or everyday hardship, aid requests often arrive through phone calls, spreadsheets, chat groups, and handwritten notes. The result is duplicated work, missed follow-ups, and exposed personal information. This project turns that chaos into a privacy-aware response queue.

## Features

- Protected intake for food, medication, shelter, and transport requests.
- Triage scoring based on urgency, vulnerability, assignment state, and case status.
- Resource matching by need type, availability, and neighborhood proximity.
- Role-based actions: `viewer`, `intake`, `dispatcher`, `admin`.
- Redacted case-list responses to avoid exposing phone numbers or emails.
- Audit trail for creation, assignment, and resolution.
- Runtime metrics, operational scorecard, security headers, API tests, CI, and architecture docs.
- Optional deployment path for MySQL, Redis, and AI provider integration through environment variables.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API defaults to `http://localhost:4510`.

## Scripts

```bash
npm test
npm run build
npm run start
```

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Service health |
| `GET` | `/api/metrics` | Case and capacity metrics |
| `GET` | `/api/metrics/runtime` | Runtime request and status metrics |
| `GET` | `/api/metrics/scorecard` | Operational readiness score and checks |
| `GET` | `/api/cases` | Redacted, scored case queue |
| `POST` | `/api/cases` | Create protected intake, requires `intake`, `dispatcher`, or `admin` |
| `POST` | `/api/cases/:id/assignments` | Assign a resource, requires `dispatcher` or `admin` |
| `PATCH` | `/api/cases/:id` | Update status or notes |
| `GET` | `/api/resources` | Available aid resources |
| `GET` | `/api/audit` | Mutation audit trail |

## Quality Gates

- `npm test` covers redaction, RBAC, resource assignment, and security headers.
- `npm run build` verifies the production React bundle.
- GitHub Actions runs tests and build on pull requests and `main`.
- Architecture notes live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License

MIT

## Enterprise Readiness

This repository now includes contribution guidelines, a security policy, operational runbook notes, PR review gates, and automated readiness checks. See [docs/ENTERPRISE_READINESS.md](docs/ENTERPRISE_READINESS.md) and [docs/OPERATIONS.md](docs/OPERATIONS.md).
