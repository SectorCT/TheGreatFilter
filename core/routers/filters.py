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
        "use_quantum_computer": req.useQuantumComputer,
    }

    logger.info(
        "POST /generate — filter_id=%s measurement=%s temp=%.1f pH=%.1f use_quantum=%s params=%s",
        filter_id,
        req.measurementId,
        req.temperature,
        req.ph,
        req.useQuantumComputer,
        [p.name for p in req.params],
    )

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
        use_quantum_computer = bool(measurement_data.get("use_quantum_computer", False))

        # Identify all target pollutants (sorted by concentration)
        from services.pollutant_map import identify_all_pollutants
        pollutants = identify_all_pollutants(params)
        log.info("[%s] Identified %d pollutant(s): %s",
                 filter_id[:8], len(pollutants),
                 [(s, d) for s, _, d, _ in pollutants])

        execution_target = "ibm_quantum" if use_quantum_computer else "simulator"
        from services.genetic_optimizer import optimize_filter

        # ── Generate one layer per pollutant ──────────────────────────────
        layers = []
        all_atoms: list[dict] = []
        all_connections: list[tuple] = []
        z_offset = 0.0
        # Gap between stacked layers (Å) — van der Waals spacing
        _INTERLAYER_GAP = 3.4

        for layer_idx, (p_symbol, p_charge, p_desc, p_value) in enumerate(pollutants):
            log.info("[%s] Layer %d/%d: optimizing for %s (%s)",
                     filter_id[:8], layer_idx + 1, len(pollutants), p_symbol, p_desc)

            result = optimize_filter(
                pollutant_symbol=p_symbol,
                pollutant_charge=p_charge,
                temperature=temperature,
                ph=ph,
                use_quantum_computer=use_quantum_computer,
            )
            log.info("[%s] Layer %d GA complete — pore=%.4f nm, thickness=%.4f nm, "
                     "binding=%.6f eV, efficiency=%.2f%%, method=%s",
                     filter_id[:8], layer_idx + 1,
                     result["pore_size"], result["layer_thickness"],
                     result["binding_energy"], result["removal_efficiency"],
                     result["method"])

            atom_positions, connections = generate_atom_positions(
                lattice_spacing=result["lattice_spacing"],
                material_type=result["material_type"],
                pollutant_symbol=p_symbol,
                functionalization_density=result.get("functionalization_density", 0.6),
                doping_level=result.get("doping_level", 0.15),
            )

            # Offset atom z-coordinates and re-index ids for stacking
            id_offset = len(all_atoms)
            for atom in atom_positions:
                all_atoms.append({
                    "id": atom["id"] + id_offset,
                    "x": atom["x"],
                    "y": atom["y"],
                    "z": atom["z"] + z_offset,
                    "element": atom["element"],
                })
            for conn in connections:
                all_connections.append((
                    conn["from"] + id_offset,
                    conn["to"] + id_offset,
                    conn.get("order", 1),
                ))

            # Compute z extent of this layer for the next offset
            if atom_positions:
                max_z = max(a["z"] for a in atom_positions)
            else:
                max_z = result["layer_thickness"] * 10  # nm → Å
            z_offset += max_z + _INTERLAYER_GAP

            layers.append({
                "pollutant": p_desc,
                "pollutantSymbol": p_symbol,
                "poreSize": result["pore_size"],
                "layerThickness": result["layer_thickness"],
                "latticeSpacing": result["lattice_spacing"],
                "materialType": result["material_type"],
                "bindingEnergy": result["binding_energy"],
                "removalEfficiency": result["removal_efficiency"],
                "method": result.get("method", "hf"),
                "atomPositions": [
                    a for a in all_atoms[id_offset:]
                ],
                "connections": [
                    {"from": f, "to": t, "order": o}
                    for f, t, o in all_connections[len(all_connections) - len(connections):]
                ],
            })

        # ── Aggregate metrics from all layers ─────────────────────────────
        # Primary layer = first (highest concentration) for top-level fields
        primary = layers[0]

        # Combined removal efficiency: 1 - product(1 - eff_i/100) for each layer
        combined_efficiency = 1.0
        for layer in layers:
            combined_efficiency *= (1.0 - layer["removalEfficiency"] / 100.0)
        combined_efficiency = round((1.0 - combined_efficiency) * 100.0, 2)

        # Average binding energy across layers
        avg_binding = round(
            sum(l["bindingEnergy"] for l in layers) / len(layers), 6
        )

        # Determine overall method — if any layer used vqe_ibm, flag it
        methods = [l["method"] for l in layers]
        overall_method = "vqe_ibm" if "vqe_ibm" in methods else (
            "vqe" if "vqe" in methods else "hf"
        )

        # Total layer thickness = sum of individual thicknesses
        total_thickness = round(sum(l["layerThickness"] for l in layers), 4)

        stacked_connections = [
            {"from": f, "to": t, "order": o}
            for f, t, o in sorted(all_connections)
        ]

        filter_info = {
            "poreSize": primary["poreSize"],
            "layerThickness": total_thickness,
            "latticeSpacing": primary["latticeSpacing"],
            "materialType": primary["materialType"],
            "bindingEnergy": avg_binding,
            "removalEfficiency": combined_efficiency,
            "pollutant": primary["pollutant"],
            "pollutantSymbol": primary["pollutantSymbol"],
            "method": overall_method,
            "executionTarget": execution_target,
            "usedQuantumComputer": overall_method == "vqe_ibm",
            "atomPositions": all_atoms,
            "connections": stacked_connections,
            "layers": layers,
        }

        sync_update_filter_status(
            filter_id, "Success", now(),
            filter_info=json.dumps(filter_info),
        )
        log.info("[%s] Generation SUCCESS — %d layer(s), combined efficiency=%.2f%%",
                 filter_id[:8], len(layers), combined_efficiency)

    except Exception as e:
        log.error("[%s] Generation FAILED: %s", filter_id[:8], e, exc_info=True)
        sync_update_filter_status(
            filter_id, "Failed", now(),
            error_message=str(e),
        )


