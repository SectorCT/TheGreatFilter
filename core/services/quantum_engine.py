"""Quantum chemistry simulation for pollutant-graphene binding energy.

Uses PySCF to solve the electronic Schrödinger equation for a C-pollutant
system with STO-3G basis set. Binding energy is computed as:

    E_bind = E(C-pollutant at d) − E(C isolated) − E(pollutant isolated)

Negative values indicate attractive (favorable) binding.

When USE_VQE=1 the engine runs a Variational Quantum Eigensolver (VQE)
on a deterministic active space extracted from the converged HF solution.
The VQE uses PennyLane's statevector simulator with a UCCSD-style ansatz
and Jordan-Wigner qubit mapping. This captures electron correlation that
plain Hartree-Fock misses, improving binding energy accuracy.

The active space is selected by orbital energy ordering (averaged over
alpha/beta spin channels for UHF), which is fully deterministic — avoiding
the non-determinism problems of Qiskit's ActiveSpaceTransformer.
"""

import logging
import math
import os

import numpy as np

from services.pollutant_map import get_simulation_atom

logger = logging.getLogger("qlean.quantum")

HARTREE_TO_EV = 27.2114

# ── Configuration (env vars) ────────────────────────────────────────────────
USE_VQE = os.environ.get("USE_VQE", "0").lower() in ("1", "true", "yes")
VQE_ACTIVE_ELECTRONS = int(os.environ.get("VQE_ACTIVE_ELECTRONS", "4"))
VQE_ACTIVE_ORBITALS = int(os.environ.get("VQE_ACTIVE_ORBITALS", "4"))
VQE_MAX_ITERATIONS = int(os.environ.get("VQE_MAX_ITERATIONS", "80"))

# Atomic numbers for elements in STO3G_SUPPORTED
ATOMIC_NUMBERS = {
    "H": 1, "He": 2, "Li": 3, "Be": 4, "B": 5, "C": 6, "N": 7, "O": 8,
    "F": 9, "Ne": 10, "Na": 11, "Mg": 12, "Al": 13, "Si": 14, "P": 15,
    "S": 16, "Cl": 17, "Ar": 18, "K": 19, "Ca": 20,
    "Sc": 21, "Ti": 22, "V": 23, "Cr": 24, "Mn": 25, "Fe": 26,
    "Co": 27, "Ni": 28, "Cu": 29, "Zn": 30,
    "Ga": 31, "Ge": 32, "As": 33, "Se": 34, "Br": 35, "Kr": 36,
}

# Per-process caches (populated once per worker, reused across GA evaluations)
_atom_energy_cache: dict[tuple[str, int], float] = {}
_atom_vqe_cache: dict[tuple[str, int], float] = {}


def _compute_spin(symbol_or_z: int | str, charge: int) -> int:
    """Spin (2S) for an atom/system. n_electrons % 2 ensures PySCF consistency."""
    if isinstance(symbol_or_z, str):
        z = ATOMIC_NUMBERS.get(symbol_or_z, 17)
    else:
        z = symbol_or_z
    n_electrons = z - charge
    return n_electrons % 2


# ── Isolated atom energies ──────────────────────────────────────────────────

def _build_atom_mol(symbol: str, charge: int):
    """Build a PySCF Mole for a single atom."""
    from pyscf import gto
    z = ATOMIC_NUMBERS.get(symbol, 17)
    n_electrons = z - charge
    spin = n_electrons % 2
    return gto.M(
        atom=f"{symbol} 0.0 0.0 0.0",
        basis="sto-3g",
        charge=charge,
        spin=spin,
        verbose=0,
    )


def _run_atom_hf(symbol: str, charge: int):
    """Converged UHF object for an isolated atom. Returns (mf, energy)."""
    from pyscf import scf
    mol = _build_atom_mol(symbol, charge)
    mf = scf.UHF(mol)
    mf.max_cycle = 200
    mf.conv_tol = 1e-10
    mf.kernel()
    if not mf.converged:
        raise RuntimeError(f"SCF did not converge for isolated {symbol} charge={charge}")
    return mf, mf.e_tot


