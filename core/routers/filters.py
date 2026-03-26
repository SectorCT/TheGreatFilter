"""Filter generation endpoints.

POST /generate             — kick off background filter generation
GET  /{filterId}/status    — poll generation status
GET  /{filterId}           — full filter details
GET  /{filterId}/export    — download CSV
GET  /{filterId}/structure — molecular structure (xyz or sdf) for 3Dmol.js
"""

import asyncio
import io
import csv
import json
import logging
import math
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import StreamingResponse

from database import create_filter, get_filter, sync_update_filter_status
from models import GenerateRequest, FilterStatus, FilterDetails, FilterInfo, AtomPosition

logger = logging.getLogger("h2osim.filters")
router = APIRouter()


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_filter(req: GenerateRequest, request: Request):
    filter_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await create_filter(filter_id, req.measurementId, now)

    # Pass all measurement data directly — core does not read from shared DB
    measurement_data = {
        "temperature": req.temperature,
        "ph": req.ph,
        "params": [p.model_dump() for p in req.params],
    }

    logger.info("POST /generate — filter_id=%s measurement=%s temp=%.1f pH=%.1f params=%s",
                filter_id, req.measurementId, req.temperature, req.ph,
                [p.name for p in req.params])

    loop = asyncio.get_running_loop()
    executor = request.app.state.executor
    loop.run_in_executor(executor, run_generation, filter_id, req.measurementId, measurement_data)

    return {"filterId": filter_id, "status": "Pending"}


