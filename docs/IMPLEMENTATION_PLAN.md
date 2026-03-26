# H2O-Sim — Implementation Plan (Hack TUES 2026)

**Time budget:** 48 hours
**Team:** frontend + backend/quantum
**Goal:** Working prototype that demonstrates the full loop: auth → measurements → filter generation (quantum sim) → visualization

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Electron App                       │
│  ┌──────────────────────────────────────────────┐   │
│  │           React (Renderer Process)            │   │
│  │  react-router · TanStack Query · Tailwind     │   │
│  │  Three.js / 3Dmol.js (visualization)          │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │ IPC (contextBridge)                │
│  ┌──────────────▼───────────────────────────────┐   │
│  │           Main Process (Electron)             │   │
│  │  SQLite (local DB) · USB serial · File I/O    │   │
│  │  HTTP client → Python backend                 │   │
│  └──────────────┬───────────────────────────────┘   │
└─────────────────┼───────────────────────────────────┘
                  │ HTTP / WebSocket
┌─────────────────▼───────────────────────────────────┐
│              Python Backend (FastAPI)                │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │ Auth (JWT) │  │ Measurements│  │ Filter Gen   │ │
│  │            │  │ CRUD        │  │ Queue/Runner │ │
│  └────────────┘  └─────────────┘  └──────┬───────┘ │
│                                          │         │
│  ┌───────────────────────────────────────▼───────┐ │
│  │        Quantum Simulation Engine              │ │
│  │  Qiskit Aer · VQE · Genetic Algorithm / VAE   │ │
│  │  Qiskit Nature (molecular Hamiltonians)        │ │
│  └───────────────────────────────────────────────┘ │
│  SQLite / JSON file store                          │
└─────────────────────────────────────────────────────┘
```

### Key Technology Choices

| Layer | Tech | Why |
|-------|------|-----|
| Desktop shell | Electron 39 + electron-vite (already scaffolded) | Requirement |
| UI framework | React 19 + TypeScript | Already in scaffold |
| Routing | react-router v7 | SPA routing for `/auth`, `/dashboard`, `/filters/:id` etc. |
| Styling | Tailwind CSS 4 | Fast prototyping, no design system needed |
| State / data fetching | TanStack Query v5 | Polling for filter status, cache management |
| 3D visualization | Three.js + @react-three/fiber OR 3Dmol.js | Molecular / filter visualization |
| Map | Leaflet + react-leaflet | GemStat map view |
| Backend | Python FastAPI | Bridges quantum libs (Qiskit) naturally |
| Quantum engine | Qiskit Aer + Qiskit Nature | Local quantum simulator; VQE for binding energy |
| AI design | Genetic Algorithm (DEAP library) | Simpler than VAE for hackathon; evolves filter geometries |
| Auth | JWT (PyJWT) | Lightweight, stateless |
| Database | SQLite (both sides) | Zero-config, single-file, portable |
| USB serial | serialport (npm) via Electron main process | Lab equipment communication |

---

## Sprint Plan (4 Sprints × ~12h)

### Sprint 0 — Foundation (Hours 0–6)

| # | Story | Points | Owner |
|---|-------|--------|-------|
| S0.1 | Project bootstrap: add dependencies, configure Tailwind, react-router, TanStack Query in client | 2 | FE |
| S0.2 | Set up Python backend scaffold: FastAPI, SQLite, project structure, CORS | 2 | BE |
| S0.3 | Define shared types: Measurement, Filter, Auth DTOs in TypeScript + Pydantic | 1 | Both |
| S0.4 | Electron IPC bridge: expose `api.fetch()` via contextBridge so renderer can call backend | 2 | FE |
| S0.5 | Set up basic app layout shell (sidebar/nav + router outlet) | 1 | FE |

**Exit criteria:** `npm run dev` opens the app with working routing; `uvicorn` serves the API; both can talk to each other.

---

### Sprint 1 — Auth + Dashboard + Manual Measurement (Hours 6–18)

| # | Story | Points | Owner |
|---|-------|--------|-------|
| S1.1 | **Auth backend**: `POST /auth/signup`, `POST /auth/login` with JWT | 2 | BE |
| S1.2 | **Auth UI**: Login/Signup page at `/auth`, token storage, redirect to `/dashboard` | 3 | FE |
| S1.3 | **Dashboard page**: list filters (with status badges) + list measurements | 3 | FE |
| S1.4 | **Dashboard backend**: `GET /measurements` (user's), `GET /filters` (user's with status) | 2 | BE |
| S1.5 | **Manual measurement UI**: form at `/measurements/new/manual` with Temperature + pH required, optional advanced params | 2 | FE |
| S1.6 | **Create measurement backend**: `POST /measurements` endpoint, stores to SQLite | 2 | BE |
| S1.7 | **CSV import UI**: file picker at `/measurements/import/csv`, parse CSV client-side, preview, send to `POST /measurements` with `source=csv_import` | 3 | FE |

**Exit criteria:** User can sign up, log in, see empty dashboard, add a manual measurement, import from CSV, see measurements listed.

---

### Sprint 2 — Filter Generation + Quantum Engine (Hours 18–30)

| # | Story | Points | Owner |
|---|-------|--------|-------|
| S2.1 | **Quantum engine MVP**: Python module that takes measurement params → runs VQE on a simplified molecular model (6 C atoms + 1 pollutant) → returns filter geometry (pore size, thickness, binding energy) | 8 | BE |
| S2.2 | **Genetic algorithm layer**: DEAP-based optimizer that proposes filter geometries, scores them via VQE binding energy, evolves for N generations | 5 | BE |
| S2.3 | **Filter generation backend**: `POST /filters/generate` → queues job, `GET /filters/{id}/status` → returns status, `GET /filters/{id}` → returns result | 3 | BE |
| S2.4 | **Generate filter UI**: "Generate Filter" button on dashboard, create pending filter card, poll status via TanStack Query `refetchInterval` | 3 | FE |
| S2.5 | **Filter details page**: `/filters/{filterId}` — show status, and on Success show filter info (pore size, layer thickness, binding energy, material composition) | 3 | FE |

**Exit criteria:** User selects a measurement → clicks Generate → sees Pending/Generating → filter completes with real quantum-computed results → user opens details page.

---

### Sprint 3 — Visualization + Map + Export + Polish (Hours 30–42)

| # | Story | Points | Owner |
|---|-------|--------|-------|
| S3.1 | **3D filter visualization**: Three.js/3Dmol component on filter details page — render the filter lattice structure, pollutant molecule, binding interaction | 5 | FE |
| S3.2 | **CSV export**: `GET /filters/{id}/export?format=csv` → download filter data as CSV | 2 | BE+FE |
| S3.3 | **GemStat map page**: Leaflet map at `/measurements/map` with hardcoded measurement centers, click to select → create measurement | 3 | FE |
| S3.4 | **GemStat backend**: `GET /gemstat/snapshots?locationId=X&date=Y` with bundled sample dataset | 2 | BE |
| S3.5 | **Lab equipment USB stub**: `/measurements/new/lab-equipment` page with simulated device connection (reads from a mock serial payload) | 2 | FE |
| S3.6 | **Dashboard polish**: sorting/filtering by status/date, empty states, loading skeletons | 2 | FE |

**Exit criteria:** Full demo loop works end-to-end. 3D visualization renders. Export downloads. Map works with sample data.

---

### Sprint 4 — Demo Prep + Hardening (Hours 42–48)

| # | Story | Points | Owner |
|---|-------|--------|-------|
| S4.1 | End-to-end happy-path testing + bug fixes | 3 | Both |
| S4.2 | Demo script preparation: pre-seeded data, rehearsed flow | 1 | Both |
| S4.3 | README + architecture diagram for judges | 1 | Both |
| S4.4 | Build production Electron package (`npm run build:linux` / `build:win`) | 1 | FE |

---

## Detailed Story Specifications

### S0.1 — Client Bootstrap

**Goal:** Make the Electron app ready for feature development.

**Tasks:**
1. Install dependencies:
   ```
   npm i react-router tailwindcss @tailwindcss/vite postcss
   npm i @tanstack/react-query
   npm i three @react-three/fiber @react-three/drei  # for Sprint 3
   npm i leaflet react-leaflet @types/leaflet         # for Sprint 3
   npm i papaparse @types/papaparse                   # CSV parsing
   ```
2. Configure Tailwind (CSS import in `main.css`)
3. Set up react-router with route definitions:
   - `/auth` → AuthPage
   - `/dashboard` → DashboardPage
   - `/measurements/new/manual` → ManualMeasurementPage
   - `/measurements/new/lab-equipment` → LabEquipmentPage
   - `/measurements/map` → GemStatMapPage
   - `/measurements/import/csv` → CsvImportPage
   - `/filters/:filterId` → FilterDetailsPage
4. Set up TanStack QueryClient provider
5. Create a minimal layout component (nav bar + `<Outlet />`)

**Acceptance:** App boots, routes render placeholder pages.

---

### S0.2 — Backend Scaffold

**Goal:** Python backend ready to receive requests.

**Tasks:**
1. Create `/server` directory with:
   ```
   server/
   ├── main.py              # FastAPI app, CORS, lifespan
   ├── database.py           # SQLite setup, tables
   ├── models.py             # Pydantic models
   ├── routers/
   │   ├── auth.py
   │   ├── measurements.py
   │   ├── filters.py
   │   └── gemstat.py
   ├── services/
   │   ├── quantum_engine.py # VQE simulation
   │   └── genetic_optimizer.py
   ├── requirements.txt
   └── README.md
   ```
2. SQLite tables: `users`, `measurements`, `measurement_params`, `filters`
3. CORS allow `http://localhost:5173` (Vite dev server)
4. Health check endpoint `GET /health`