# ── Atom position generation for 3D visualization ───────────────────────────

# C-C bond length derived from graphene lattice constant:  a / sqrt(3)
# (lattice_spacing here is the lattice constant, 2.46 Å by default)
_SQRT3 = math.sqrt(3)

# Pollutants that favour carboxyl chelation (heavy metals / transition metals)
# Stored UPPERCASE so comparisons can use .upper() without case mismatch.
_HEAVY_METALS = {
    "PB", "CD", "HG", "CU", "NI", "ZN", "FE", "CO", "CR", "MN",
    "AS", "SN", "SB", "BA", "SR", "BI", "V",
}
# Pollutants that favour amine groups (anionic / nitrogen-based)
_ANION_POLLUTANTS = {"F", "CL", "BR", "N", "P", "S", "SE"}


def generate_atom_positions(
    lattice_spacing: float,
    material_type: str,
    pollutant_symbol: str = "C",
    functionalization_density: float = 0.6,
    doping_level: float = 0.15,
) -> tuple[list[dict], list[dict]]:
    """Generate 3D atom coordinates and bonds for visualization.

    Args:
        lattice_spacing:           graphene lattice constant in Å (2.46)
        material_type:             one of graphene | cnt | graphene_oxide |
                                   composite | mof_like
        pollutant_symbol:          drives which functional groups dominate
        functionalization_density: fraction of edge atoms that receive a
                                   functional group (0-1), for oxide/composite
        doping_level:              fraction of C replaced by pyridinic N,
                                   for oxide/composite

    Returns:
        (atom_positions, connections)
        atom_positions — list of {id, x, y, z, element}
        connections    — list of {"from": int, "to": int, "order": int}
    """
    a = lattice_spacing

    if material_type == "cnt":
        raw, bonds = _generate_cnt(a)
    elif material_type == "graphene_oxide":
        raw, bonds = _generate_graphene_oxide(
            a, pollutant_symbol, functionalization_density, doping_level
        )
    elif material_type == "composite":
        raw, bonds = _generate_composite(
            a, pollutant_symbol, functionalization_density, doping_level
        )
    elif material_type == "mof_like":
        raw, bonds = _generate_mof(a, pollutant_symbol)
    else:  # "graphene" default
        raw, bonds = _generate_graphene(a)

    positions: list[dict] = [dict(id=i, **p) for i, p in enumerate(raw)]
    connections = [
        {"from": fr, "to": to, "order": order}
        for fr, to, order in sorted(bonds)
    ]
    return positions, connections


# ── Bond helpers ─────────────────────────────────────────────────────────────

def _cc_bond(a: float) -> float:
    """C-C bond length for a graphene lattice with constant a."""
    return a / _SQRT3


def _compute_bonds_by_distance(
    atoms: list[dict],
    threshold_sq: float,
    allowed_elements: set | None = None,
) -> list[tuple]:
    """Return (i, j, order=1) pairs where atoms i,j are within sqrt(threshold_sq).

    Only considers atoms whose element is in allowed_elements (all if None).
    Uses the atom list index as the id.
    """
    bonds = []
    n = len(atoms)
    for i in range(n):
        if allowed_elements and atoms[i]["element"] not in allowed_elements:
            continue
        for j in range(i + 1, n):
            if allowed_elements and atoms[j]["element"] not in allowed_elements:
                continue
            dx = atoms[i]["x"] - atoms[j]["x"]
            dy = atoms[i]["y"] - atoms[j]["y"]
            dz = atoms[i]["z"] - atoms[j]["z"]
            if dx * dx + dy * dy + dz * dz <= threshold_sq:
                bonds.append((i, j, 1))
    return bonds


