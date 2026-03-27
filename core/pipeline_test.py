"""
Simulate a backend POST /generate request for a composite filter.

Replicates what run_generation does, but without a real DB — captures
filter_info as JSON and prints a structured analysis.

Usage:  python pipeline_test.py
"""
import json
import logging
import sqlite3
import sys
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# ── logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("pipeline_test")

# ── patch DB to a temp file so we don't pollute the real one ─────────────────
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["DB_PATH"] = _tmp_db.name

# Bootstrap minimal DB schema
conn = sqlite3.connect(_tmp_db.name)
conn.execute("""
    CREATE TABLE IF NOT EXISTS filters (
        filter_id TEXT PRIMARY KEY,
        measurement_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        filter_info TEXT,
        error_message TEXT
    )
""")
conn.execute(
    "INSERT INTO filters VALUES (?, ?, 'Pending', ?, ?, NULL, NULL)",
    ("test-filter-001", "meas-abc-001",
     datetime.now(timezone.utc).isoformat(),
     datetime.now(timezone.utc).isoformat()),
)
conn.commit()
conn.close()

# ── Backend request payload (what the Django backend would POST) ─────────────
# A measurement with elevated lead and turbidity — realistic industrial scenario
MEASUREMENT_DATA = {
    "temperature": 22.0,
    "ph": 6.8,
    "params": [
        {"name": "pb-tot",   "value": 0.045, "unit": "mg/L"},   # Lead > WHO limit
        {"name": "turbidity","value": 5.2,   "unit": "NTU"},
        {"name": "tds",      "value": 310.0, "unit": "mg/L"},
    ],
}

FILTER_ID     = "test-filter-001"
MEASUREMENT_ID = "meas-abc-001"

# ── Run the pipeline ──────────────────────────────────────────────────────────
log.info("=== Starting pipeline test (composite filter for Pb) ===")
log.info("Measurement data: temp=%.1f°C  pH=%.1f  params=%s",
         MEASUREMENT_DATA["temperature"],
         MEASUREMENT_DATA["ph"],
         [p["name"] for p in MEASUREMENT_DATA["params"]])

from routers.filters import run_generation

run_generation(FILTER_ID, MEASUREMENT_ID, MEASUREMENT_DATA)

# ── Read result from DB ───────────────────────────────────────────────────────
conn = sqlite3.connect(_tmp_db.name)
conn.row_factory = sqlite3.Row
row = dict(conn.execute("SELECT * FROM filters WHERE filter_id=?", (FILTER_ID,)).fetchone())
conn.close()

log.info("DB status after run_generation: %s", row["status"])

if row["status"] != "Success":
    print("\n[FAIL] Generation did not succeed.")
    print("Error:", row.get("error_message"))
    sys.exit(1)

fi = json.loads(row["filter_info"])

# ── Structural analysis ───────────────────────────────────────────────────────
atoms       = fi["atomPositions"]
connections = fi["connections"]
n_atoms     = len(atoms)
n_bonds     = len(connections)

# Element counts
from collections import Counter
elem_counts = Counter(a["element"] for a in atoms)

# Valency per atom
valency = Counter()
for c in connections:
    valency[c["from"]] += 1
    valency[c["to"]]   += 1

max_valency = max(valency.values()) if valency else 0
avg_valency = sum(valency.values()) / len(valency) if valency else 0
overvalent  = [aid for aid, v in valency.items() if v > 4]   # >4 is unusual for any element here

# Bond order distribution
order_dist = Counter(c["order"] for c in connections)

# ── Print report ──────────────────────────────────────────────────────────────
SEP = "=" * 60
print(f"\n{SEP}")
print("  PIPELINE TEST REPORT")
print(SEP)
print(f"  Status            : {row['status']}")
print(f"  Pollutant         : {fi['pollutant']} ({fi['pollutantSymbol']})")
print(f"  Material type     : {fi['materialType']}")
print(f"  Method            : {fi['method']}")
print(f"  Pore size         : {fi['poreSize']:.4f} nm")
print(f"  Layer thickness   : {fi['layerThickness']:.4f} nm")
print(f"  Lattice spacing   : {fi['latticeSpacing']:.4f} Å")
print(f"  Binding energy    : {fi['bindingEnergy']:.6f} eV")
print(f"  Removal efficiency: {fi['removalEfficiency']:.2f}%")
print(f"\n  Atoms             : {n_atoms}")
print(f"  Bonds             : {n_bonds}")
print(f"  Elements          : {dict(elem_counts)}")
print(f"\n  Valency — avg     : {avg_valency:.2f}")
print(f"  Valency — max     : {max_valency}")
print(f"  Over-valent (>4)  : {len(overvalent)} atoms")
print(f"  Bond order dist   : {dict(sorted(order_dist.items()))}")

# ── Pass/fail checks ──────────────────────────────────────────────────────────
print(f"\n{SEP}")
print("  CHECKS")
print(SEP)

checks_passed = 0
checks_total  = 0

def check(name, passed, detail=""):
    global checks_passed, checks_total
    checks_total += 1
    if passed:
        checks_passed += 1
        status = "PASS"
    else:
        status = "FAIL"
    line = f"  [{status}] {name}"
    if detail:
        line += f" — {detail}"
    print(line)

check("Status is Success",         row["status"] == "Success")
check("Atoms present",             n_atoms > 0,  f"{n_atoms} atoms")
check("Bonds present",             n_bonds > 0,  f"{n_bonds} bonds")
check("Correct material type",     fi["materialType"] == "composite",
      fi["materialType"])
check("Pollutant symbol is Pb",    fi["pollutantSymbol"] == "Pb",
      fi["pollutantSymbol"])
check("Removal efficiency > 0",    fi["removalEfficiency"] > 0,
      f"{fi['removalEfficiency']:.2f}%")
check("Binding energy non-zero",   fi["bindingEnergy"] != 0,
      f"{fi['bindingEnergy']:.6f} eV")
check("No over-valent atoms (>4)", len(overvalent) == 0,
      f"{len(overvalent)} over-valent")
check("Max valency ≤ 4",           max_valency <= 4, f"max={max_valency}")
check("Has N atoms (doping)",
      "N" in elem_counts, str(dict(elem_counts)))
check("Has O atoms (func groups)",
      "O" in elem_counts, str(dict(elem_counts)))
check("All atom IDs sequential",
      sorted(a["id"] for a in atoms) == list(range(n_atoms)),
      "IDs 0..N-1")
check("All bond refs in range",
      all(0 <= c["from"] < n_atoms and 0 <= c["to"] < n_atoms
          for c in connections),
      "from/to within [0, n_atoms)")

print(f"\n  {checks_passed}/{checks_total} checks passed")

# ── Sample atoms ──────────────────────────────────────────────────────────────
print(f"\n{SEP}")
print("  SAMPLE ATOMS (first 5 and last 5)")
print(SEP)
for a in atoms[:5] + atoms[-5:]:
    v = valency.get(a["id"], 0)
    print(f"  id={a['id']:4d}  elem={a['element']:2s}  "
          f"x={a['x']:8.4f}  y={a['y']:8.4f}  z={a['z']:8.4f}  valency={v}")

print(f"\n{SEP}")
if checks_passed == checks_total:
    print("  ALL CHECKS PASSED")
else:
    print(f"  {checks_total - checks_passed} CHECK(S) FAILED")
print(SEP)

# cleanup
os.unlink(_tmp_db.name)
sys.exit(0 if checks_passed == checks_total else 1)