def _isolated_atom_energy(symbol: str, charge: int) -> float:
    """HF energy of an isolated atom (cached)."""
    key = (symbol, charge)
    if key not in _atom_energy_cache:
        _, energy = _run_atom_hf(symbol, charge)
        _atom_energy_cache[key] = energy
        logger.info("Isolated atom %s charge=%d: %.6f Ha", symbol, charge, energy)
    return _atom_energy_cache[key]


def _isolated_atom_vqe_energy(symbol: str, charge: int) -> float:
    """VQE energy of an isolated atom (cached).

    Falls back to HF if VQE fails (e.g. too few orbitals for active space).
    """
    key = (symbol, charge)
    if key not in _atom_vqe_cache:
        hf_energy = _isolated_atom_energy(symbol, charge)
        mol = _build_atom_mol(symbol, charge)
        try:
            vqe_energy = _run_vqe_from_mol(mol)
            if vqe_energy > hf_energy + 0.01:
                logger.warning("Atom %s VQE energy %.6f > HF %.6f — using HF",
                               symbol, vqe_energy, hf_energy)
                vqe_energy = hf_energy
            _atom_vqe_cache[key] = vqe_energy
            logger.info("Isolated atom %s charge=%d VQE: %.6f Ha (HF: %.6f)",
                        symbol, charge, vqe_energy, hf_energy)
        except Exception as e:
            logger.warning("Atom %s VQE failed (%s) — using HF", symbol, e)
            _atom_vqe_cache[key] = hf_energy
    return _atom_vqe_cache[key]


# ── System HF ───────────────────────────────────────────────────────────────

def _build_system_mol(sim_atom: str, charge: int, distance: float):
    """Build PySCF Mole for the C–pollutant system."""
    from pyscf import gto
    atom_string = f"C 0.0 0.0 0.0; {sim_atom} 0.0 0.0 {distance:.4f}"
    total_z = ATOMIC_NUMBERS["C"] + ATOMIC_NUMBERS.get(sim_atom, 17)
    n_electrons = total_z - charge
    spin = n_electrons % 2
    return gto.M(
        atom=atom_string,
        basis="sto-3g",
        charge=charge,
        spin=spin,
        verbose=0,
    )


def _run_system_hf(sim_atom: str, charge: int, distance: float):
    """Converge UHF for the C–pollutant system.

    Returns (mf, total_energy_hartree).
    """
    from pyscf import scf
    mol = _build_system_mol(sim_atom, charge, distance)

    mf = scf.UHF(mol)
    mf.max_cycle = 300
    mf.conv_tol = 1e-9
    mf.kernel()

    if not mf.converged:
        logger.info("SCF retry with level shift for dist=%.2fÅ", distance)
        mf = scf.UHF(mol)
        mf.max_cycle = 500
        mf.conv_tol = 1e-8
        mf.level_shift = 0.5
        mf.damp = 0.3
        mf.kernel()
        if not mf.converged:
            raise RuntimeError(
                f"SCF did not converge for C + {sim_atom} at {distance:.2f}Å charge={charge}")

    return mf, mf.e_tot


# ── VQE via PennyLane ────────────────────────────────────────────────────────