def _assign_kekule_orders(
    atoms: list[dict], bonds: list[tuple]
) -> list[tuple]:
    """Assign alternating double bonds (Kekulé structure) to a graphene lattice.

    Uses BFS to 2-colour the bipartite honeycomb graph (sublattice A / B),
    then greedily assigns order=2 to one A-B bond per atom.

    Only C-C and C-N bonds in the aromatic lattice are upgraded.
    Bonds to/from functional group atoms (H, O, metals) are left as order=1.
    """
    from collections import deque

    aromatic = {"C", "N"}
    n = len(atoms)

    # Build adjacency for aromatic atoms only
    adj: dict[int, list[int]] = {i: [] for i in range(n)
                                  if atoms[i]["element"] in aromatic}
    for i, j, _ in bonds:
        if i in adj and j in adj:
            adj[i].append(j)
            adj[j].append(i)

    # BFS 2-colouring
    colour: dict[int, int] = {}
    for start in adj:
        if start in colour:
            continue
        queue = deque([start])
        colour[start] = 0
        while queue:
            node = queue.popleft()
            for nb in adj[node]:
                if nb not in colour:
                    colour[nb] = 1 - colour[node]
                    queue.append(nb)

    # Greedy Kekulé: upgrade one A→B bond per atom, neither endpoint yet doubled
    doubled: set[int] = set()
    bond_order: dict[tuple[int, int], int] = {(i, j): 1 for i, j, _ in bonds}

    for i, j, _ in bonds:
        if (colour.get(i) == 0 and colour.get(j) == 1
                and i not in doubled and j not in doubled
                and atoms[i]["element"] in aromatic
                and atoms[j]["element"] in aromatic):
            bond_order[(i, j)] = 2
            doubled.add(i)
            doubled.add(j)

    return [(i, j, bond_order[(i, j)]) for i, j, _ in bonds]


def _find_edge_atoms(
    atoms: list[dict], bonds: list[tuple], element: str = "C"
) -> set:
    """Return indices of atoms of given element with fewer than 3 bonds."""
    degree: dict = {}
    for i, p in enumerate(atoms):
        if p["element"] == element:
            degree[i] = 0
    for i, j, _ in bonds:
        if i in degree:
            degree[i] = degree.get(i, 0) + 1
        if j in degree:
            degree[j] = degree.get(j, 0) + 1
    return {idx for idx, deg in degree.items() if deg < 3}


# ── Functional group attachment ───────────────────────────────────────────────

def _group_preference(pollutant_symbol: str) -> str:
    """Select dominant functional group based on pollutant chemistry."""
    sym = pollutant_symbol.upper() if pollutant_symbol else "C"
    sym = sym[:2].rstrip("0123456789+-")
    if sym in _HEAVY_METALS:
        return "cooh"   # carboxyl chelates heavy metals
    if sym in _ANION_POLLUTANTS:
        return "nh2"    # amine captures anions
    return "oh"         # hydroxyl is the safe default


