# ElderGuard AI Connected Portals

This repo contains a FastAPI backend and React/Vite frontend for ElderGuard AI. The Elder Portal and Caregiver Portal now share one connected data layer for medicines, vitals, check-ins, appointments, SOS events, messages, notifications, and caregiver audit logs.

## Connected Data Flow

All elder-owned records carry an `elder_id`, so caregiver queries are scoped to one elder at a time. Caregiver access is granted only through `elder_caregiver_links` with `status = active`; pending invites do not expose elder data.

When a caregiver adds a medicine through `POST /api/caregiver/elders/{elderId}/medicines`, the backend writes the shared medicine row, records an audit log, creates an elder notification, and emits `medicine:added` to the WebSocket room `elder:{elderId}` via `/ws/elder/{elderId}`. The Elder app receives the event and invalidates React Query caches, so the new medicine appears without a page reload.

When an elder marks a dose taken through `POST /api/elder/medicines/{medicineId}/mark-taken`, the backend writes a `medicine_logs` row, notifies linked caregivers, and emits `medicine:taken` to the same room. Caregiver dashboards listening to that elder room refresh immediately.

The SOS path is fully server-side: `POST /api/elder/sos` writes `connected_sos_events`, records caregiver notification timing, inserts notifications for active linked caregivers, and emits `sos:triggered` to all connected elder/caregiver clients in the elder room.

## Local Run

Install dependencies:

```bash
npm install
npm --prefix frontend install
pip install -r backend/requirements.txt
```

Seed the connected demo:

```bash
cd backend
python seed_connected_demo.py
```

Start the full stack from the repo root:

```bash
npm run dev
```

Frontend: `http://127.0.0.1:5173`  
Backend: `http://127.0.0.1:8000`

Demo accounts:

```text
elder.demo@elderguard.ai / DemoPass123!
caregiver.demo@elderguard.ai / DemoPass123!
```

## Database

For local demos, the backend falls back to `backend/elderguard.db` if PostgreSQL is not configured. For PostgreSQL/Supabase, use the SQL migrations in `backend/supabase/migrations`, including `013_connected_portals.sql`.

## Validation

Run the connected portal integration tests:

```bash
cd backend
pytest test_connected_portals.py
```

These tests cover caregiver invite acceptance, active-link permission enforcement, caregiver-added medicine visibility in the elder endpoint, view-only write blocking, and SOS WebSocket delivery.