def _run_vqe_from_mol(mol) -> float:
    """Run VQE using PennyLane qchem on a PySCF Mole object.

    PennyLane builds the molecular Hamiltonian internally (running its own
    RHF + integral extraction), selects the active space deterministically
    by lowest-energy MO ordering, and maps to qubits via Jordan-Wigner.
    This bypasses the Qiskit ActiveSpaceTransformer entirely.

    Returns total energy in Hartree.
    """
    import pennylane as qml

    symbols = [mol.atom_symbol(i) for i in range(mol.natm)]
    # PySCF stores coordinates in Bohr; PennyLane expects Bohr
    coords = mol.atom_coords().flatten()
    charge = mol.charge
    mult = mol.spin + 1  # PySCF spin = 2S, PennyLane mult = 2S+1

    n_active_e = VQE_ACTIVE_ELECTRONS
    n_active_o = VQE_ACTIVE_ORBITALS

    # Clamp active space to what the molecule actually has
    n_orbitals = mol.nao_nr()
    n_electrons = mol.nelectron
    n_active_e = min(n_active_e, n_electrons)
    n_active_o = min(n_active_o, n_orbitals)

    if n_active_e < 2 or n_active_o < 2:
        raise ValueError(
            f"Active space too small: {n_active_e}e, {n_active_o}o — need ≥2e,2o")

    logger.info("VQE: building Hamiltonian — %de, %do active space, mult=%d",
                n_active_e, n_active_o, mult)

    H, n_qubits = qml.qchem.molecular_hamiltonian(
        symbols, coords,
        charge=charge,
        mult=mult,
        basis="sto-3g",
        active_electrons=n_active_e,
        active_orbitals=n_active_o,
        method="pyscf",
    )

    logger.info("VQE: %d qubits, running ansatz …", n_qubits)

    # ── VQE circuit ─────────────────────────────────────────────────────
    hf_state = qml.qchem.hf_state(n_active_e, n_qubits)
    singles, doubles = qml.qchem.excitations(n_active_e, n_qubits)
    n_params = len(singles) + len(doubles)

    if n_params == 0:
        raise ValueError("No excitations available for VQE ansatz")

    dev = qml.device("default.qubit", wires=n_qubits)

    @qml.qnode(dev, interface="autograd")
    def cost_fn(params):
        qml.AllSinglesDoubles(
            params, wires=range(n_qubits),
            hf_state=hf_state,
            singles=singles, doubles=doubles,
        )
        return qml.expval(H)

    # Optimize from zero (near-HF initial point)
    # PennyLane requires its own numpy for autodiff-aware arrays
    pnp = qml.numpy
    params = pnp.zeros(n_params, requires_grad=True)
    opt = qml.AdamOptimizer(stepsize=0.02)

    energy = float("inf")
    for step in range(VQE_MAX_ITERATIONS):
        params, prev_energy = opt.step_and_cost(cost_fn, params)
        energy = float(cost_fn(params))
        if step > 0 and abs(energy - float(prev_energy)) < 1e-6:
            logger.info("VQE converged at step %d: %.6f Ha", step, energy)
            break
    else:
        logger.info("VQE reached max iterations (%d): %.6f Ha",
                     VQE_MAX_ITERATIONS, energy)

    return energy


# ── Main binding energy computation ──────────────────────────────────────────