**Acceptance:** `uvicorn server.main:app --reload` starts, `GET /health` returns 200.

---

### S0.3 — Shared Types

**TypeScript types** (`client/src/renderer/src/types/`):
```typescript
// measurement.ts
interface Measurement {
  measurementId: string
  source: 'manual' | 'lab_equipment' | 'gemstat' | 'csv_import'
  createdAt: string
  temperature: number
  ph: number
  parameters: MeasurementParam[]
}

interface MeasurementParam {
  parameterCode: string
  parameterName: string
  unit: string
  value: number
}

// filter.ts
interface Filter {
  filterId: string
  measurementId: string
  createdAt: string
  status: 'Pending' | 'Generating' | 'Success' | 'Failed'
}

interface FilterDetails extends Filter {
  status: 'Success'
  filterInfo: FilterInfo
}

interface FilterInfo {
  poreSize: number          // nanometers
  layerThickness: number    // nanometers
  bindingEnergy: number     // eV
  materialType: string      // e.g. "graphene", "CNT"
  latticeSpacing: number    // angstroms
  atomPositions: [number, number, number][]  // 3D coordinates for visualization
  pollutantType: string
  removalEfficiency: number // 0-100%
}

// auth.ts
interface AuthResponse {
  token: string
  user: { userId: string; email: string }
}
```

