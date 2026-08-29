# JEEVAN — Architecture Reference

## System Diagram

```
┌─────────────────────┐         REST/JSON          ┌──────────────────────┐
│   React + Vite        │ ─────────────────────────► │   FastAPI Backend     │
│   (Frontend)           │ ◄───────────────────────── │   (Python)            │
│                         │                             │                        │
│ - Home/SOS screen        │                             │ - /api/emergencies    │
│ - Voice input              │                             │ - /api/responders     │
│ - Tracking screen (map)      │                             │ - /api/users          │
│ - Responder dashboard          │                             │ - AI classification    │
└─────────────────────┘                             │ - Matching algorithm   │
        │                                            └───────────┬────────────┘
        │ Web Speech API                                          │
        │ (browser-native)                                        │ SQLAlchemy ORM
        ▼                                                          ▼
   Speech → Text                                          ┌──────────────────┐
                                                            │  SQLite Database   │
                                                            │  jeevan.db          │
                                                            └──────────────────┘
                                                                     ▲
                                                            ┌──────────────────┐
                                                            │  Anthropic API      │
                                                            │  (optional) with     │
                                                            │  mock fallback        │
                                                            └──────────────────┘
```

## Key Architectural Decisions

| Decision | Why |
|---|---|
| Separate frontend/backend | Clean separation of concerns; FastAPI's auto-generated `/docs` doubles as a live demo tool for the viva |
| SQLite over Postgres/MySQL | Zero setup, single file, still real SQL with relationships — ideal for a prototype |
| FastAPI over Flask/Django | Auto docs, async support, Pydantic request/response validation "for free" |
| Deterministic AI mock fallback | The single most important reliability decision — the demo can never fail due to a missing/invalid API key or no internet |
| Leaflet + OpenStreetMap over Google Maps | Free, no billing/API key setup required |
| Web Speech API over a cloud STT service | Zero backend cost, works instantly in Chrome, has a graceful text fallback |
| No real authentication | Explicitly out of scope for a time-boxed prototype; the dashboard says so on-screen |

## Database Schema

```
users
─────
id               INTEGER PK
name             TEXT
phone            TEXT
blood_group      TEXT NULL
medical_notes    TEXT NULL
created_at       DATETIME

emergency_contacts
──────────────────
id               INTEGER PK
user_id          INTEGER FK → users.id
name             TEXT
phone            TEXT
relationship     TEXT   (Python attribute: relationship_type)

responders
──────────
id               INTEGER PK
name             TEXT
type             TEXT      -- Ambulance | First Responder | Hospital | Medical Volunteer
latitude         FLOAT
longitude        FLOAT
availability     TEXT      -- Available | Busy | Offline
capabilities     TEXT      -- comma-separated
contact          TEXT
estimated_speed  FLOAT     -- km/h, used for ETA

emergencies
───────────
id                     INTEGER PK
user_id                INTEGER FK → users.id (nullable)
description_text       TEXT
latitude               FLOAT
longitude              FLOAT
location_label         TEXT NULL
emergency_type         TEXT NULL   -- set by AI classifier
severity                TEXT NULL   -- Low | Moderate | Critical, set by AI classifier
ai_summary               TEXT NULL
assistance_required       TEXT NULL
indicators                 TEXT NULL  -- JSON array, stored as string
assigned_responder_id       INTEGER FK → responders.id NULL
status                       TEXT   -- Created | Assessed | ResponderAssigned | EnRoute | Resolved
created_at                    DATETIME

emergency_events
─────────────────
id               INTEGER PK
emergency_id     INTEGER FK → emergencies.id
event_type       TEXT   -- e.g. emergency_request_received, ai_assessment_completed, status_updated
description      TEXT
timestamp        DATETIME
```

**Relationships:** `users 1—N emergency_contacts`, `users 1—N
emergencies`, `emergencies N—1 responders` (assigned), `emergencies
1—N emergency_events` (this is what powers the tracking timeline).

## The Responder-Matching Algorithm

```
Score (0-100) = distance_factor (0-40)
              + availability_factor (0-30)
              + capability_factor (0-15)
              + severity_compatibility_factor (0-15)
```

- **distance_factor** = `max(0, 40 - distance_km × 3)` — closer scores higher
- **availability_factor** — Available=30, Busy=10, Offline=0
- **capability_factor** — fixed baseline per responder type (Ambulance
  highest, Medical Volunteer lowest — reflects general equipment level)
- **severity_compatibility_factor** — how well that TYPE suits THIS
  emergency's severity (e.g. Ambulance/Hospital score highest for
  Critical; First Responder/Medical Volunteer score highest for Low)

This is deliberately simple, traceable arithmetic — not a black-box
model — so every number in a match can be explained directly.

## Request Lifecycle: `POST /api/emergencies`

1. Save the emergency row (status: `Created`)
2. Log `emergency_request_received`, `location_obtained` events
3. Call the AI classifier (real or mock) → save `emergency_type`,
   `severity`, `ai_summary`, `assistance_required`, `indicators` →
   status becomes `Assessed`
4. Log `ai_assessment_completed`
5. Run the matching algorithm using the real AI-assessed severity →
   assign the top responder → status becomes `ResponderAssigned`
6. Log `responder_identified`, `responder_assigned` (or
   `no_responder_available`)
7. Simulate notifying the user's saved emergency contacts
8. Log one `emergency_contact_notified` event per contact (or
   `no_contacts_notified`)
9. Return the full emergency object, including nested responder and
   the complete event timeline

This event log is also what the Tracking screen's 7-stage timeline
reads from directly — no separate "progress" field was needed.
