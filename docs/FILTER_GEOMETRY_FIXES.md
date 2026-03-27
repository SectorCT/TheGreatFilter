# Filter Geometry Fix Plan

All four bugs are in `routers/filters.py`. Fix in the order listed — Fix 4 first
because it operates on the raw lattice before functional groups are attached.

---

## Bug 1 — NH2: N-H bond length ~0.66 Å (H atoms appear inside N)

**File**: `routers/filters.py`
**Lines**: 479–489 (`_add_functional_groups`, `elif group == "nh2":` block)

**What's wrong**:
The direction vector for each H atom in an NH2 group is constructed as:

```python
hx = new_atoms[ni]["x"] + (dx * 0.3 + sign * perp_x * 0.5) * bond_nh
hy = new_atoms[ni]["y"] + (dy * 0.3 + sign * perp_y * 0.5) * bond_nh
hz = new_atoms[ni]["z"] + bond_nh * 0.3
```

The in-plane part `(dx·0.3 + sign·perp_x·0.5, dy·0.3 + sign·perp_y·0.5)` is not a
unit vector — its magnitude is ~0.583. The z contribution `0.3` is added to the
position independently, not included in the magnitude. The full 3D direction vector
has magnitude ~0.656. Multiplying by `bond_nh = 1.01` gives an actual N-H distance
of ~0.66 Å instead of 1.01 Å. H atoms appear nearly fused with the N atom in any renderer.

**Fix**:
Build the raw 3D direction `(dx·0.3 + sign·perp_x·0.5, dy·0.3 + sign·perp_y·0.5, 0.3)`,
compute its magnitude, normalize it to a unit vector, then scale by `bond_nh`.

```python
# For each H in the NH2 group:
raw_dx = dx * 0.3 + sign * perp_x * 0.5
raw_dy = dy * 0.3 + sign * perp_y * 0.5
raw_dz = 0.3
mag = math.sqrt(raw_dx**2 + raw_dy**2 + raw_dz**2)
hx = new_atoms[ni]["x"] + (raw_dx / mag) * bond_nh
hy = new_atoms[ni]["y"] + (raw_dy / mag) * bond_nh
hz = new_atoms[ni]["z"] + (raw_dz / mag) * bond_nh
```

---

## Bug 2 — Dangling bonds: edge C atoms left with valency < 3

**File**: `routers/filters.py`
**Location**: `_add_functional_groups`, after the main `for idx in candidates:` loop (after line 511)

**What's wrong**:
`_add_functional_groups` applies a random density roll per edge atom:

```python
if rng.random() > density:
    continue
```

Atoms that fail the roll receive no functional group and no H cap. They remain with
their original lattice valency (1 or 2). These are chemically invalid — sp2 graphene
carbon must have exactly 3 bonds. Example from the last generated filter: atom 4
(C at `2.46, 4.26, 0.0`) has valency 2 with a bare dangling bond.

**Fix**:
After the main loop, add a H-capping pass. For every C atom still with degree < 3,
compute its outward direction (same neighbor-centroid logic already at lines 402–413)
and attach a single H atom at distance 1.08 Å (sp2 C-H bond length), bonded with order=1.
Repeat until the atom reaches degree 3 (some corner atoms start at degree 1 and need 2 H caps).

```python
# After the main functional group loop:
for idx, atom in enumerate(new_atoms):
    if atom["element"] not in {"C", "N"}:
        continue
    degree = sum(1 for (i, j, _) in new_bonds if i == idx or j == idx)
    target = 3
    while degree < target:
        # recompute outward direction from current bonds
        neighbours = [j for (i,j,_) in new_bonds if i==idx] + [i for (i,j,_) in new_bonds if j==idx]
        if neighbours:
            nx2 = sum(new_atoms[n]["x"] for n in neighbours) / len(neighbours)
            ny2 = sum(new_atoms[n]["y"] for n in neighbours) / len(neighbours)
            nz2 = sum(new_atoms[n]["z"] for n in neighbours) / len(neighbours)
            ddx, ddy, ddz = atom["x"]-nx2, atom["y"]-ny2, atom["z"]-nz2
            mag = math.sqrt(ddx**2 + ddy**2 + ddz**2) or 1.0
            ddx, ddy, ddz = ddx/mag, ddy/mag, ddz/mag
        else:
            ddx, ddy, ddz = 1.0, 0.0, 0.0
        hi = len(new_atoms)
        bond_ch = 1.08
        new_atoms.append({"x": round(atom["x"] + ddx*bond_ch, 4),
                           "y": round(atom["y"] + ddy*bond_ch, 4),
                           "z": round(atom["z"] + ddz*bond_ch, 4),
                           "element": "H"})
        new_bonds.append((idx, hi, 1))
        degree += 1
```

---

## Bug 3 — OH: C-O bond length ~1.52 Å (should be 1.43 Å)

**File**: `routers/filters.py`
**Lines**: 415–431 (`_add_functional_groups`, `if group == "oh":` block)

**What's wrong**:
The O atom is placed at in-plane displacement `bond_co = 1.43 Å` plus an independent
z-offset of `+0.5 Å` added to the position directly:

```python
"z": round(az + dz * bond_co + 0.5, 4),
```

For in-plane graphene (`dz = 0`), the actual C-O distance becomes:

```
sqrt(1.43² + 0.5²) ≈ 1.515 Å   (6% too long)
```

The same issue applies to the H atom placement (O-H distance also slightly off).

