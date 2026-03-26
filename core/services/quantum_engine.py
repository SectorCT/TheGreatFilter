"""Quantum chemistry simulation for pollutant-graphene binding energy.

Uses PySCF to solve the electronic Schrödinger equation for a C-pollutant
system with STO-3G basis set. Binding energy is computed as:

    E_bind = E(C-pollutant at d) − E(C isolated) − E(pollutant isolated)

Negative values indicate attractive (favorable) binding.

The Qiskit active-space + Jordan-Wigner pipeline was replaced with direct
PySCF Hartree-Fock because the ActiveSpaceTransformer selects different
orbital subsets for near-degenerate HF solutions, causing non-deterministic
energies for the same geometry. Full-space HF on 14 spatial orbitals is
both fast (~0.1s) and deterministic, giving reliable binding energies.
"""

import logging
import math

from services.pollutant_map import get_simulation_atom

logger = logging.getLogger("h2osim.quantum")

HARTREE_TO_EV = 27.2114

# Atomic numbers for elements in STO3G_SUPPORTED
ATOMIC_NUMBERS = {
    "H": 1, "He": 2, "Li": 3, "Be": 4, "B": 5, "C": 6, "N": 7, "O": 8,
    "F": 9, "Ne": 10, "Na": 11, "Mg": 12, "Al": 13, "Si": 14, "P": 15,
    "S": 16, "Cl": 17, "Ar": 18, "K": 19, "Ca": 20, "Ni": 28, "Zn": 30,
}

# Per-process cache for isolated atom energies (Hartree).
# Populated once per worker process, then reused across all GA evaluations.
_atom_energy_cache: dict[tuple[str, int], float] = {}


def _compute_spin(symbol_or_z: int | str, charge: int) -> int:
    """Spin (2S) for an atom/system. n_electrons % 2 ensures PySCF consistency."""
    if isinstance(symbol_or_z, str):
        z = ATOMIC_NUMBERS.get(symbol_or_z, 17)
    else:
        z = symbol_or_z
    n_electrons = z - charge
    return n_electrons % 2


def _isolated_atom_energy(symbol: str, charge: int) -> float:
    """HF energy of an isolated atom. Cached per (symbol, charge)."""
    key = (symbol, charge)
    if key not in _atom_energy_cache:
        from pyscf import gto, scf
        z = ATOMIC_NUMBERS.get(symbol, 17)
        n_electrons = z - charge
        spin = n_electrons % 2

        mol = gto.M(
            atom=f"{symbol} 0.0 0.0 0.0",
            basis="sto-3g",
            charge=charge,
            spin=spin,
            verbose=0,
        )
        mf = scf.UHF(mol)
        mf.max_cycle = 200
        mf.conv_tol = 1e-10
        mf.kernel()

        if not mf.converged:
            raise RuntimeError(f"SCF did not converge for isolated {symbol} charge={charge}")

        _atom_energy_cache[key] = mf.e_tot
        logger.info("Isolated atom %s charge=%d: %.6f Ha", symbol, charge, mf.e_tot)

    return _atom_energy_cache[key]


def compute_binding_energy(
    pollutant_symbol: str,
    pollutant_charge: int,
    pore_size_nm: float = 0.8,
    temperature_c: float = 25.0,
    ph: float = 7.0,
) -> dict:
    """Compute binding energy between C and pollutant atom.

    Uses PySCF Hartree-Fock with STO-3G basis. Binding energy =
    E(system) − E(C alone) − E(pollutant alone).

    Args:
        pollutant_symbol: Chemical symbol of pollutant (e.g. "Pb", "Cl")
        pollutant_charge: Ionic charge of pollutant
        pore_size_nm: Filter pore size in nanometers (determines atom distance)
        temperature_c: Water temperature in Celsius
        ph: Water pH

    Returns:
        dict with binding_energy (eV), removal_efficiency (%), converged (bool)
    """
    distance = pore_size_nm * 10.0  # nm → angstrom
    distance = max(1.0, min(distance, 10.0))

    sim_atom = get_simulation_atom(pollutant_symbol)

    logger.info("HF start: %s (sim=%s) charge=%d dist=%.2fÅ",
                pollutant_symbol, sim_atom, pollutant_charge, distance)

    try:
        # Isolated atom references (cached after first call)
        e_carbon = _isolated_atom_energy("C", 0)
        e_pollutant = _isolated_atom_energy(sim_atom, pollutant_charge)

        # System energy at the target distance
        e_system = _run_system_hf(sim_atom, pollutant_charge, distance)

        binding_hartree = e_system - e_carbon - e_pollutant
        binding_ev = binding_hartree * HARTREE_TO_EV

        logger.info("Binding: %.4f eV (sys=%.6f, C=%.6f, %s=%.6f Ha)",
                     binding_ev, e_system, e_carbon, sim_atom, e_pollutant)

        removal_eff = _compute_efficiency(binding_ev, temperature_c, ph)

        return {
            "binding_energy": round(binding_ev, 6),
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


def _run_system_hf(sim_atom: str, charge: int, distance: float) -> float:
    """HF energy of the C-pollutant system at given separation.

    Returns total energy in Hartree.
    """
    from pyscf import gto, scf

    atom_string = f"C 0.0 0.0 0.0; {sim_atom} 0.0 0.0 {distance:.4f}"
    total_z = ATOMIC_NUMBERS["C"] + ATOMIC_NUMBERS.get(sim_atom, 17)
    n_electrons = total_z - charge
    spin = n_electrons % 2

    mol = gto.M(
        atom=atom_string,
        basis="sto-3g",
        charge=charge,
        spin=spin,
        verbose=0,
    )

    # UHF handles charge-transfer and open-shell systems robustly
    mf = scf.UHF(mol)
    mf.max_cycle = 300
    mf.conv_tol = 1e-9
    mf.kernel()

    if not mf.converged:
        # Retry with level shift + damping for difficult cases
        logger.info("SCF retry with level shift for dist=%.2fÅ", distance)
        mf = scf.UHF(mol)
        mf.max_cycle = 500
        mf.conv_tol = 1e-8
        mf.level_shift = 0.5
        mf.damp = 0.3
        mf.kernel()
        if not mf.converged:
            raise RuntimeError(
                f"SCF did not converge for {atom_string} charge={charge}")

    return mf.e_tot


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