**Pydantic models** (`server/models.py`): mirror the above.

---

### S0.4 — Electron IPC Bridge

**Goal:** Renderer can call the Python backend via a clean API.

**Implementation:**
- In `preload/index.ts`: expose `window.api.fetch(method, path, body?)` via `contextBridge`
- In `main/index.ts`: handle the IPC call, make HTTP request to `http://localhost:8000` (FastAPI)
- The renderer never touches `fetch` directly — all calls go through IPC

```typescript
// preload/index.ts
contextBridge.exposeInMainWorld('api', {
  request: (method: string, path: string, body?: unknown) =>
    ipcRenderer.invoke('api-request', { method, path, body })
})
```

```typescript
// main/index.ts
ipcMain.handle('api-request', async (_event, { method, path, body }) => {
  const res = await fetch(`http://localhost:8000${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json() }
})
```

---

### S1.1 — Auth Backend

**Endpoints:**
- `POST /auth/signup` — hash password (bcrypt), store user, return JWT
- `POST /auth/login` — verify password, return JWT

**JWT payload:** `{ userId, email, exp }`
**Dependencies:** `PyJWT`, `bcrypt`

---

### S1.2 — Auth UI

**Page:** `/auth`
- Tab toggle: Login / Sign Up
- Fields: email, password (+ confirm password for signup)
- Error states: invalid credentials, network error, email taken
- On success: store token in localStorage/sessionStorage, navigate to `/dashboard`
- Route guard: if token exists and is valid, redirect `/auth` → `/dashboard`

---

### S1.3 + S1.4 — Dashboard

**Page:** `/dashboard`
- **Filters section:** card grid or table
  - Each card: filter ID (short), date, status badge (color-coded)
  - Status colors: Pending=yellow, Generating=blue-pulse, Success=green, Failed=red
  - Click → navigate to `/filters/{filterId}`
- **Measurements section:** table
  - Columns: source icon, temperature, pH, # params, date
  - Select row → enables "Generate Filter" button
- **Actions bar:**
  - "Generate Filter" (disabled until measurement selected)
  - "+ Add Measurement" dropdown: Manual, Lab Equipment, Map, Import CSV
- **Data fetching:** TanStack Query with `refetchInterval: 5000` for filters (to catch status changes)

---

### S1.5 — Manual Measurement Form

**Page:** `/measurements/new/manual`
- Temperature input (number, required, unit: °C)
- pH input (number, required, range: 0–14)
- "Add Parameter" button → dynamic rows: code, name, unit, value
- Submit → `POST /measurements` with `source: "manual"` → redirect to `/dashboard`
- Inline validation: required fields highlighted, range checks

---

### S1.7 — CSV Import

**Page:** `/measurements/import/csv`
- File picker (`.csv` files only)
- Client-side parsing with `papaparse`
- Preview table showing parsed rows
- Validation: check for `temperature` and `ph` columns
- Map CSV columns to measurement parameters
- Submit → `POST /measurements` with `source: "csv_import"` → redirect to `/dashboard`

---

### S2.1 — Quantum Engine MVP

**This is the core differentiator of the project.**

**Module:** `server/services/quantum_engine.py`

**What it does:**
1. Takes a pollutant type (derived from measurement — e.g., heavy metals like Pb²⁺, or organic contaminants based on parameters present)
2. Builds a molecular Hamiltonian for the filter-pollutant interaction using Qiskit Nature
3. Runs VQE (Variational Quantum Eigensolver) on Qiskit Aer simulator to find ground-state energy
4. Returns binding energy — higher binding = more effective filtration

**Simplified model for hackathon:**
- Filter material: graphene sheet (6 carbon atoms in hexagonal arrangement)
- Pollutant: single ion/molecule (e.g., Pb²⁺, Cl⁻, or simplified organic molecule)
- Use STO-3G basis set (minimal, fast)
- VQE with UCCSD ansatz or simpler EfficientSU2

**Output:**
```python
{
  "binding_energy": -2.34,      # eV
  "optimal_pore_size": 0.78,    # nm
  "layer_thickness": 1.2,       # nm
  "atom_positions": [[x,y,z], ...],
  "removal_efficiency": 87.3    # %
}
```

**Key implementation details:**
```python
from qiskit_nature.second_q.drivers import PySCFDriver
from qiskit_nature.second_q.mappers import JordanWignerMapper
from qiskit_algorithms import VQE
from qiskit_aer import AerSimulator

