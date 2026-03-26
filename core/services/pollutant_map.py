"""Pollutant identification and atom mapping for quantum simulation."""

# Maps lowercase parameter names/codes to (atom_symbol, charge, description)
POLLUTANT_MAP: dict[str, tuple[str, int, str]] = {
    "lead": ("Pb", 2, "Lead ion"),
    "pb": ("Pb", 2, "Lead ion"),
    "chlorine": ("Cl", -1, "Chloride ion"),
    "cl": ("Cl", -1, "Chloride ion"),
    "fluoride": ("F", -1, "Fluoride ion"),
    "f": ("F", -1, "Fluoride ion"),
    "arsenic": ("As", 3, "Arsenic ion"),
    "as": ("As", 3, "Arsenic ion"),
    "mercury": ("Hg", 2, "Mercury ion"),
    "hg": ("Hg", 2, "Mercury ion"),
    "cadmium": ("Cd", 2, "Cadmium ion"),
    "cd": ("Cd", 2, "Cadmium ion"),
    "nitrate": ("N", -1, "Nitrate (modeled as N)"),
    "no3": ("N", -1, "Nitrate (modeled as N)"),
    "n": ("N", -1, "Nitrate (modeled as N)"),
    "copper": ("Cu", 2, "Copper ion"),
    "cu": ("Cu", 2, "Copper ion"),
    "zinc": ("Zn", 2, "Zinc ion"),
    "zn": ("Zn", 2, "Zinc ion"),
    "chromium": ("Cr", 3, "Chromium ion"),
    "cr": ("Cr", 3, "Chromium ion"),
}

# Heavy elements that lack STO-3G basis → lighter proxy from same periodic group
PROXY_ATOMS: dict[str, str] = {
    "Pb": "Sn",
    "Hg": "Zn",
    "Cd": "Zn",
    "As": "P",
    "Cr": "S",   # Cr lacks STO-3G; S is a rough proxy for electron count
    "Cu": "Ni",  # fallback if Cu missing
    "Sn": "Si",  # fallback if Sn missing
}

# Elements known to work with STO-3G in PySCF
STO3G_SUPPORTED = {"H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
                   "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
                   "K", "Ca", "Ni", "Zn"}


def get_simulation_atom(symbol: str) -> str:
    """Return an atom symbol usable with STO-3G basis.
    Follows proxy chain transitively for unsupported heavy elements."""
    seen = set()
    current = symbol
    while current not in STO3G_SUPPORTED and current not in seen:
        seen.add(current)
        proxy = PROXY_ATOMS.get(current)
        if proxy is None:
            break
        current = proxy
    if current in STO3G_SUPPORTED:
        return current
    # Ultimate fallback: Cl (common, well-supported)
    return "Cl"


def identify_pollutant(params: list[dict]) -> tuple[str, int, str]:
    """Given measurement parameters, find the highest-value matching pollutant.

    Args:
        params: list of dicts with at least 'name' and 'value' keys.

    Returns:
        (atom_symbol, charge, description) for the dominant pollutant.
        Falls back to Cl- if nothing matches.
    """
    best_match = None
    best_value = -1.0

    for p in params:
        name = str(p.get("name", "")).strip().lower()
        value = float(p.get("value", 0))

        if name in POLLUTANT_MAP and value > best_value:
            best_value = value
            best_match = POLLUTANT_MAP[name]

    if best_match is None:
        return ("Cl", -1, "Chloride ion (default)")

    return best_match
