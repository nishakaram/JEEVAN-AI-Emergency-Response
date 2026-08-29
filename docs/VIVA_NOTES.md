# JEEVAN — Viva Preparation Notes

For every major module: what it does, how to explain it, and questions
a teacher might ask. Read this alongside a working demo — explaining a
concept right after showing it working sticks better than reading cold.

---

## 1. REST APIs (general concept)

**What this does:** the frontend and backend are two separate programs
that talk over HTTP using JSON. The frontend sends a request (e.g.
"create this emergency"), the backend responds with data.

**How to explain in viva:** *"REST means each request is stateless and
targets a resource via a URL and an HTTP method — POST to create,
GET to read, PATCH to update. My frontend never touches the database
directly; it only ever talks to the backend's REST API."*

**Likely questions:**
- *What does REST stand for, and what makes an API "RESTful"?* —
  Representational State Transfer; resources identified by URLs,
  standard HTTP verbs, stateless requests.
- *Why not have the frontend query the database directly?* — Security
  (no DB credentials in the browser), validation, and business logic
  all live in one place (the backend).

---

## 2. FastAPI

**What this does:** the Python web framework that defines all of
JEEVAN's API endpoints, validates incoming data (via Pydantic
schemas), and auto-generates interactive documentation at `/docs`.

**How to explain in viva:** *"I used FastAPI because it validates
request/response shapes automatically using Pydantic — if a client
sends bad data, FastAPI rejects it before my code even runs, and I get
free interactive API docs, which I actually used throughout
development to test endpoints."*

**Likely questions:**
- *How does FastAPI know what shape a request should be?* — Pydantic
  models declared as function parameters (e.g. `schemas.EmergencyCreate`).
- *What's `Depends(get_db)`?* — FastAPI's dependency injection: it
  calls `get_db()` before the route runs, hands the route a database
  session, and runs the cleanup code after the response is built.

---

## 3. React frontend ↔ backend communication

**What this does:** React components call `api/client.js` functions
(built on `axios`), which send HTTP requests to `http://localhost:8000`
and return the parsed JSON response.

**How to explain in viva:** *"Every API call goes through one shared
axios instance in `client.js`, so the base URL and timeout are
configured in one place. Components just call e.g. `createEmergency(payload)`
and get a plain JS object back — they don't know or care that it's HTTP
underneath."*

**Likely questions:**
- *What is CORS, and why did you need it?* — Browsers block requests
  to a different origin (port) than the page was served from by
  default; `app.add_middleware(CORSMiddleware, ...)` in `main.py`
  explicitly allows `localhost:5173` to call `localhost:8000`.
- *How does the frontend handle a slow/failed request?* — Loading
  states (`STAGES.SUBMITTING`) and try/catch blocks that set an error
  state instead of crashing.

---

## 4. SQLite & SQLAlchemy

**What this does:** SQLite stores all data in a single file
(`database/jeevan.db`). SQLAlchemy is the ORM (Object-Relational
Mapper) that lets Python classes (`models.py`) represent database
tables, so I write Python instead of raw SQL for most operations.

**How to explain in viva:** *"Each class in models.py — like
`Emergency` — maps to a table. `db.add(emergency)` and `db.commit()`
translate to an INSERT statement behind the scenes. I chose SQLite
because it needs zero setup and is still a real relational database
with foreign keys and joins."*

**Likely questions:**
- *What's the difference between `db.commit()` and `db.flush()`?* —
  `flush()` sends pending changes to the database within the current
  transaction (visible to later queries in that transaction) without
  ending it; `commit()` flushes AND permanently ends the transaction.
- *Why SQLite instead of Postgres for a "real" system?* — SQLite is
  fine for a single-file prototype; a production system would need
  Postgres/MySQL for concurrent writes and multi-server deployment.

---

## 5. Database Relationships

**What this does:** `users`, `emergency_contacts`, `responders`,
`emergencies`, `emergency_events` are linked with foreign keys — see
`docs/ARCHITECTURE.md` for the full schema.

**How to explain in viva:** *"A user has many emergency contacts and
many emergencies (one-to-many). An emergency has at most one assigned
responder. An emergency has many events — that event log is literally
what the tracking timeline reads from, so I didn't need a separate
'progress' field."*

**Likely questions:**
- *What's a foreign key?* — A column that references another table's
  primary key, enforcing that the referenced row exists.
- *Why store events as a separate table instead of a status field
  history?* — An append-only log is simpler to reason about, never
  loses history, and naturally powers a UI timeline.

---

## 6. GPS / Geolocation

**What this does:** `useGeolocation.js` wraps the browser's
`navigator.geolocation.getCurrentPosition()` API. If permission is
denied or the API is unsupported, it falls back to a fixed demo
location (Jaipur) so the app still works.

**How to explain in viva:** *"Geolocation is asynchronous and requires
explicit user permission, so I handle three outcomes — success,
denied, unsupported — and never leave the user stuck waiting. The
fallback is what makes the whole demo possible without needing real
GPS hardware or being physically present at the demo location."*

**Likely questions:**
- *Does this work over plain HTTP?* — Only on `localhost`; browsers
  require HTTPS for geolocation on any other origin.
- *What accuracy does this give?* — Whatever the device provides
  (GPS, Wi-Fi triangulation, or IP-based) — I don't control or improve
  on browser-reported accuracy.

---

## 7. Haversine Distance & ETA

**What this does:** `geo.py`'s `haversine_distance_km()` computes the
great-circle distance between two lat/long points, treating Earth as a
sphere. `estimate_eta_minutes()` divides that by a responder's speed.

