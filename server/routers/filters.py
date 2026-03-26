"""Filter generation endpoints.

POST /generate          — kick off background filter generation
GET  /{filterId}/status — poll generation status
GET  /{filterId}        — full filter details
GET  /{filterId}/export — download CSV
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

    loop = asyncio.get_event_loop()
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

        # Generate atom positions for 3D visualization
        atom_positions = generate_atom_positions(
            lattice_spacing=result["lattice_spacing"],
            material_type=result["material_type"],
            pollutant_symbol=pollutant_symbol,
            pore_size=result["pore_size"],
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
            "atomPositions": atom_positions,
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
    pollutant_symbol: str,
    pore_size: float,
) -> list[dict]:
    """Generate 3D atom coordinates for visualization.

    Convention: last atom in the list is the pollutant.
    """
    a = lattice_spacing  # angstroms
    positions = []

    if material_type == "cnt":
        positions = _generate_cnt_positions(a)
    else:
        positions = _generate_graphene_positions(a)

    # Place pollutant above center at pore_size distance
    pollutant_z = pore_size * 10.0  # nm → angstrom
    positions.append({
        "x": round(0.0, 4),
        "y": round(0.0, 4),
        "z": round(pollutant_z, 4),
        "element": pollutant_symbol,
    })

    return positions


def _generate_graphene_positions(a: float) -> list[dict]:
    """Generate two rings of carbon atoms in a hexagonal graphene sheet.

    Inner ring: 6 atoms at distance a from center.
    Outer ring: 6 atoms at distance 2a from center.
    """
    positions = []

    # Inner hexagonal ring
    for i in range(6):
        angle = math.pi / 3 * i
        x = a * math.cos(angle)
        y = a * math.sin(angle)
        positions.append({"x": round(x, 4), "y": round(y, 4), "z": 0.0, "element": "C"})

    # Outer hexagonal ring (rotated 30°)
    for i in range(6):
        angle = math.pi / 3 * i + math.pi / 6
        x = 2 * a * math.cos(angle)
        y = 2 * a * math.sin(angle)
        positions.append({"x": round(x, 4), "y": round(y, 4), "z": 0.0, "element": "C"})

    return positions


def _generate_cnt_positions(a: float) -> list[dict]:
    """Generate 12 carbon atoms around a cylinder (carbon nanotube cross-section)."""
    positions = []
    radius = a * 3 / (2 * math.pi)  # approximate CNT radius from lattice spacing

    for i in range(12):
        angle = 2 * math.pi * i / 12
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        # Alternate z positions slightly for tube structure
        z = (i % 2) * a * 0.5
        positions.append({
            "x": round(x, 4),
            "y": round(y, 4),
            "z": round(z, 4),
            "element": "C",
        })

    return positions


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
    writer.writerow(["Index", "Element", "X", "Y", "Z"])
    for i, atom in enumerate(info.get("atomPositions", [])):
        writer.writerow([
            i + 1,
            atom["element"],
            atom["x"],
            atom["y"],
            atom["z"],
        ])

    return output.getvalue()