def simulate_binding(filter_geometry, pollutant):
    # 1. Define molecular system (filter + pollutant)
    driver = PySCFDriver(atom=build_molecule_string(filter_geometry, pollutant),
                         basis="sto-3g")
    problem = driver.run()

    # 2. Map to qubit Hamiltonian
    mapper = JordanWignerMapper()
    qubit_op = mapper.map(problem.second_q_ops())

    # 3. Run VQE
    backend = AerSimulator()
    vqe = VQE(ansatz=EfficientSU2(qubit_op.num_qubits),
              optimizer=COBYLA(),
              quantum_instance=backend)
    result = vqe.compute_minimum_eigenvalue(qubit_op)

    return result.eigenvalue  # ground state energy = binding energy proxy
```

---

### S2.2 — Genetic Algorithm Optimizer

**Module:** `server/services/genetic_optimizer.py`

**What it does:**
1. Uses DEAP to evolve filter design parameters
2. Each "individual" = `[pore_size, layer_thickness, lattice_spacing, material_type_index]`
3. Fitness function = call `quantum_engine.simulate_binding()` for each candidate
4. Run for N generations (N=5–10 for hackathon speed)
5. Return best individual

**For hackathon speed:**
- Population size: 6–10
- Generations: 3–5
- Mutation rate: 0.3
- Crossover: two-point

**This means ~30–50 VQE calls total.** Each takes ~2–10 seconds on Aer simulator → total generation time ~1–5 minutes. This is why we need the async polling flow.

---

### S2.3 — Filter Generation Backend

**Endpoints:**
- `POST /filters/generate` — accepts `measurementId`, creates filter record with `Pending`, kicks off background task (Python `asyncio.create_task` or `threading`)
- `GET /filters/{filterId}/status` — returns current status
- `GET /filters/{filterId}` — returns full details (only when Success)

**Background task flow:**
1. Set status → `Generating`
2. Fetch measurement from DB
3. Derive pollutant profile from measurement parameters
4. Run genetic optimizer (which calls quantum engine)
5. Store results in DB
6. Set status → `Success` (or `Failed` on error)

---

### S2.4 — Generate Filter UI

**On Dashboard:**
- Select a measurement row
- Click "Generate Filter"
- POST to `/filters/generate`
- Immediately add the new filter to the list with `Pending` badge
- TanStack Query polls `/filters/{filterId}/status` every 5 seconds
- When `Success`: badge turns green, row becomes clickable

---

### S2.5 — Filter Details Page

**Page:** `/filters/:filterId`
- Fetch filter via `GET /filters/{filterId}`
- **While Pending/Generating:** show a progress indicator with status text
- **On Success:**
  - Summary cards: pore size, layer thickness, binding energy, removal efficiency, material type
  - Visualization area (placeholder until S3.1)
  - "Export CSV" button
  - "Back to Dashboard" link
- **On Failed:** error message + "Retry" button

---

### S3.1 — 3D Filter Visualization

**Component:** `FilterVisualization.tsx` using `@react-three/fiber`

**What to render:**
1. **Filter lattice:** carbon atom positions from `filterInfo.atomPositions` rendered as spheres connected by bonds (lines/cylinders)
2. **Pollutant molecule:** rendered in a different color, positioned near the filter surface
3. **Binding interaction:** visual indicator (glowing region, force field lines) between pollutant and filter surface
4. **Controls:** OrbitControls for rotation/zoom, labels for key measurements

**Visual enhancements:**
- Color coding: C atoms = dark gray, pollutant = red/orange
- Semi-transparent filter surface mesh
- Binding energy displayed as a floating label
- Animated "capture" sequence (optional, time permitting)

---

### S3.2 — CSV Export

**Backend:** `GET /filters/{filterId}/export?format=csv`
- Generate CSV with columns: `parameter, value, unit`
- Include: pore_size, layer_thickness, binding_energy, removal_efficiency, material_type, lattice_spacing
- Include atom positions as rows: `atom_1_x, atom_1_y, atom_1_z`
- Return with `Content-Type: text/csv` + `Content-Disposition: attachment`

**Frontend:** trigger download via IPC bridge → save dialog

---

### S3.3 + S3.4 — GemStat Map

**Page:** `/measurements/map`
- Leaflet map centered on Europe/global
- Hardcoded ~10–20 measurement centers with coordinates + sample data
- Click marker → popup with location name + available dates
- Select date → fetch snapshot → preview measurement values
- "Use This Measurement" → `POST /measurements` with `source: "gemstat"` → redirect to dashboard

**Backend:** `GET /gemstat/snapshots` returns sample data from a bundled JSON file (no real GemStat API for hackathon).

---

### S3.5 — Lab Equipment USB (Stub)

**Page:** `/measurements/new/lab-equipment`
- Simulated device connection flow:
  1. "Connect Device" button → show "Scanning..." → "Connected to H2O-Probe v1.0"
  2. "Read Data" → show progress → display measurement preview
  3. "Save Measurement" → `POST /measurements` with `source: "lab_equipment"`
- For hackathon: read from a mock JSON payload (no real USB required, but the `serialport` package can be wired up if actual hardware is available)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| VQE too slow for demo | Pre-compute 2–3 filter results, cache them; run live for 1 demo scenario only |
| Qiskit install issues | Have a fallback "mock quantum" mode that returns plausible pre-computed results |
| 3D viz complexity | Start with simple sphere-and-stick model; add polish only if time permits |
| Backend not ready for frontend | Frontend uses mock API responses (local JSON) until backend catches up |
| GemStat API unavailable | Already planned: use bundled sample dataset, no external API dependency |

---

## Demo Script (Suggested)

1. **Open app** → show login screen
2. **Sign up** → land on empty dashboard
3. **Manual measurement** → enter Temperature=22°C, pH=7.2, add Lead (Pb) parameter=0.05mg/L
4. **Generate filter** → show Pending → Generating (explain quantum simulation is running)
5. **While waiting** → show map, pick a location, import measurement
6. **Filter completes** → open details → show 3D visualization of graphene filter with lead ion interaction
7. **Explain** binding energy, removal efficiency
8. **Export CSV** → show downloaded file
9. **Key message:** "We used quantum computing to design a water filter optimized for this specific contamination profile"

---

## Dependencies to Install

### Client (npm)
```bash
npm i react-router @tanstack/react-query
npm i tailwindcss @tailwindcss/vite
npm i three @react-three/fiber @react-three/drei @types/three
npm i leaflet react-leaflet @types/leaflet
npm i papaparse @types/papaparse
npm i lucide-react                    # icons
```

### Server (pip)
```bash
pip install fastapi uvicorn[standard]
pip install pyjwt bcrypt
pip install qiskit qiskit-aer qiskit-nature
pip install pyscf                      # molecular driver
pip install deap                       # genetic algorithm
pip install aiosqlite                  # async SQLite
```

---

## File Structure Target

```
TheGreatFilter/
├── client/                            # Electron app (exists)
│   └── src/
│       ├── main/index.ts              # Electron main + IPC handlers
│       ├── preload/index.ts           # contextBridge API
│       └── renderer/src/
│           ├── main.tsx               # React entry
│           ├── App.tsx                # Router + QueryClient
│           ├── types/                 # Shared TS types
│           │   ├── measurement.ts
│           │   ├── filter.ts
│           │   └── auth.ts
│           ├── pages/
│           │   ├── AuthPage.tsx
│           │   ├── DashboardPage.tsx
│           │   ├── ManualMeasurementPage.tsx
│           │   ├── LabEquipmentPage.tsx
│           │   ├── GemStatMapPage.tsx
│           │   ├── CsvImportPage.tsx
│           │   └── FilterDetailsPage.tsx
│           ├── components/
│           │   ├── Layout.tsx
│           │   ├── FilterCard.tsx
│           │   ├── MeasurementTable.tsx
│           │   ├── FilterVisualization.tsx
│           │   ├── StatusBadge.tsx
│           │   └── MapView.tsx
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   ├── useFilters.ts
│           │   └── useMeasurements.ts
│           └── lib/
│               └── api.ts             # Typed API client wrapper
├── server/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── auth.py                        # JWT utils
│   ├── routers/
│   │   ├── auth.py
│   │   ├── measurements.py
│   │   ├── filters.py
│   │   └── gemstat.py
│   ├── services/
│   │   ├── quantum_engine.py
│   │   └── genetic_optimizer.py
│   ├── data/
│   │   └── gemstat_samples.json       # Bundled sample data
│   └── requirements.txt
└── docs/                              # (exists)
```

---

## What to Build First (Priority Order)

If time runs short, cut from the bottom:

1. **Must have:** Auth + Dashboard + Manual Measurement + Filter Generation (with mock quantum fallback) + Filter Details
2. **Should have:** Real quantum engine (VQE), 3D visualization, CSV export
3. **Nice to have:** GemStat map, Lab equipment USB, Dashboard polish, animated visualization