@router.get("/{filter_id}/status")
async def filter_status(filter_id: str):
    row = await get_filter(filter_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Filter not found")
    return FilterStatus(
        filterId=row["filter_id"],
        status=row["status"],
        updatedAt=row["updated_at"],
    )


@router.get("/{filter_id}")
async def filter_details(filter_id: str):
    row = await get_filter(filter_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Filter not found")

    filter_info = None
    if row["filter_info"]:
        info_data = json.loads(row["filter_info"])
        filter_info = FilterInfo(**info_data)

    return FilterDetails(
        filterId=row["filter_id"],
        measurementId=row["measurement_id"],
        status=row["status"],
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
        filterInfo=filter_info,
        errorMessage=row["error_message"],
    )


@router.get("/{filter_id}/export")
async def export_filter(filter_id: str, format: str = Query(default="csv")):
    row = await get_filter(filter_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Filter not found")
    if row["status"] != "Success":
        raise HTTPException(status_code=400, detail="Filter not yet generated")
    if not row["filter_info"]:
        raise HTTPException(status_code=400, detail="No filter data available")

    info = json.loads(row["filter_info"])
    csv_content = _build_csv(info)

    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="filter_{filter_id[:8]}.csv"'},
    )


@router.get("/{filter_id}/structure")
async def structure_filter(filter_id: str, format: str = Query(default="xyz")):
    """Return molecular structure for 3Dmol.js visualisation.

    format=xyz  — plain XYZ (default); load with viewer.addModel(text, 'xyz')
    format=sdf  — MDL Molfile V2000 with bond table; load with viewer.addModel(text, 'sdf')
    """
    row = await get_filter(filter_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Filter not found")
    if row["status"] != "Success":
        raise HTTPException(status_code=400, detail="Filter not yet generated")
    if not row["filter_info"]:
        raise HTTPException(status_code=400, detail="No filter data available")

    info = json.loads(row["filter_info"])
    fmt = format.lower().strip(".")

    if fmt == "sdf":
        content = _build_sdf(info, filter_id)
        media_type = "chemical/x-mdl-sdfile"
        filename = f"filter_{filter_id[:8]}.sdf"
    else:
        content = _build_xyz(info, filter_id)
        media_type = "chemical/x-xyz"
        filename = f"filter_{filter_id[:8]}.xyz"

    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ── Background generation (runs in ProcessPoolExecutor) ──────────────────────

def run_generation(filter_id: str, measurement_id: str, measurement_data: dict) -> None:
    """Synchronous function executed in a separate process.
    Imports heavy dependencies here to avoid pickle issues.

    measurement_data is passed in from the HTTP request — the core
    never reads measurement info from the DB.
    """
    import logging as _logging
    _logging.basicConfig(level=_logging.INFO,
                         format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    log = _logging.getLogger("h2osim.generation")

    now = lambda: datetime.now(timezone.utc).isoformat()

    try:
        sync_update_filter_status(filter_id, "Generating", now())
        log.info("[%s] Generation started", filter_id[:8])

        params = measurement_data.get("params", [])
        temperature = float(measurement_data.get("temperature", 25.0))
        ph = float(measurement_data.get("ph", 7.0))

        # Identify pollutant
        from services.pollutant_map import identify_pollutant
        pollutant_symbol, pollutant_charge, pollutant_desc = identify_pollutant(params)
        log.info("[%s] Pollutant identified: %s (%s), charge=%d",
                 filter_id[:8], pollutant_symbol, pollutant_desc, pollutant_charge)

        # Run genetic optimizer
        log.info("[%s] Starting genetic optimizer (pop=8, gen=3)…", filter_id[:8])
        from services.genetic_optimizer import optimize_filter
        result = optimize_filter(
            pollutant_symbol=pollutant_symbol,
            pollutant_charge=pollutant_charge,
            temperature=temperature,
            ph=ph,
        )
        log.info("[%s] GA complete — pore=%.4f nm, thickness=%.4f nm, "
                 "binding=%.6f eV, efficiency=%.2f%%, method=%s",
                 filter_id[:8], result["pore_size"], result["layer_thickness"],
                 result["binding_energy"], result["removal_efficiency"],
                 result["method"])

        # Generate atom positions and bonds for 3D visualization
        atom_positions, connections = generate_atom_positions(
            lattice_spacing=result["lattice_spacing"],
            material_type=result["material_type"],
        )

        filter_info = {
            "poreSize": result["pore_size"],
            "layerThickness": result["layer_thickness"],
            "latticeSpacing": result["lattice_spacing"],
            "materialType": result["material_type"],
            "bindingEnergy": result["binding_energy"],
            "removalEfficiency": result["removal_efficiency"],
            "pollutant": pollutant_desc,
            "pollutantSymbol": pollutant_symbol,
            "method": result.get("method", "hf"),
            "atomPositions": atom_positions,
            "connections": connections,
        }

        sync_update_filter_status(
            filter_id, "Success", now(),
            filter_info=json.dumps(filter_info),
        )
        log.info("[%s] Generation SUCCESS", filter_id[:8])

    except Exception as e:
        log.error("[%s] Generation FAILED: %s", filter_id[:8], e, exc_info=True)
        sync_update_filter_status(
            filter_id, "Failed", now(),
            error_message=str(e),
        )


# ── Atom position generation for 3D visualization ───────────────────────────

def generate_atom_positions(
    lattice_spacing: float,
    material_type: str,
) -> tuple[list[dict], list[dict]]:
    """Generate 3D atom coordinates and bonds for visualization.

    Returns:
        (atom_positions, connections)
        atom_positions — list of {id, x, y, z, element}
        connections    — list of {"from": int, "to": int, "order": int}
    """
    a = lattice_spacing  # angstroms

    if material_type == "cnt":
        raw = _generate_cnt_positions(a)
    else:
        raw = _generate_graphene_positions(a)

    positions: list[dict] = [dict(id=i, **p) for i, p in enumerate(raw)]

    # Compute bonds: k-NN (k=3) on all carbon atoms
    carbon_idx = [p["id"] for p in positions if p["element"] == "C"]
    bond_set: set[tuple[int, int]] = set()
    k = 3
    for i in carbon_idx:
        dists: list[tuple[float, int]] = []
        for j in carbon_idx:
            if i == j:
                continue
            dx = positions[i]["x"] - positions[j]["x"]
            dy = positions[i]["y"] - positions[j]["y"]
            dz = positions[i]["z"] - positions[j]["z"]
            dists.append((dx * dx + dy * dy + dz * dz, j))
        dists.sort()
        for _, j in dists[:k]:
            bond_set.add((min(i, j), max(i, j)))

    connections = [
        {"from": a, "to": b, "order": 1}
        for a, b in sorted(bond_set)
    ]

    return positions, connections


def _generate_graphene_positions(a: float) -> list[dict]:
    """Graphene patch: 5×3 hexagonal supercell = 30 C atoms.

    Uses the standard graphene primitive vectors:
      a1 = (a, 0),  a2 = (a/2, a√3/2)
    with two-atom basis at (0,0) and (a/2, a/(2√3)).
    """
    a2x = a * 0.5
    a2y = a * math.sqrt(3) / 2
    bx  = a / 2
    by  = a / (2 * math.sqrt(3))
    positions = []
    for n in range(5):
        for m in range(3):
            ox = n * a + m * a2x
            oy = m * a2y
            positions.append({"x": round(ox,      4), "y": round(oy,      4), "z": 0.0, "element": "C"})
            positions.append({"x": round(ox + bx, 4), "y": round(oy + by, 4), "z": 0.0, "element": "C"})
    return positions


def _generate_cnt_positions(a: float) -> list[dict]:
    """CNT segment: 5 rings × 12 C atoms = 60 atoms.

    Consecutive rings are spaced a/2 apart along z and rotated
    by half a step (π/12) to reproduce the armchair bond pattern.
    """
    N_RINGS    = 5
    N_PER_RING = 12
    radius     = a * 3 / (2 * math.pi)
    z_step     = a * 0.5
    positions  = []
    for ring in range(N_RINGS):
        angle_offset = (ring % 2) * (math.pi / N_PER_RING)
        z = round(ring * z_step, 4)
        for i in range(N_PER_RING):
            angle = 2 * math.pi * i / N_PER_RING + angle_offset
            positions.append({
                "x": round(radius * math.cos(angle), 4),
                "y": round(radius * math.sin(angle), 4),
                "z": z,
                "element": "C",
            })
    return positions


# ── Molecular structure builders ─────────────────────────────────────────────

def _build_xyz(info: dict, filter_id: str) -> str:
    """Build XYZ format string for 3Dmol.js.

    Line 1: atom count
    Line 2: metadata comment (parsed by nothing, but useful for debugging)
    Lines 3+: element  x  y  z
    """
    atoms = info.get("atomPositions", [])
    lines = [
        str(len(atoms)),
        (
            f"filter_id={filter_id} "
            f"material={info.get('materialType','')} "
            f"pollutant={info.get('pollutantSymbol','')} "
            f"pore={info.get('poreSize','')}nm "
            f"binding={info.get('bindingEnergy','')}eV "
            f"efficiency={info.get('removalEfficiency','')}%"
        ),
    ]
    for atom in atoms:
        lines.append(f"{atom['element']:2s}  {atom['x']:10.4f}  {atom['y']:10.4f}  {atom['z']:10.4f}")
    return "\n".join(lines) + "\n"


def _build_sdf(info: dict, filter_id: str) -> str:
    """Build MDL Molfile V2000 (SDF) for 3Dmol.js.

    Uses the pre-computed connections stored in filter_info.
    The pollutant atom (last in list) is intentionally left unbonded.
    """
    atoms = info.get("atomPositions", [])

    # connections use 0-based ids; SDF bond block is 1-based
    bonds = [
        (c["from"] + 1, c["to"] + 1, c.get("order", 1))
        for c in info.get("connections", [])
    ]

    na, nb = len(atoms), len(bonds)

    lines = [
        # Header block (3 lines)
        f"filter_{filter_id[:8]}",
        "  TheGreatFilter",
        (
            f" material={info.get('materialType','')} "
            f"pollutant={info.get('pollutantSymbol','')} "
            f"binding={info.get('bindingEnergy','')}eV"
        ),
        # Counts line
        f"{na:3d}{nb:3d}  0  0  0  0  0  0  0  0999 V2000",
    ]

    # Atom block
    for atom in atoms:
        lines.append(
            f"{atom['x']:10.4f}{atom['y']:10.4f}{atom['z']:10.4f} "
            f"{atom['element']:<3s} 0  0  0  0  0  0  0  0  0  0  0  0"
        )

    # Bond block
    for a1, a2, order in bonds:
        lines.append(f"{a1:3d}{a2:3d}{order:3d}  0  0  0  0")

    lines.append("M  END")
    lines.append("$$$$")
    return "\n".join(lines) + "\n"


# ── CSV export builder ───────────────────────────────────────────────────────

def _build_csv(info: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["Parameter", "Value", "Unit"])
    writer.writerow(["Pore Size", info["poreSize"], "nm"])
    writer.writerow(["Layer Thickness", info["layerThickness"], "nm"])
    writer.writerow(["Lattice Spacing", info["latticeSpacing"], "Å"])
    writer.writerow(["Material Type", info["materialType"], ""])
    writer.writerow(["Binding Energy", info["bindingEnergy"], "eV"])
    writer.writerow(["Removal Efficiency", info["removalEfficiency"], "%"])
    writer.writerow(["Pollutant", info["pollutant"], ""])
    writer.writerow(["Pollutant Symbol", info["pollutantSymbol"], ""])
    writer.writerow([])

    writer.writerow(["Atom Positions (Angstrom)"])
    writer.writerow(["ID", "Element", "X", "Y", "Z"])
    for atom in info.get("atomPositions", []):
        writer.writerow([atom["id"], atom["element"], atom["x"], atom["y"], atom["z"]])

    connections = info.get("connections", [])
    if connections:
        writer.writerow([])
        writer.writerow(["Bonds"])
        writer.writerow(["From", "To", "Order"])
        for c in connections:
            writer.writerow([c["from"], c["to"], c.get("order", 1)])

    return output.getvalue()
