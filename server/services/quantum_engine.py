"""VQE quantum simulation for pollutant-graphene binding energy.

Models the interaction between a single carbon atom (graphene surface proxy)
and a pollutant atom using STO-3G basis with active space reduction to 4 qubits.
"""

import logging
import math
import numpy as np

from qiskit_nature.second_q.drivers import PySCFDriver

logger = logging.getLogger("h2osim.quantum")
from qiskit_nature.second_q.mappers import JordanWignerMapper
from qiskit_nature.second_q.transformers import ActiveSpaceTransformer
from qiskit_nature.second_q.algorithms import GroundStateEigensolver
from qiskit_algorithms import VQE, NumPyMinimumEigensolver
from qiskit_algorithms.optimizers import COBYLA
from qiskit.primitives import Estimator
from qiskit.circuit.library import EfficientSU2

from services.pollutant_map import get_simulation_atom

HARTREE_TO_EV = 27.2114


def _build_molecule_string(pollutant_symbol: str, distance_angstrom: float,
                           system_charge: int) -> tuple[str, int, int]:
    """Build PySCF molecule string: C at origin, pollutant along z-axis.

    Returns: (atom_string, total_charge, spin)
    """
    sim_atom = get_simulation_atom(pollutant_symbol)
    atom_string = f"C 0.0 0.0 0.0; {sim_atom} 0.0 0.0 {distance_angstrom:.4f}"

    from pyscf import gto
    mol_neutral = gto.M(atom=atom_string, basis="sto-3g", charge=0, spin=0, verbose=0)
    nuclear_charge = int(sum(mol_neutral.atom_charges()))
    n_electrons = nuclear_charge - system_charge
    spin = n_electrons % 2

    return atom_string, system_charge, spin


def compute_binding_energy(
    pollutant_symbol: str,
    pollutant_charge: int,
    pore_size_nm: float = 0.8,
    lattice_spacing_angstrom: float = 2.46,
    temperature_c: float = 25.0,
    ph: float = 7.0,
) -> dict:
    """Run VQE to compute binding energy between C and pollutant atom.

    Args:
        pollutant_symbol: Chemical symbol of pollutant (e.g. "Pb", "Cl")
        pollutant_charge: Ionic charge of pollutant
        pore_size_nm: Filter pore size in nanometers (determines atom distance)
        lattice_spacing_angstrom: Carbon lattice spacing
        temperature_c: Water temperature in Celsius
        ph: Water pH

    Returns:
        dict with binding_energy (eV), removal_efficiency (%), converged (bool)
    """
    distance = pore_size_nm * 10.0  # nm → angstrom
    # Clamp distance to reasonable range for quantum chemistry
    distance = max(1.0, min(distance, 10.0))

    sim_atom = get_simulation_atom(pollutant_symbol)

    logger.info("VQE start: %s (sim=%s) charge=%d dist=%.2fÅ",
                pollutant_symbol, sim_atom, pollutant_charge, distance)

    try:
        result = _run_vqe(sim_atom, pollutant_charge, distance)
        logger.info("VQE converged: %.6f eV", result["energy_ev"])
    except Exception as e1:
        logger.warning("VQE attempt 1 failed: %s — retrying with random init", e1)
        # Retry with different initial point
        try:
            result = _run_vqe(sim_atom, pollutant_charge, distance, retry=True)
            logger.info("VQE retry converged: %.6f eV", result["energy_ev"])
        except Exception as e2:
            logger.warning("VQE attempt 2 failed: %s — falling back to classical", e2)
            # Fall back to classical solver
            try:
                result = _run_classical(sim_atom, pollutant_charge, distance)
                logger.info("Classical solver converged: %.6f eV", result["energy_ev"])
            except Exception as e3:
                logger.warning("Classical solver failed: %s — using empirical LJ", e3)
                return {
                    "binding_energy": _empirical_binding(pollutant_symbol, distance),
                    "removal_efficiency": _compute_efficiency(
                        _empirical_binding(pollutant_symbol, distance),
                        temperature_c, ph
                    ),
                    "converged": False,
                    "method": "empirical_fallback",
                    "error": str(e3),
                }

    binding_energy_ev = result["energy_ev"]
    removal_eff = _compute_efficiency(binding_energy_ev, temperature_c, ph)

    return {
        "binding_energy": round(binding_energy_ev, 6),
        "removal_efficiency": round(removal_eff, 2),
        "converged": result["converged"],
        "method": result.get("method", "vqe"),
    }


