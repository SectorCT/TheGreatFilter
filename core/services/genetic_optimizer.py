"""Genetic algorithm optimizer for nano-filtration filter design.

Uses DEAP to evolve filter parameters (pore size, layer thickness,
material type) with quantum binding energy as fitness.

Note: lattice_spacing is fixed at the known physical constant for the
material (2.46 Å for graphene C-C bond length) rather than evolved,
because the simplified single-atom quantum model does not capture its effect.
"""

import logging
import random
import math
from deap import base, creator, tools, algorithms

from services.quantum_engine import compute_binding_energy

logger = logging.getLogger("h2osim.ga")

# Gene bounds: [pore_size_nm, layer_thickness_nm, material_idx]
GENE_BOUNDS = [
    (0.3, 2.0),    # pore_size in nm
    (0.5, 5.0),    # layer_thickness in nm
    (0.0, 1.0),    # material_type index (0=graphene, 1=CNT)
]

MATERIAL_TYPES = ["graphene", "cnt"]
LATTICE_SPACING = 2.46  # Å — graphene C-C bond length (physical constant)


def _init_individual(icls):
    return icls([random.uniform(lo, hi) for lo, hi in GENE_BOUNDS])


def _evaluate(individual, pollutant_symbol, pollutant_charge, temperature, ph):
    """Fitness function: run VQE and return (abs(binding_energy),)."""
    pore_size = individual[0]

    result = compute_binding_energy(
        pollutant_symbol=pollutant_symbol,
        pollutant_charge=pollutant_charge,
        pore_size_nm=pore_size,
        temperature_c=temperature,
        ph=ph,
    )

    # Maximize absolute binding energy (stronger binding = better filter)
    fitness = abs(result["binding_energy"])
    return (fitness,)


def _clamp_individual(individual):
    """Clamp genes to valid bounds after mutation/crossover."""
    for i, (lo, hi) in enumerate(GENE_BOUNDS):
        individual[i] = max(lo, min(hi, individual[i]))
    return individual


def optimize_filter(
    pollutant_symbol: str,
    pollutant_charge: int,
    temperature: float = 25.0,
    ph: float = 7.0,
    pop_size: int = 8,
    n_gen: int = 3,
) -> dict:
    """Run genetic algorithm to find optimal filter parameters.

    Args:
        pollutant_symbol: Chemical symbol (e.g. "Pb", "Cl")
        pollutant_charge: Ionic charge
        temperature: Water temperature in °C
        ph: Water pH
        pop_size: GA population size
        n_gen: Number of GA generations

    Returns:
        dict with optimized filter parameters and simulation results.
    """
    # Guard against double-creation of DEAP fitness/individual classes
    if not hasattr(creator, "FitnessMax"):
        creator.create("FitnessMax", base.Fitness, weights=(1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", list, fitness=creator.FitnessMax)

    toolbox = base.Toolbox()
    toolbox.register("individual", _init_individual, creator.Individual)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)
    toolbox.register(
        "evaluate", _evaluate,
        pollutant_symbol=pollutant_symbol,
        pollutant_charge=pollutant_charge,
        temperature=temperature,
        ph=ph,
    )
    toolbox.register("mate", tools.cxTwoPoint)
    toolbox.register("mutate", tools.mutGaussian, mu=0, sigma=0.3, indpb=0.3)
    toolbox.register("select", tools.selTournament, tournsize=3)

    # Create initial population
    pop = toolbox.population(n=pop_size)
    logger.info("GA: evaluating initial population of %d", pop_size)

    # Evaluate initial population
    fitnesses = list(map(toolbox.evaluate, pop))
    for ind, fit in zip(pop, fitnesses):
        ind.fitness.values = fit

    best_fitness = max(f[0] for f in fitnesses)
    logger.info("GA gen 0: best_fitness=%.6f", best_fitness)

    # Evolve
    for gen in range(n_gen):
        offspring = toolbox.select(pop, len(pop))
        offspring = list(map(toolbox.clone, offspring))

        # Crossover
        for child1, child2 in zip(offspring[::2], offspring[1::2]):
            if random.random() < 0.7:
                toolbox.mate(child1, child2)
                _clamp_individual(child1)
                _clamp_individual(child2)
                del child1.fitness.values
                del child2.fitness.values

        # Mutation
        for mutant in offspring:
            if random.random() < 0.3:
                toolbox.mutate(mutant)
                _clamp_individual(mutant)
                del mutant.fitness.values

        # Evaluate individuals with invalidated fitness
        invalid = [ind for ind in offspring if not ind.fitness.valid]
        fitnesses = list(map(toolbox.evaluate, invalid))
        for ind, fit in zip(invalid, fitnesses):
            ind.fitness.values = fit

        pop[:] = offspring

        gen_best = max(ind.fitness.values[0] for ind in pop)
        logger.info("GA gen %d: evaluated=%d best_fitness=%.6f",
                     gen + 1, len(invalid), gen_best)

    # Get best individual
    best = tools.selBest(pop, 1)[0]

    # Final VQE call on best to get full results
    final_result = compute_binding_energy(
        pollutant_symbol=pollutant_symbol,
        pollutant_charge=pollutant_charge,
        pore_size_nm=best[0],
        temperature_c=temperature,
        ph=ph,
    )

    material_idx = int(round(best[2]))
    material_idx = max(0, min(material_idx, len(MATERIAL_TYPES) - 1))

    return {
        "pore_size": round(best[0], 4),
        "layer_thickness": round(best[1], 4),
        "lattice_spacing": LATTICE_SPACING,
        "material_type": MATERIAL_TYPES[material_idx],
        "binding_energy": final_result["binding_energy"],
        "removal_efficiency": final_result["removal_efficiency"],
        "converged": final_result["converged"],
        "method": final_result.get("method", "unknown"),
    }