**How to explain in viva:** *"Haversine gives straight-line ('as the
crow flies') distance, not road distance — it's a reasonable
approximation for ranking responders by proximity, but I label the ETA
as illustrative because real routing would need an actual mapping/
routing API, which was out of scope for this prototype."*

**Likely questions:**
- *Why not simple Euclidean distance on lat/long?* — Lat/long are
  angles on a sphere, not a flat plane — Euclidean distance on raw
  coordinates is inaccurate, especially over longer distances or at
  different latitudes.
- *What would you need to get real driving ETAs?* — A routing engine/
  API (e.g. OSRM, Google Directions) that accounts for the actual road
  network and traffic.

---

## 8. Responder Ranking / Matching Algorithm

**What this does:** see the full breakdown in `docs/ARCHITECTURE.md` —
a transparent 0-100 score from four weighted factors: distance,
availability, capability, and severity-compatibility.

**How to explain in viva:** *"I didn't just pick the nearest responder
— a busy or under-equipped unit that's very close shouldn't
automatically beat an available, well-equipped one slightly farther
away. Every factor and its weight is a simple, explainable rule, not a
trained model, so I can justify any specific match."*

**Likely questions:**
- *How would you tune these weights with real data?* — Collect
  outcomes (actual response times, patient outcomes) and adjust
  weights, or replace the linear formula with a learned model once
  there's enough labeled data.
- *What happens if no responders are available?* — The endpoint
  returns `no_responder_available` and logs that as an event instead
  of crashing.

---

## 9. NLP / LLM-based Classification

**What this does:** `ai_classifier.py` sends the emergency description
to Claude via the Anthropic API with a strict prompt requesting
structured JSON. If no API key is set, or the call fails for *any*
reason, a deterministic keyword-based classifier takes over instantly.

**How to explain in viva:** *"The mock fallback isn't a lesser
afterthought — it's the reliability backbone of the whole project. A
prototype that only works with a valid, paid API key and a live
internet connection isn't demoable. Both paths return the exact same
JSON shape, so nothing downstream needs to know which one ran."*

**Likely questions:**
- *How do you handle a malformed AI response?* — `_sanitize()`
  validates every field against an allowed set and substitutes safe
  defaults for anything missing or invalid — it can never crash the
  request or store garbage.
- *Isn't this just keyword matching in the fallback — how is that
  "AI"?* — Correct, the fallback is intentionally simple/deterministic;
  the *real* AI (LLM) path is the primary one when a key is available.
  Being upfront about this distinction is itself a good viva answer.

---

## 10. Speech-to-Text (Voice Input)

**What this does:** `useSpeechRecognition.js` wraps the browser's
`SpeechRecognition`/`webkitSpeechRecognition` API. Live transcript
streams into the description textarea as the user speaks; it remains
fully editable afterward.

**How to explain in viva:** *"I used the browser's built-in Web Speech
API instead of a cloud speech service — free, instant, no backend
round-trip. Browsers that don't support it (like Firefox) get a
graceful text-only fallback instead of a broken button."*

**Likely questions:**
- *Does this send audio to a server?* — No — recognition happens
  client-side/via the browser vendor's own service; JEEVAN's backend
  never sees or stores audio.
- *What if the transcription is wrong?* — The text stays editable
  after recognition stops, so the user can correct it before submitting.

---

## 11. JSON

**What this does:** the data format for every request/response between
frontend and backend, and how `indicators` (a list) is stored inside a
single SQLite `TEXT` column (`json.dumps`/`JSON.parse`).

**How to explain in viva:** *"JSON is just structured key-value text
that both Python and JavaScript can read/write natively. I store the
indicators list as a JSON string in one column rather than a separate
table, since it's small and always read/written as a whole with its
parent emergency."*

**Likely questions:**
- *Why not a separate table for indicators?* — Would be more
  "properly" normalized, but is unnecessary overhead for a small,
  always-together list in a prototype.

---

## 12. Authentication Basics

**What this does:** JEEVAN has **no real authentication**. The
responder dashboard is open by design. "Profile" is just a locally
saved user id in `localStorage`, not a login.

**How to explain in viva:** *"Real authentication (password hashing,
sessions/JWTs, role-based access) was explicitly out of scope for a
time-boxed prototype — the brief prioritized a working, reliable core
demo over infrastructure. In a production version, the dashboard would
require responder login and the profile page would need real
authentication instead of a client-side id."*

**Likely questions:**
- *How would you add real auth?* — Password hashing (e.g. bcrypt),
  JWT or session-based login, `Depends()`-based auth checks on
  protected routes, and role checks (responder vs. regular user).
- *Isn't storing a raw user id in localStorage insecure?* — Yes, for
  the same reason — it's fine for a demo where nothing sensitive is
  actually being protected, not for a real deployment.

---

## Quick Reference: File → Concept

| File | Concept |
|---|---|
| `app/main.py` | FastAPI app, CORS |
| `app/database.py` | SQLAlchemy engine/session |
| `app/models.py` | ORM models, relationships |
| `app/schemas.py` | Pydantic request/response validation |
| `app/routers/*.py` | REST endpoints |
| `app/services/geo.py` | Haversine distance, ETA |
| `app/services/matching.py` | Responder scoring algorithm |
| `app/services/ai_classifier.py` | LLM classification + mock fallback |
| `app/services/notification.py` | Simulated contact notification |
| `frontend/src/hooks/useGeolocation.js` | Browser GPS API |
| `frontend/src/hooks/useSpeechRecognition.js` | Browser speech-to-text |
| `frontend/src/api/client.js` | Frontend↔backend HTTP calls |
| `frontend/src/pages/*.jsx` | React Router pages |