def _add_functional_groups(
    atoms: list[dict],
    bonds: list[tuple],
    edge_indices: set,
    cc_bond: float,
    pollutant_symbol: str,
    density: float,
    rng,
) -> tuple[list[dict], list[tuple]]:
    """Attach functional groups to a subset of edge carbon atoms.

    Groups added (selected probabilistically per edge atom):
      -OH   (hydroxyl):  O above the plane + H further out
      -COOH (carboxyl):  C=O + O-H chain sticking out from edge
      -NH2  (amine):     N + 2H sticking out from edge
      epoxide: in-plane O bridging two adjacent carbons

    Returns updated (atoms, bonds) with new atoms appended.
    """
    pref = _group_preference(pollutant_symbol)
    if pref == "cooh":
        weights = [0.15, 0.55, 0.15, 0.15]
    elif pref == "nh2":
        weights = [0.20, 0.10, 0.55, 0.15]
    else:
        weights = [0.50, 0.20, 0.15, 0.15]

    group_names = ["oh", "cooh", "nh2", "epoxide"]

    bond_co = 1.43
    bond_oh = 0.96
    bond_cn = 1.47
    bond_nh = 1.01
    bond_cc_func = 1.52

    new_atoms = list(atoms)
    new_bonds = list(bonds)

    candidates = sorted(edge_indices)
    edge_set = set(candidates)
    edge_pairs_used: set = set()

    for idx in candidates:
        if rng.random() > density:
            continue

        group = rng.choices(group_names, weights=weights, k=1)[0]
        ax, ay, az = atoms[idx]["x"], atoms[idx]["y"], atoms[idx]["z"]

        neighbours = [
            j for (i, j, _) in new_bonds if i == idx
        ] + [i for (i, j, _) in new_bonds if j == idx]
        if neighbours:
            nx2 = sum(new_atoms[n]["x"] for n in neighbours) / len(neighbours)
            ny2 = sum(new_atoms[n]["y"] for n in neighbours) / len(neighbours)
            nz2 = sum(new_atoms[n]["z"] for n in neighbours) / len(neighbours)
            dx, dy, dz = ax - nx2, ay - ny2, az - nz2
            length = math.sqrt(dx * dx + dy * dy + dz * dz) or 1.0
            dx, dy, dz = dx / length, dy / length, dz / length
        else:
            dx, dy, dz = 1.0, 0.0, 0.0

        if group == "oh":
            # Tilt OH group 30° out of the graphene plane so the bond length
            # stays exactly bond_co (1.43 Å) rather than sqrt(1.43²+0.5²).
            _TILT = math.pi / 6  # 30 degrees
            _cos_t, _sin_t = math.cos(_TILT), math.sin(_TILT)
            odx, ody, odz = dx * _cos_t, dy * _cos_t, _sin_t
            oi = len(new_atoms)
            new_atoms.append({
                "x": round(ax + odx * bond_co, 4),
                "y": round(ay + ody * bond_co, 4),
                "z": round(az + odz * bond_co, 4),
                "element": "O",
            })
            hi = len(new_atoms)
            new_atoms.append({
                "x": round(ax + odx * (bond_co + bond_oh), 4),
                "y": round(ay + ody * (bond_co + bond_oh), 4),
                "z": round(az + odz * (bond_co + bond_oh), 4),
                "element": "H",
            })
            new_bonds.append((idx, oi, 1))
            new_bonds.append((oi, hi, 1))

        elif group == "cooh":
            ci = len(new_atoms)
            new_atoms.append({
                "x": round(ax + dx * bond_cc_func, 4),
                "y": round(ay + dy * bond_cc_func, 4),
                "z": round(az + dz * bond_cc_func, 4),
                "element": "C",
            })
            new_bonds.append((idx, ci, 1))

            o1i = len(new_atoms)
            new_atoms.append({
                "x": round(ax + dx * bond_cc_func + dy * 1.20, 4),
                "y": round(ay + dy * bond_cc_func - dx * 1.20, 4),
                "z": round(az + 0.3, 4),
                "element": "O",
            })
            new_bonds.append((ci, o1i, 2))

            o2i = len(new_atoms)
            new_atoms.append({
                "x": round(ax + dx * (bond_cc_func + bond_co), 4),
                "y": round(ay + dy * (bond_cc_func + bond_co), 4),
                "z": round(az - 0.3, 4),
                "element": "O",
            })
            hi = len(new_atoms)
            new_atoms.append({
                "x": round(ax + dx * (bond_cc_func + bond_co + bond_oh), 4),
                "y": round(ay + dy * (bond_cc_func + bond_co + bond_oh), 4),
                "z": round(az - 0.5, 4),
                "element": "H",
            })
            new_bonds.append((ci, o2i, 1))
            new_bonds.append((o2i, hi, 1))

        elif group == "nh2":
            ni = len(new_atoms)
            new_atoms.append({
                "x": round(ax + dx * bond_cn, 4),
                "y": round(ay + dy * bond_cn, 4),
                "z": round(az + dz * bond_cn + 0.2, 4),
                "element": "N",
            })
            new_bonds.append((idx, ni, 1))

            perp_x, perp_y = -dy, dx
            for sign in (+1, -1):
                # Build raw 3D direction then normalize before scaling by bond_nh
                raw_dx = dx * 0.3 + sign * perp_x * 0.5
                raw_dy = dy * 0.3 + sign * perp_y * 0.5
                raw_dz = 0.3
                mag = math.sqrt(raw_dx ** 2 + raw_dy ** 2 + raw_dz ** 2) or 1.0
                hx = new_atoms[ni]["x"] + (raw_dx / mag) * bond_nh
                hy = new_atoms[ni]["y"] + (raw_dy / mag) * bond_nh
                hz = new_atoms[ni]["z"] + (raw_dz / mag) * bond_nh
                hi2 = len(new_atoms)
                new_atoms.append({
                    "x": round(hx, 4), "y": round(hy, 4),
                    "z": round(hz, 4), "element": "H",
                })
                new_bonds.append((ni, hi2, 1))

        elif group == "epoxide":
            adj_edge = [
                j for (i, j, _) in new_bonds
                if i == idx and j in edge_set and frozenset({idx, j}) not in edge_pairs_used
            ] + [
                i for (i, j, _) in new_bonds
                if j == idx and i in edge_set and frozenset({idx, i}) not in edge_pairs_used
            ]
            if adj_edge:
                partner = adj_edge[0]
                edge_pairs_used.add(frozenset({idx, partner}))
                bx2 = (new_atoms[idx]["x"] + new_atoms[partner]["x"]) / 2
                by2 = (new_atoms[idx]["y"] + new_atoms[partner]["y"]) / 2
                bz2 = new_atoms[idx]["z"] + 1.0
                oi = len(new_atoms)
                new_atoms.append({
                    "x": round(bx2, 4), "y": round(by2, 4),
                    "z": round(bz2, 4), "element": "O",
                })
                new_bonds.append((idx, oi, 1))
                new_bonds.append((partner, oi, 1))

    # H-capping pass: saturate any C or N atom that still has valency < 3.
    # This covers edge atoms that were skipped by the density roll above.
    # Degree map is built once (O(b)) and updated incrementally to avoid
    # rescanning the full bond list on every iteration (was O(n * b)).
    bond_ch = 1.08  # sp2 C-H bond length
    cap_elements = {"C", "N"}
    degree_map: dict[int, int] = {i: 0 for i in range(len(new_atoms))}
    neighbour_map: dict[int, list[int]] = {i: [] for i in range(len(new_atoms))}
    for i, j, _ in new_bonds:
        degree_map[i] += 1
        degree_map[j] += 1
        neighbour_map[i].append(j)
        neighbour_map[j].append(i)

    for idx, atom in enumerate(new_atoms):
        if atom["element"] not in cap_elements:
            continue
        while degree_map[idx] < 3:
            neighbours = neighbour_map[idx]
            if neighbours:
                nx2 = sum(new_atoms[n]["x"] for n in neighbours) / len(neighbours)
                ny2 = sum(new_atoms[n]["y"] for n in neighbours) / len(neighbours)
                nz2 = sum(new_atoms[n]["z"] for n in neighbours) / len(neighbours)
                ddx = atom["x"] - nx2
                ddy = atom["y"] - ny2
                ddz = atom["z"] - nz2
                mag = math.sqrt(ddx ** 2 + ddy ** 2 + ddz ** 2) or 1.0
                ddx, ddy, ddz = ddx / mag, ddy / mag, ddz / mag
            else:
                ddx, ddy, ddz = 1.0, 0.0, 0.0
            hi = len(new_atoms)
            new_atoms.append({
                "x": round(atom["x"] + ddx * bond_ch, 4),
                "y": round(atom["y"] + ddy * bond_ch, 4),
                "z": round(atom["z"] + ddz * bond_ch, 4),
                "element": "H",
            })
            new_bonds.append((idx, hi, 1))
            degree_map[hi] = 1
            degree_map[idx] += 1
            neighbour_map[idx].append(hi)
            neighbour_map[hi] = [idx]

    return new_atoms, new_bonds