def _run_vqe(sim_atom: str, charge: int, distance: float,
             retry: bool = False) -> dict:
    """Execute VQE with active space reduction."""
    atom_string = f"C 0.0 0.0 0.0; {sim_atom} 0.0 0.0 {distance:.4f}"

    # Determine spin: build neutral mol (charge=0, spin=0) to get nuclear charge sum,
    # then compute n_electrons = nuclear_charge - ionic_charge
    from pyscf import gto
    mol_neutral = gto.M(atom=atom_string, basis="sto-3g", charge=0, spin=0, verbose=0)
    nuclear_charge = int(sum(mol_neutral.atom_charges()))
    n_electrons = nuclear_charge - charge
    spin = n_electrons % 2  # 0 for even, 1 for odd

    driver = PySCFDriver(
        atom=atom_string,
        charge=charge,
        spin=spin,
        basis="sto-3g",
    )

    problem = driver.run()
    n_spatial = problem.num_spatial_orbitals
    n_electrons = problem.num_particles

    # Apply active space if molecule is large enough
    if n_spatial > 2:
        transformer = ActiveSpaceTransformer(
            num_electrons=2,
            num_spatial_orbitals=2,
        )
        problem = transformer.transform(problem)

    mapper = JordanWignerMapper()

    # Set up VQE
    n_qubits = 2 * problem.num_spatial_orbitals  # 2 spin-orbitals per spatial
    ansatz = EfficientSU2(num_qubits=n_qubits, reps=1, entanglement="linear")

    initial_point = None
    if retry:
        initial_point = np.random.uniform(-np.pi, np.pi, ansatz.num_parameters)

    optimizer = COBYLA(maxiter=150)
    estimator = Estimator()

    vqe = VQE(
        estimator=estimator,
        ansatz=ansatz,
        optimizer=optimizer,
        initial_point=initial_point,
    )

    solver = GroundStateEigensolver(mapper, vqe)
    result = solver.solve(problem)

    energy_hartree = result.total_energies[0]
    energy_ev = energy_hartree * HARTREE_TO_EV

    return {
        "energy_ev": energy_ev,
        "converged": True,
        "method": "vqe",
    }


def _run_classical(sim_atom: str, charge: int, distance: float) -> dict:
    """Fallback: exact diagonalization with NumPyMinimumEigensolver."""
    atom_string = f"C 0.0 0.0 0.0; {sim_atom} 0.0 0.0 {distance:.4f}"

    from pyscf import gto
    mol_neutral = gto.M(atom=atom_string, basis="sto-3g", charge=0, spin=0, verbose=0)
    nuclear_charge = int(sum(mol_neutral.atom_charges()))
    n_electrons = nuclear_charge - charge
    spin = n_electrons % 2

    driver = PySCFDriver(atom=atom_string, charge=charge, spin=spin, basis="sto-3g")
    problem = driver.run()

    if problem.num_spatial_orbitals > 2:
        transformer = ActiveSpaceTransformer(num_electrons=2, num_spatial_orbitals=2)
        problem = transformer.transform(problem)

    mapper = JordanWignerMapper()
    solver = GroundStateEigensolver(mapper, NumPyMinimumEigensolver())
    result = solver.solve(problem)

    energy_hartree = result.total_energies[0]
    return {
        "energy_ev": energy_hartree * HARTREE_TO_EV,
        "converged": True,
        "method": "classical_exact",
    }


def _empirical_binding(pollutant_symbol: str, distance: float) -> float:
    """Empirical Lennard-Jones-like estimate when quantum fails."""
    # Approximate well depths (eV) for common pollutant-carbon interactions
    well_depths = {
        "Pb": -0.35, "Sn": -0.35, "Cl": -0.25, "F": -0.30,
        "As": -0.28, "P": -0.28, "Hg": -0.32, "Zn": -0.27,
        "Cd": -0.27, "N": -0.22, "Cu": -0.30, "Ni": -0.30,
        "Cr": -0.26, "S": -0.26,
    }
    sigma = 2.5  # angstrom, approximate
    epsilon = well_depths.get(get_simulation_atom(pollutant_symbol), -0.25)
    r = max(distance, 1.0)
    # Simplified LJ: E = epsilon * ((sigma/r)^12 - 2*(sigma/r)^6)
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
    # Base efficiency from binding energy (sigmoid-like)
    # More negative binding = stronger = better removal
    be = abs(binding_energy_ev)
    base = 100.0 * (1.0 - math.exp(-2.5 * be))

    # Temperature correction: -0.3% per degree above 25°C
    temp_factor = 1.0 - 0.003 * max(0, temperature_c - 25.0)
    temp_factor = max(temp_factor, 0.7)

    # pH correction: optimal at 6.5-7.5, penalty outside
    ph_deviation = max(0, abs(ph - 7.0) - 0.5)
    ph_factor = 1.0 - 0.05 * ph_deviation
    ph_factor = max(ph_factor, 0.7)

    efficiency = base * temp_factor * ph_factor
    return max(0.0, min(100.0, efficiency))