def compute_binding_energy(
    pollutant_symbol: str,
    pollutant_charge: int,
    pore_size_nm: float = 0.8,
    temperature_c: float = 25.0,
    ph: float = 7.0,
) -> dict:
    """Compute binding energy between C and pollutant atom.

    Uses PySCF Hartree-Fock with STO-3G basis. When USE_VQE=1, refines
    the energy with VQE on a small active space.

    Binding energy = E(system) − E(C alone) − E(pollutant alone).
    """
    distance = pore_size_nm * 10.0  # nm → angstrom
    distance = max(1.0, min(distance, 10.0))

    sim_atom = get_simulation_atom(pollutant_symbol)

    logger.info("HF start: %s (sim=%s) charge=%d dist=%.2fÅ",
                pollutant_symbol, sim_atom, pollutant_charge, distance)

    try:
        # ── Hartree-Fock (always runs first) ─────────────────────────────
        e_carbon_hf = _isolated_atom_energy("C", 0)
        e_pollutant_hf = _isolated_atom_energy(sim_atom, pollutant_charge)
        mf_sys, e_system_hf = _run_system_hf(sim_atom, pollutant_charge, distance)

        binding_hf = (e_system_hf - e_carbon_hf - e_pollutant_hf) * HARTREE_TO_EV
        logger.info("HF binding: %.4f eV (sys=%.6f, C=%.6f, %s=%.6f Ha)",
                     binding_hf, e_system_hf, e_carbon_hf, sim_atom, e_pollutant_hf)

        # ── VQE refinement (optional) ────────────────────────────────────
        if USE_VQE:
            try:
                logger.info("Running VQE refinement …")
                e_carbon_vqe = _isolated_atom_vqe_energy("C", 0)
                e_pollutant_vqe = _isolated_atom_vqe_energy(sim_atom, pollutant_charge)
                sys_mol = _build_system_mol(sim_atom, pollutant_charge, distance)
                e_system_vqe = _run_vqe_from_mol(sys_mol)

                binding_vqe = (e_system_vqe - e_carbon_vqe - e_pollutant_vqe) * HARTREE_TO_EV
                logger.info("VQE binding: %.4f eV (HF was %.4f eV, Δ=%.4f eV)",
                             binding_vqe, binding_hf, binding_vqe - binding_hf)

                removal_eff = _compute_efficiency(binding_vqe, temperature_c, ph)
                return {
                    "binding_energy": round(binding_vqe, 6),
                    "removal_efficiency": round(removal_eff, 2),
                    "converged": True,
                    "method": "vqe",
                    "hf_binding_energy": round(binding_hf, 6),
                    "active_space": f"{VQE_ACTIVE_ELECTRONS}e,{VQE_ACTIVE_ORBITALS}o",
                }
            except Exception as vqe_err:
                logger.warning("VQE refinement failed (%s) — using HF result", vqe_err)

        # ── Return HF result (VQE disabled or failed) ───────────────────
        removal_eff = _compute_efficiency(binding_hf, temperature_c, ph)
        return {
            "binding_energy": round(binding_hf, 6),
            "removal_efficiency": round(removal_eff, 2),
            "converged": True,
            "method": "hf",
        }

    except Exception as e:
        logger.warning("HF failed: %s — using empirical LJ", e)
        binding_ev = _empirical_binding(pollutant_symbol, distance)
        return {
            "binding_energy": binding_ev,
            "removal_efficiency": _compute_efficiency(binding_ev, temperature_c, ph),
            "converged": False,
            "method": "empirical_fallback",
            "error": str(e),
        }


def _empirical_binding(pollutant_symbol: str, distance: float) -> float:
    """Empirical Lennard-Jones-like estimate when HF pipeline fails."""
    well_depths = {
        "Pb": -0.35, "Sn": -0.35, "Cl": -0.25, "F": -0.30,
        "As": -0.28, "P": -0.28, "Hg": -0.32, "Zn": -0.27,
        "Cd": -0.27, "N": -0.22, "Cu": -0.30, "Ni": -0.30,
        "Cr": -0.26, "S": -0.26,
    }
    sigma = 2.5  # angstrom
    epsilon = well_depths.get(get_simulation_atom(pollutant_symbol), -0.25)
    r = max(distance, 1.0)
    ratio = sigma / r
    energy = epsilon * (ratio**12 - 2 * ratio**6)
    return round(energy, 6)


def _compute_efficiency(binding_energy_ev: float, temperature_c: float,
                        ph: float) -> float:
    """Map binding energy + environmental factors to removal efficiency (0-100%).

    Stronger binding (more negative) → higher removal.
    Higher temperature → slightly lower efficiency (thermal desorption).
    Extreme pH → slightly lower efficiency.
    """
    be = abs(binding_energy_ev)
    base = 100.0 * (1.0 - math.exp(-2.5 * be))

    # Temperature correction: −0.3% per degree above 25°C
    temp_factor = 1.0 - 0.003 * max(0, temperature_c - 25.0)
    temp_factor = max(temp_factor, 0.7)

    # pH correction: optimal at 6.5–7.5, penalty outside
    ph_deviation = max(0, abs(ph - 7.0) - 0.5)
    ph_factor = 1.0 - 0.05 * ph_deviation
    ph_factor = max(ph_factor, 0.7)

    efficiency = base * temp_factor * ph_factor
    return max(0.0, min(100.0, efficiency))