# ── Graphene sheet (base) ─────────────────────────────────────────────────────

def _generate_graphene_sheet(
    a: float,
    nx: int = 6,
    ny: int = 4,
    z_offset: float = 0.0,
) -> list[dict]:
    """Hexagonal graphene patch — nx x ny supercell = 2*nx*ny C atoms.

    Primitive vectors: a1 = (a, 0),  a2 = (a/2, a*sqrt(3)/2)
    Two-atom basis: A=(0,0)  B=(a/2, a/(2*sqrt(3)))  => C-C = a/sqrt(3) ~ 1.42 A
    """
    a2x = a * 0.5
    a2y = a * _SQRT3 / 2
    bx  = a / 2
    by  = a / (2 * _SQRT3)
    atoms = []
    for n in range(nx):
        for m in range(ny):
            ox = n * a + m * a2x
            oy = m * a2y
            atoms.append({"x": round(ox,      4), "y": round(oy,      4),
                           "z": round(z_offset, 4), "element": "C"})
            atoms.append({"x": round(ox + bx, 4), "y": round(oy + by, 4),
                           "z": round(z_offset, 4), "element": "C"})
    return atoms


def _apply_n_doping(
    atoms: list[dict],
    doping_level: float,
    rng,
    z_offset: float | None = None,
) -> list[dict]:
    """Randomly replace a fraction of C atoms with pyridinic N.

    If z_offset is given, only atoms at that z layer are doped.
    """
    result = []
    for atom in atoms:
        if atom["element"] == "C":
            if z_offset is None or abs(atom["z"] - z_offset) < 0.01:
                if rng.random() < doping_level:
                    result.append({**atom, "element": "N"})
                    continue
        result.append(atom)
    return result


# ── Plain graphene ────────────────────────────────────────────────────────────

def _generate_graphene(a: float) -> tuple[list[dict], list[tuple]]:
    """6x4 graphene supercell — 48 C atoms, correct distance-cutoff bonds."""
    atoms = _generate_graphene_sheet(a, nx=6, ny=4)
    cc = _cc_bond(a)
    thresh_sq = (cc * 1.15) ** 2
    bonds = _compute_bonds_by_distance(atoms, thresh_sq, {"C"})
    bonds = _assign_kekule_orders(atoms, bonds)
    return atoms, bonds