**Fix**:
Treat the out-of-plane lift as a 3D tilt of the bond direction rather than an additive
offset. Choose a tilt of ~30° from the graphene plane (physically reasonable for a
hydroxyl on graphene oxide). Compute the 3D unit vector from the in-plane outward
direction and the tilt angle, scale by `bond_co`:

```python
TILT = math.pi / 6   # 30 degrees out of plane
cos_t, sin_t = math.cos(TILT), math.sin(TILT)
odx, ody, odz = dx * cos_t, dy * cos_t, sin_t   # already unit length
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
```

This keeps C-O exactly 1.43 Å and O-H exactly 0.96 Å while lifting both atoms above
the graphene plane at the correct angle.

---

## Bug 4 — Missing Kekulé double bonds in the C-C / C-N lattice

**File**: `routers/filters.py`
**Location**: New function `_assign_kekule_orders()`, called in every material generator
after `_compute_bonds_by_distance` and before `_add_functional_groups`

**What's wrong**:
`_compute_bonds_by_distance` hardcodes `order=1` for every bond:

```python
bonds.append((i, j, 1))   # line 320 — always order 1
```

Graphene is sp2-hybridized with an aromatic π system. In the standard Kekulé
representation used by all 3D renderers (3Dmol.js, mol files, SDF), alternating C-C
bonds in each hexagonal ring are drawn as double bonds (order=2). In a 6×4 graphene
supercell (~48 C atoms, ~74 bonds) approximately 24 bonds should be order=2. The
current output shows 0 double bonds in the lattice — all 74 are order=1.

The graphene sheet generator (`_generate_graphene_sheet`) already uses a two-atom
basis (sublattice A at `(ox, oy)`, sublattice B at `(ox+bx, oy+by)`) that exactly
encodes the bipartite structure. A-atoms only bond to B-atoms and vice versa.
This makes Kekulé assignment straightforward via a greedy matching on the bipartite graph.

**Fix**:
Add a new function `_assign_kekule_orders`:

```python
def _assign_kekule_orders(
    atoms: list[dict], bonds: list[tuple]
) -> list[tuple]:
    """Assign alternating double bonds (Kekulé structure) to a graphene lattice.

    Uses BFS to 2-colour the bipartite honeycomb graph (sublattice A / B),
    then greedily assigns order=2 to one A-B bond per atom.

    Only C-C and C-N bonds in the aromatic lattice are upgraded.
    Bonds to/from functional group atoms (H, O) are left as order=1.
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
                    colour[nb] = 1 - colour[start]  # BFS toggle
                    queue.append(nb)

    # Greedy Kekulé: upgrade one A→B bond per atom, neither endpoint yet doubled
    doubled: set[int] = set()
    bond_order: dict[tuple[int, int], int] = {}
    for i, j, _ in bonds:
        bond_order[(i, j)] = 1

    for i, j, _ in bonds:
        if (colour.get(i) == 0 and colour.get(j) == 1   # A→B direction
                and i not in doubled and j not in doubled
                and atoms[i]["element"] in aromatic
                and atoms[j]["element"] in aromatic):
            bond_order[(i, j)] = 2
            doubled.add(i)
            doubled.add(j)

    return [(i, j, bond_order[(i, j)]) for i, j, _ in bonds]
```

Call it in each material generator immediately after `_compute_bonds_by_distance`:

- `_generate_graphene` — line ~573
- `_generate_graphene_oxide` — line ~642
- `_generate_composite` (both layers) — lines ~681 and ~703
- `_generate_mof_like` / any other generator that uses the graphene sheet

Example insertion in `_generate_graphene_oxide`:

```python
bonds = _compute_bonds_by_distance(atoms, thresh_sq, {"C", "N"})
bonds = _assign_kekule_orders(atoms, bonds)          # ← add this line
```

**N-doping note**: Pyridinic N atoms sit at C positions in the same bipartite graph.
The BFS colouring includes them naturally. N will receive one double bond (the
pyridine-like C=N), which is chemically correct.

---

## Execution order

| # | Fix | Where |
|---|-----|--------|
| 1 | Add `_assign_kekule_orders()` function | New function, ~line 322 (after `_compute_bonds_by_distance`) |
| 2 | Call `_assign_kekule_orders` in each generator | After every `_compute_bonds_by_distance` call |
| 3 | Fix OH bond length tilt geometry | `_add_functional_groups` lines 415–431 |
| 4 | Fix NH2 H direction normalization | `_add_functional_groups` lines 479–489 |
| 5 | Add H-capping pass for dangling bonds | `_add_functional_groups` after line 511 |

---

## Validation checks to add to `pipeline_test.py`

After fixing, the pipeline test should verify:

```python
# Kekulé: expect ~33% of lattice bonds to be order=2
lattice_bonds = [c for c in connections if c["from"] < n_lattice and c["to"] < n_lattice]
double_bonds   = [c for c in lattice_bonds if c["order"] == 2]
check("Lattice has double bonds (Kekulé)",
      len(double_bonds) > 0, f"{len(double_bonds)}/{len(lattice_bonds)}")

# No dangling bonds: all C and N atoms have valency >= 2 (edge) or 3 (interior)
undervalent = [a["id"] for a in atoms
               if a["element"] in ("C", "N") and valency.get(a["id"], 0) < 2]
check("No under-valent C/N atoms", len(undervalent) == 0,
      f"{len(undervalent)} under-valent")

# NH2 N-H bond length in range [0.95, 1.10] Å
# (requires computing distances per bond — add a bond-length helper)
```