# ── Armchair CNT (fixed geometry) ─────────────────────────────────────────────

def _generate_cnt(a: float) -> tuple[list[dict], list[tuple]]:
    """Armchair (6,6) CNT segment — 10 rings × 12 atoms = 120 C atoms.

    Uses the correct (6,6) armchair radius from the chiral vector
    |C_h| = n·a·√3, and places atoms in 6 dimers per ring (non-uniform
    angular spacing) so that distance-based bonding gives exactly 3 bonds
    per interior atom.

    Each ring has 6 bonded pairs (armchair dimers, chord = cc).
    Inter-dimer gaps (~2.78 Å) are above the bond threshold.
    Odd rings are rotated by π/6 to form the armchair bridging bonds.
    """
    cc = _cc_bond(a)
    N_DIMERS   = 6    # armchair (6,6)
    N_PER_RING = 12
    N_RINGS    = 10

    # Correct radius from chiral vector: |C_h| = n·a·√3
    radius = N_DIMERS * a * _SQRT3 / (2 * math.pi)

    # Half the angular span of one dimer (chord = cc)
    dimer_half = math.asin(cc / (2 * radius))

    # z_step from inter-ring bond: angular gap between adjacent dimer
    # endpoints in consecutive rings, total 3D distance = cc
    inter_ring_dtheta = math.pi / N_DIMERS - 2 * dimer_half
    xy_chord = 2 * radius * math.sin(inter_ring_dtheta / 2)
    z_step = math.sqrt(cc ** 2 - xy_chord ** 2)

    atoms: list[dict] = []
    for ring in range(N_RINGS):
        ring_offset = (ring % 2) * (math.pi / N_DIMERS)
        z = round(ring * z_step, 4)
        for d in range(N_DIMERS):
            center = 2 * math.pi * d / N_DIMERS + ring_offset
            for sign in (-1, +1):
                angle = center + sign * dimer_half
                atoms.append({
                    "x": round(radius * math.cos(angle), 4),
                    "y": round(radius * math.sin(angle), 4),
                    "z": z,
                    "element": "C",
                })

    thresh_sq = (cc * 1.15) ** 2
    bonds = _compute_bonds_by_distance(atoms, thresh_sq, {"C"})
    bonds = _assign_kekule_orders(atoms, bonds)
    return atoms, bonds


# ── Graphene oxide ─────────────────────────────────────────────────────────────

def _generate_graphene_oxide(
    a: float,
    pollutant_symbol: str,
    density: float,
    doping_level: float,
) -> tuple[list[dict], list[tuple]]:
    """N-doped graphene with edge functional groups.

    Structure:
      - 6x4 graphene supercell (48 C atoms)
      - ~doping_level fraction of C replaced by pyridinic N
      - Edge atoms (valency < 3) receive -OH / -COOH / -NH2 / epoxide
        selected by pollutant chemistry and density parameter
    """
    import random as _rng
    rng = _rng.Random(42)

    atoms = _generate_graphene_sheet(a, nx=6, ny=4)
    atoms = _apply_n_doping(atoms, doping_level, rng)

    cc = _cc_bond(a)
    thresh_sq = (cc * 1.15) ** 2
    bonds = _compute_bonds_by_distance(atoms, thresh_sq, {"C", "N"})
    bonds = _assign_kekule_orders(atoms, bonds)

    edge = _find_edge_atoms(atoms, bonds, element="C")
    atoms, bonds = _add_functional_groups(
        atoms, bonds, edge, cc, pollutant_symbol, density, rng
    )
    return atoms, bonds


# ── Composite bilayer ─────────────────────────────────────────────────────────

def _generate_composite(
    a: float,
    pollutant_symbol: str,
    density: float,
    doping_level: float,
) -> tuple[list[dict], list[tuple]]:
    """Twisted bilayer graphene with mixed functionalization.

    Two graphene sheets separated by 3.35 A (graphite van der Waals gap):
      Layer 0 (z=0):    N-doped, carboxyl-rich (heavy-metal scavenging)
      Layer 1 (z=3.35): OH/amine-rich, rotated 30 deg (Moire-like twist)

    The two layers are NOT covalently bonded (physisorption only), which
    is physically correct for van der Waals heterostructures.
    """
    import random as _rng
    VDW_GAP = 3.35
    TWIST   = math.pi / 6

    rng0 = _rng.Random(7)
    rng1 = _rng.Random(13)

    cc = _cc_bond(a)
    thresh_sq = (cc * 1.15) ** 2

    # Layer 0 — N-doped, COOH-rich
    layer0 = _generate_graphene_sheet(a, nx=6, ny=4, z_offset=0.0)
    layer0 = _apply_n_doping(layer0, doping_level, rng0, z_offset=0.0)
    bonds0 = _compute_bonds_by_distance(layer0, thresh_sq, {"C", "N"})
    bonds0 = _assign_kekule_orders(layer0, bonds0)
    edge0  = _find_edge_atoms(layer0, bonds0, element="C")
    layer0, bonds0 = _add_functional_groups(
        layer0, bonds0, edge0, cc, "Pb", density, rng0,
    )

    # Layer 1 — OH/amine-rich, twisted, shifted up by VDW_GAP
    raw1 = _generate_graphene_sheet(a, nx=6, ny=4, z_offset=0.0)
    cx = sum(p["x"] for p in raw1) / len(raw1)
    cy = sum(p["y"] for p in raw1) / len(raw1)
    cos_t, sin_t = math.cos(TWIST), math.sin(TWIST)
    layer1 = []
    for p in raw1:
        rx, ry = p["x"] - cx, p["y"] - cy
        layer1.append({
            "x":       round(cx + rx * cos_t - ry * sin_t, 4),
            "y":       round(cy + rx * sin_t + ry * cos_t, 4),
            "z":       round(p["z"] + VDW_GAP, 4),
            "element": p["element"],
        })
    layer1 = _apply_n_doping(layer1, doping_level * 0.5, rng1)

    bonds1_raw = _compute_bonds_by_distance(layer1, thresh_sq, {"C", "N"})
    bonds1_raw = _assign_kekule_orders(layer1, bonds1_raw)
    edge1 = _find_edge_atoms(layer1, bonds1_raw, element="C")
    layer1, bonds1_func = _add_functional_groups(
        layer1, bonds1_raw, edge1, cc, pollutant_symbol, density * 0.8, rng1,
    )

    offset = len(layer0)
    bonds1_reindexed = [(i + offset, j + offset, o) for i, j, o in bonds1_func]

    all_atoms = layer0 + layer1
    all_bonds = bonds0 + bonds1_reindexed
    return all_atoms, all_bonds


# ── MOF-like structure ────────────────────────────────────────────────────────

def _generate_mof(
    a: float,
    pollutant_symbol: str,
) -> tuple[list[dict], list[tuple]]:
    """Metal-Organic Framework inspired cage + graphene base.

    Architecture (loosely based on MOF-5 / HKUST-1 motifs):
      - Graphene base sheet (z=0) — the support membrane, N-doped + OH groups
      - 4 metal nodes (Fe for heavy-metal filters, Zn otherwise)
        arranged in a 2x2 square above the sheet at z=3.5 A
      - Each node has 4 carboxylate-style O ligands at cardinal directions
      - C2 organic linkers with bridging O connect adjacent metal nodes
      - A smaller heavily-N-doped cap sheet at z=7 A anchored to the nodes

    Results in ~150+ atoms across C, O, N, Fe/Zn, H — visually very dense.
    """
    import random as _rng
    rng = _rng.Random(99)

    sym = (pollutant_symbol or "C").upper()[:2].rstrip("0123456789+-")
    metal = "Fe" if sym in _HEAVY_METALS else "Zn"

    cc = _cc_bond(a)
    thresh_sq = (cc * 1.15) ** 2

    # Base graphene sheet
    base = _generate_graphene_sheet(a, nx=5, ny=3, z_offset=0.0)
    base = _apply_n_doping(base, 0.10, rng)
    bonds_base = _compute_bonds_by_distance(base, thresh_sq, {"C", "N"})
    bonds_base = _assign_kekule_orders(base, bonds_base)
    edge_base  = _find_edge_atoms(base, bonds_base, element="C")
    base, bonds_base = _add_functional_groups(
        base, bonds_base, edge_base, cc, pollutant_symbol, 0.4, rng,
    )

    all_atoms = list(base)
    all_bonds = list(bonds_base)

    # Centroid of the raw base (first 30 atoms before functional groups)
    n_base_raw = 30
    c_base_x = sum(p["x"] for p in base[:n_base_raw]) / n_base_raw
    c_base_y = sum(p["y"] for p in base[:n_base_raw]) / n_base_raw

    # 4 metal nodes in a 2x2 grid at z=3.5 A
    node_spacing = a * 2.5
    node_z = 3.5
    node_xys = [
        (c_base_x - node_spacing / 2, c_base_y - node_spacing / 2),
        (c_base_x + node_spacing / 2, c_base_y - node_spacing / 2),
        (c_base_x - node_spacing / 2, c_base_y + node_spacing / 2),
        (c_base_x + node_spacing / 2, c_base_y + node_spacing / 2),
    ]

    metal_indices: list[int] = []
    for (mx, my) in node_xys:
        mi = len(all_atoms)
        metal_indices.append(mi)
        all_atoms.append({"x": round(mx, 4), "y": round(my, 4),
                          "z": round(node_z, 4), "element": metal})

        # 4 carboxylate O ligands (square-planar coordination)
        for lox, loy, loz in [
            ( 2.05,  0.00,  0.3),
            (-2.05,  0.00,  0.3),
            ( 0.00,  2.05, -0.3),
            ( 0.00, -2.05, -0.3),
        ]:
            oi = len(all_atoms)
            all_atoms.append({
                "x": round(mx + lox, 4), "y": round(my + loy, 4),
                "z": round(node_z + loz, 4), "element": "O",
            })
            all_bonds.append((mi, oi, 1))

    # Organic linkers between adjacent node pairs: (0,1), (2,3), (0,2), (1,3)
    linker_pairs = [(0, 1), (2, 3), (0, 2), (1, 3)]
    for na_i, nb_i in linker_pairs:
        ax2, ay2 = node_xys[na_i]
        bx2, by2 = node_xys[nb_i]
        prev_c = None
        for frac in (0.25, 0.5, 0.75):
            ci = len(all_atoms)
            lx = ax2 + frac * (bx2 - ax2)
            ly = ay2 + frac * (by2 - ay2)
            lz = node_z + 0.5 * math.sin(frac * math.pi)
            all_atoms.append({
                "x": round(lx, 4), "y": round(ly, 4),
                "z": round(lz, 4), "element": "C",
            })
            if prev_c is not None:
                all_bonds.append((prev_c, ci, 1))
            prev_c = ci

        # Bridging O between the two middle linker carbons
        mid_c1 = len(all_atoms) - 2
        mid_c2 = len(all_atoms) - 1
        p1 = all_atoms[mid_c1]
        p2 = all_atoms[mid_c2]
        oi = len(all_atoms)
        all_atoms.append({
            "x": round((p1["x"] + p2["x"]) / 2, 4),
            "y": round((p1["y"] + p2["y"]) / 2, 4),
            "z": round(node_z + 1.3, 4),
            "element": "O",
        })
        all_bonds.append((mid_c1, oi, 1))
        all_bonds.append((mid_c2, oi, 1))

        # Bond linker end-Cs to metal node O ligands (the nearest O of each node)
        linker_start = len(all_atoms) - 4  # first C of this linker
        linker_end   = len(all_atoms) - 2  # last C of this linker (before bridge O)
        for node_atom_i, linker_c in [
            (metal_indices[na_i], linker_start),
            (metal_indices[nb_i], linker_end),
        ]:
            # Find the O ligand of this node closest to the linker carbon
            node_o_candidates = [
                b_idx for (a_idx, b_idx, _) in all_bonds if a_idx == node_atom_i
                and all_atoms[b_idx]["element"] == "O"
            ]
            if node_o_candidates:
                lc = all_atoms[linker_c]
                nearest_o = min(
                    node_o_candidates,
                    key=lambda oi2: (
                        (all_atoms[oi2]["x"] - lc["x"]) ** 2
                        + (all_atoms[oi2]["y"] - lc["y"]) ** 2
                    ),
                )
                all_bonds.append((linker_c, nearest_o, 1))

    # Cap sheet at z=7 A — heavily N-doped, anchored to metal nodes
    cap_z = 7.0
    cap_raw = _generate_graphene_sheet(a, nx=4, ny=3, z_offset=cap_z)
    cap_cx = sum(p["x"] for p in cap_raw) / len(cap_raw)
    cap_cy = sum(p["y"] for p in cap_raw) / len(cap_raw)
    cap = [
        {**p,
         "x": round(p["x"] - cap_cx + c_base_x, 4),
         "y": round(p["y"] - cap_cy + c_base_y, 4)}
        for p in cap_raw
    ]
    cap = _apply_n_doping(cap, 0.25, rng)

    cap_offset = len(all_atoms)
    all_atoms.extend(cap)

    bonds_cap_raw = _compute_bonds_by_distance(cap, thresh_sq, {"C", "N"})
    all_bonds.extend(
        (i + cap_offset, j + cap_offset, o) for i, j, o in bonds_cap_raw
    )

    # Anchor 4 cap edge atoms to the 4 metal nodes via coordination bonds
    edge_cap = sorted(_find_edge_atoms(cap, bonds_cap_raw, element="C"))
    for ei in edge_cap[:4]:
        cap_atom = all_atoms[cap_offset + ei]
        closest_metal = min(
            metal_indices,
            key=lambda mi: (
                (all_atoms[mi]["x"] - cap_atom["x"]) ** 2
                + (all_atoms[mi]["y"] - cap_atom["y"]) ** 2
                + (all_atoms[mi]["z"] - cap_atom["z"]) ** 2
            ),
        )
        all_bonds.append((cap_offset + ei, closest_metal, 1))

    return all_atoms, all_bonds


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
