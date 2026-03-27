"""Pollutant identification and atom mapping for quantum simulation.

Parameter codes and names are sourced from the GEMStat dataset
(dataset-ex.txt). Keys are lowercased for case-insensitive lookup.
Values are (atom_symbol, charge, description).

For inorganic ions the atom symbol is the actual element.
For organic compounds the symbol represents the dominant toxic
functional-group atom (e.g. organochlorines → Cl, organophosphates → P,
PFAS → F, phenols → O, neutral aromatics/pharmaceuticals → C, etc.).
"""

# fmt: off
POLLUTANT_MAP: dict[str, tuple[str, int, str]] = {

    # ── Aluminium ─────────────────────────────────────────────────────────
    "al-dis":       ("Al",  3,  "Aluminium ion"),
    "al-tot":       ("Al",  3,  "Aluminium ion"),
    "aluminium":    ("Al",  3,  "Aluminium ion"),
    "aluminum":     ("Al",  3,  "Aluminium ion"),
    "al":           ("Al",  3,  "Aluminium ion"),

    # ── Ammonia / ammonium ─────────────────────────────────────────────────
    "nh3n":         ("N",   0,  "Ammonia"),
    "nh4n":         ("N",   1,  "Ammonium ion"),
    "ammonia":      ("N",   0,  "Ammonia"),

    # ── Antimony ───────────────────────────────────────────────────────────
    "sb-tot":       ("Sb",  3,  "Antimony ion"),
    "antimony":     ("Sb",  3,  "Antimony ion"),

    # ── Arsenic ────────────────────────────────────────────────────────────
    "as-dis":       ("As",  3,  "Arsenic ion"),
    "as-tot":       ("As",  3,  "Arsenic ion"),
    "arsenic":      ("As",  3,  "Arsenic ion"),
    "as":           ("As",  3,  "Arsenic ion"),

    # ── Barium ─────────────────────────────────────────────────────────────
    "ba-tot":       ("Ba",  2,  "Barium ion"),
    "barium":       ("Ba",  2,  "Barium ion"),

    # ── Beryllium ──────────────────────────────────────────────────────────
    "be-tot":       ("Be",  2,  "Beryllium ion"),
    "beryllium":    ("Be",  2,  "Beryllium ion"),

    # ── Bicarbonate ────────────────────────────────────────────────────────
    "hco3":         ("C",  -1,  "Bicarbonate"),
    "bicarbonate":  ("C",  -1,  "Bicarbonate"),

    # ── Bismuth ────────────────────────────────────────────────────────────
    "bi-ext":       ("Bi",  3,  "Bismuth ion"),
    "bi-tot":       ("Bi",  3,  "Bismuth ion"),
    "bismuth":      ("Bi",  3,  "Bismuth ion"),

    # ── Boron ──────────────────────────────────────────────────────────────
    "b-tot":        ("B",   3,  "Boron"),
    "b-dis":        ("B",   3,  "Boron"),
    "boron":        ("B",   3,  "Boron"),

    # ── Bromide / Bromine ──────────────────────────────────────────────────
    "br-dis":       ("Br", -1,  "Bromide ion"),
    "br-tot":       ("Br", -1,  "Bromide ion"),
    "br2-dis":      ("Br",  0,  "Bromine"),
    "bromide":      ("Br", -1,  "Bromide ion"),
    "bromine":      ("Br",  0,  "Bromine"),

    # ── Cadmium ────────────────────────────────────────────────────────────
    "cd-dis":       ("Cd",  2,  "Cadmium ion"),
    "cd-tot":       ("Cd",  2,  "Cadmium ion"),
    "cadmium":      ("Cd",  2,  "Cadmium ion"),
    "cd":           ("Cd",  2,  "Cadmium ion"),

    # ── Caesium ────────────────────────────────────────────────────────────
    "cs-ext":       ("Cs",  1,  "Caesium ion"),
    "cs-tot":       ("Cs",  1,  "Caesium ion"),
    "cs-dis":       ("Cs",  1,  "Caesium ion"),
    "caesium":      ("Cs",  1,  "Caesium ion"),
    "cesium":       ("Cs",  1,  "Caesium ion"),

    # ── Calcium ────────────────────────────────────────────────────────────
    "ca-dis":       ("Ca",  2,  "Calcium ion"),
    "ca-tot":       ("Ca",  2,  "Calcium ion"),
    "calcium":      ("Ca",  2,  "Calcium ion"),

    # ── Cerium ─────────────────────────────────────────────────────────────
    "ce-dis":       ("Ce",  3,  "Cerium ion"),
    "ce-tot":       ("Ce",  3,  "Cerium ion"),
    "ce-ext":       ("Ce",  3,  "Cerium ion"),
    "cerium":       ("Ce",  3,  "Cerium ion"),

    # ── Chloride ───────────────────────────────────────────────────────────
    "cl-dis":       ("Cl", -1,  "Chloride ion"),
    "cl-tot":       ("Cl", -1,  "Chloride ion"),
    "chloride":     ("Cl", -1,  "Chloride ion"),
    "chlorine":     ("Cl", -1,  "Chloride ion"),
    "cl":           ("Cl", -1,  "Chloride ion"),

    # ── Chromium ───────────────────────────────────────────────────────────
    "cr-dis":       ("Cr",  3,  "Chromium ion"),
    "cr-tot":       ("Cr",  3,  "Chromium ion"),
    "chromium":     ("Cr",  3,  "Chromium ion"),
    "cr":           ("Cr",  3,  "Chromium ion"),

    # ── Cobalt ─────────────────────────────────────────────────────────────
    "co-dis":       ("Co",  2,  "Cobalt ion"),
    "cobalt":       ("Co",  2,  "Cobalt ion"),

    # ── Copper ─────────────────────────────────────────────────────────────
    "cu-tot":       ("Cu",  2,  "Copper ion"),
    "cu-dis":       ("Cu",  2,  "Copper ion"),
    "copper":       ("Cu",  2,  "Copper ion"),
    "cu":           ("Cu",  2,  "Copper ion"),

    # ── Cyanide ────────────────────────────────────────────────────────────
    "cn-tot":       ("N",  -1,  "Cyanide (modeled as N)"),
    "cn-free":      ("N",  -1,  "Cyanide (modeled as N)"),
    "cyanide":      ("N",  -1,  "Cyanide (modeled as N)"),

    # ── Fluoride ───────────────────────────────────────────────────────────
    "f-dis":        ("F",  -1,  "Fluoride ion"),
    "f-tot":        ("F",  -1,  "Fluoride ion"),
    "fluoride":     ("F",  -1,  "Fluoride ion"),
    "f":            ("F",  -1,  "Fluoride ion"),

    # ── Gallium ────────────────────────────────────────────────────────────
    "ga-tot":       ("Ga",  3,  "Gallium ion"),
    "ga-ext":       ("Ga",  3,  "Gallium ion"),
    "gallium":      ("Ga",  3,  "Gallium ion"),

    # ── Hydroxide ──────────────────────────────────────────────────────────
    "oh":           ("O",  -1,  "Hydroxide"),
    "hydroxide":    ("O",  -1,  "Hydroxide"),

    # ── Iron ───────────────────────────────────────────────────────────────
    "fe-tot":       ("Fe",  3,  "Iron ion"),
    "fe-dis":       ("Fe",  3,  "Iron ion"),
    "iron":         ("Fe",  3,  "Iron ion"),

    # ── Lanthanum ──────────────────────────────────────────────────────────
    "la-ext":       ("La",  3,  "Lanthanum ion"),
    "la-tot":       ("La",  3,  "Lanthanum ion"),
    "lanthanum":    ("La",  3,  "Lanthanum ion"),

    # ── Lead ───────────────────────────────────────────────────────────────
    "pb-tot":       ("Pb",  2,  "Lead ion"),
    "pb-dis":       ("Pb",  2,  "Lead ion"),
    "lead":         ("Pb",  2,  "Lead ion"),
    "pb":           ("Pb",  2,  "Lead ion"),

    # ── Lithium ────────────────────────────────────────────────────────────
    "li-ext":       ("Li",  1,  "Lithium ion"),
    "li-tot":       ("Li",  1,  "Lithium ion"),
    "lithium":      ("Li",  1,  "Lithium ion"),

    # ── Magnesium ──────────────────────────────────────────────────────────
    "mg-dis":       ("Mg",  2,  "Magnesium ion"),
    "mg-tot":       ("Mg",  2,  "Magnesium ion"),
    "magnesium":    ("Mg",  2,  "Magnesium ion"),

    # ── Manganese ──────────────────────────────────────────────────────────
    "mn-dis":       ("Mn",  2,  "Manganese ion"),
    "mn-tot":       ("Mn",  2,  "Manganese ion"),
    "manganese":    ("Mn",  2,  "Manganese ion"),

    # ── Mercury ────────────────────────────────────────────────────────────
    "hg-dis":       ("Hg",  2,  "Mercury ion"),
    "hg-tot":       ("Hg",  2,  "Mercury ion"),
    "mercury":      ("Hg",  2,  "Mercury ion"),
    "hg":           ("Hg",  2,  "Mercury ion"),

    # ── Molybdenum ─────────────────────────────────────────────────────────
    "mo-tot":       ("Mo",  4,  "Molybdenum ion"),
    "molybdenum":   ("Mo",  4,  "Molybdenum ion"),

    # ── Nickel ─────────────────────────────────────────────────────────────
    "ni-dis":       ("Ni",  2,  "Nickel ion"),
    "ni-tot":       ("Ni",  2,  "Nickel ion"),
    "nickel":       ("Ni",  2,  "Nickel ion"),

    # ── Niobium ────────────────────────────────────────────────────────────
    "nb-ext":       ("Nb",  5,  "Niobium ion"),
    "nb-dis":       ("Nb",  5,  "Niobium ion"),
    "nb-tot":       ("Nb",  5,  "Niobium ion"),
    "niobium":      ("Nb",  5,  "Niobium ion"),

    # ── Nitrate / oxidised nitrogen ────────────────────────────────────────
    "no2n":         ("N",  -1,  "Nitrite (modeled as N)"),
    "no3n":         ("N",  -1,  "Nitrate (modeled as N)"),
    "noxn":         ("N",  -1,  "Oxidised nitrogen (modeled as N)"),
    "nitrate":      ("N",  -1,  "Nitrate (modeled as N)"),
    "no3":          ("N",  -1,  "Nitrate (modeled as N)"),
    "n":            ("N",  -1,  "Nitrate (modeled as N)"),

    # ── Orthophosphate ─────────────────────────────────────────────────────
    "drp":              ("P",  -3,  "Orthophosphate"),
    "orthophosphate":   ("P",  -3,  "Orthophosphate"),

    # ── Platinum ───────────────────────────────────────────────────────────
    "pt-dis":       ("Pt",  2,  "Platinum ion"),
    "pt-ext":       ("Pt",  2,  "Platinum ion"),
    "pt-tot":       ("Pt",  2,  "Platinum ion"),
    "platinum":     ("Pt",  2,  "Platinum ion"),

    # ── Potassium ──────────────────────────────────────────────────────────
    "k-tot":        ("K",   1,  "Potassium ion"),
    "k-dis":        ("K",   1,  "Potassium ion"),
    "potassium":    ("K",   1,  "Potassium ion"),

    # ── Rubidium ───────────────────────────────────────────────────────────
    "rb-ext":       ("Rb",  1,  "Rubidium ion"),
    "rb-tot":       ("Rb",  1,  "Rubidium ion"),
    "rubidium":     ("Rb",  1,  "Rubidium ion"),

    # ── Selenium ───────────────────────────────────────────────────────────
    "se-dis":       ("Se", -2,  "Selenide ion"),
    "se-tot":       ("Se", -2,  "Selenium"),
    "selenium":     ("Se", -2,  "Selenium"),

    # ── Silicate / Silicon ─────────────────────────────────────────────────
    "sio2-tot":     ("Si",  4,  "Silicate"),
    "sio2-dis":     ("Si",  4,  "Silicate"),
    "si-ext":       ("Si",  4,  "Silicon"),
    "si-dis":       ("Si",  4,  "Silicon"),
    "silicate":     ("Si",  4,  "Silicate"),
    "silicon":      ("Si",  4,  "Silicon"),

    # ── Silver ─────────────────────────────────────────────────────────────
    "ag-tot":       ("Ag",  1,  "Silver ion"),
    "ag-dis":       ("Ag",  1,  "Silver ion"),
    "silver":       ("Ag",  1,  "Silver ion"),

    # ── Sodium ─────────────────────────────────────────────────────────────
    "na-tot":       ("Na",  1,  "Sodium ion"),
    "na-dis":       ("Na",  1,  "Sodium ion"),
    "sodium":       ("Na",  1,  "Sodium ion"),

    # ── Strontium ──────────────────────────────────────────────────────────
    "sr-tot":       ("Sr",  2,  "Strontium ion"),
    "sr-ext":       ("Sr",  2,  "Strontium ion"),
    "strontium":    ("Sr",  2,  "Strontium ion"),

    # ── Sulfate ────────────────────────────────────────────────────────────
    "so4-dis":      ("S",  -2,  "Sulfate"),
    "so4-tot":      ("S",  -2,  "Sulfate"),
    "sulfate":      ("S",  -2,  "Sulfate"),

    # ── Thallium ───────────────────────────────────────────────────────────
    "tl-tot":       ("Tl",  1,  "Thallium ion"),
    "thallium":     ("Tl",  1,  "Thallium ion"),

    # ── Tin ────────────────────────────────────────────────────────────────
    "sn-tot":       ("Sn",  2,  "Tin ion"),
    "tin":          ("Sn",  2,  "Tin ion"),

    # ── Titanium ───────────────────────────────────────────────────────────
    "ti-tot":       ("Ti",  4,  "Titanium ion"),
    "titanium":     ("Ti",  4,  "Titanium ion"),

    # ── Tungsten ───────────────────────────────────────────────────────────
    "w-dis":        ("W",   6,  "Tungsten ion"),
    "w-tot":        ("W",   6,  "Tungsten ion"),
    "w-ext":        ("W",   6,  "Tungsten ion"),
    "tungsten":     ("W",   6,  "Tungsten ion"),

    # ── Uranium ────────────────────────────────────────────────────────────
    "u-dis":        ("U",   6,  "Uranium ion"),
    "u-tot":        ("U",   6,  "Uranium ion"),
    "uranium":      ("U",   6,  "Uranium ion"),

    # ── Vanadium ───────────────────────────────────────────────────────────
    "v-dis":        ("V",   5,  "Vanadium ion"),
    "v-tot":        ("V",   5,  "Vanadium ion"),
    "vanadium":     ("V",   5,  "Vanadium ion"),

    # ── Yttrium ────────────────────────────────────────────────────────────
    "y-tot":        ("Y",   3,  "Yttrium ion"),
    "y-ext":        ("Y",   3,  "Yttrium ion"),
    "yttrium":      ("Y",   3,  "Yttrium ion"),

    # ── Zinc ───────────────────────────────────────────────────────────────
    "zn-dis":       ("Zn",  2,  "Zinc ion"),
    "zn-tot":       ("Zn",  2,  "Zinc ion"),
    "zinc":         ("Zn",  2,  "Zinc ion"),
    "zn":           ("Zn",  2,  "Zinc ion"),

    # ══ Organic compounds ══════════════════════════════════════════════════
    # Atom chosen = dominant toxic functional-group atom.
    # Charge = 0 for neutral organic molecules.

    # ── Organochlorine pesticides (Cl) ─────────────────────────────────────
    "mcpb":         ("Cl",  0,  "2,4-MCPB (organochlorine)"),
    "2,4-mcpb":     ("Cl",  0,  "2,4-MCPB (organochlorine)"),
    "alachlor":     ("Cl",  0,  "Alachlor (chloroacetanilide)"),
    "aldrin":       ("Cl",  0,  "Aldrin (organochlorine)"),
    "bhc-beta":     ("Cl",  0,  "BHC-beta (organochlorine)"),
    "bhc-alpha":    ("Cl",  0,  "BHC-alpha (organochlorine)"),
    "bhc-gamma":    ("Cl",  0,  "BHC-gamma / lindane"),
    "bhc":          ("Cl",  0,  "BHC (organochlorine)"),
    "chlorfenvinphos": ("P", 0, "Chlorfenvinphos (organochlorophosphate)"),
    "chlorpyrifos": ("P",   0,  "Chlorpyrifos (organochlorophosphate)"),
    "44dde":        ("Cl",  0,  "DDE (organochlorine)"),
    "dde":          ("Cl",  0,  "DDE (organochlorine)"),
    "24ddt":        ("Cl",  0,  "DDT (organochlorine)"),
    "44ddt":        ("Cl",  0,  "DDT (organochlorine)"),
    "ddt":          ("Cl",  0,  "DDT (organochlorine)"),
    "dieldrin":     ("Cl",  0,  "Dieldrin (organochlorine)"),
    "endosulfan":   ("Cl",  0,  "Endosulfan (organochlorine)"),
    "endosulfani":  ("Cl",  0,  "Endosulfan I (organochlorine)"),
    "endrin":       ("Cl",  0,  "Endrin (organochlorine)"),
    "hcb":          ("Cl",  0,  "HCB (hexachlorobenzene)"),
    "heptachlorepox": ("Cl", 0, "Heptachlor epoxide (organochlorine)"),
    "isodrin":      ("Cl",  0,  "Isodrin (cyclodiene)"),
    "mcpa":         ("Cl",  0,  "MCPA (phenoxyacid)"),
    "mcppacid":     ("Cl",  0,  "Mecoprop (phenoxyacid)"),
    "mecoprop":     ("Cl",  0,  "Mecoprop (phenoxyacid)"),
    "metolachor":   ("Cl",  0,  "Metolachlor (chloroacetanilide)"),
    "pecbz":        ("Cl",  0,  "Pentachlorobenzene"),
    "pentachlorobenzene": ("Cl", 0, "Pentachlorobenzene"),
    "pcb":          ("Cl",  0,  "PCB (polychlorinated biphenyl)"),
    "pcp":          ("Cl",  0,  "PCP (pentachlorophenol)"),
    "quinoxyfen":   ("Cl",  0,  "Quinoxyfen (organochlorine)"),
    "sccp":         ("Cl",  0,  "SCCP (chlorinated paraffins)"),
    "44ddd":        ("Cl",  0,  "Rhothane/TDE (organochlorine)"),
    "rhothane":     ("Cl",  0,  "Rhothane (organochlorine)"),

    # ── Organophosphate pesticides (P) ─────────────────────────────────────
    "dichlorvos":   ("P",   0,  "Dichlorvos (organophosphate)"),
    "dimethoate":   ("P",   0,  "Dimethoate (organothiophosphate)"),
    "dimpylate":    ("P",   0,  "Dimpylate / diazinon (organothiophosphate)"),
    "fenitrothion": ("P",   0,  "Fenitrothion (organothiophosphate)"),
    "malathion":    ("P",   0,  "Malathion (organothiophosphate)"),
    "metaphos":     ("P",   0,  "Methyl parathion (organothiophosphate)"),
    "parathion":    ("P",   0,  "Parathion (organothiophosphate)"),

    # ── Triazine herbicides (N) ────────────────────────────────────────────
    "atrazine":     ("N",   0,  "Atrazine (triazine)"),
    "simazine":     ("N",   0,  "Simazine (triazine)"),
    "prometryn":    ("N",   0,  "Prometryn (triazine)"),
    "propazine":    ("N",   0,  "Propazine (triazine)"),
    "metamitron":   ("N",   0,  "Metamitron (triazine)"),
    "metribuzin":   ("N",   0,  "Metribuzin (triazinone)"),
    "triazine":     ("N",   0,  "Triazine herbicide"),

    # ── Phenylurea herbicides (N) ──────────────────────────────────────────
    "dcmu":         ("N",   0,  "Diuron / DCMU (phenylurea)"),
    "isoproturon":  ("N",   0,  "Isoproturon (phenylurea)"),
    "linuron":      ("N",   0,  "Linuron (phenylurea)"),
    "phenylurea":   ("N",   0,  "Phenylurea herbicide"),

    # ── Carbamate pesticides (N) ───────────────────────────────────────────
    "methiocarb":   ("N",   0,  "Methiocarb (carbamate)"),
    "methomyl":     ("N",   0,  "Methomyl (carbamate)"),
    "carbamate":    ("N",   0,  "Carbamate pesticide"),

    # ── Neonicotinoids (N) ─────────────────────────────────────────────────
    "clothianidine": ("N",  0,  "Clothianidine (neonicotinoid)"),
    "neonicotinoid": ("N",  0,  "Neonicotinoid"),

    # ── Dinitroaniline herbicides (N) ──────────────────────────────────────
    "pendimethalin": ("N",  0,  "Pendimethalin (dinitroaniline)"),
    "dinitroaniline": ("N", 0,  "Dinitroaniline herbicide"),

    # ── Other N-based pesticides / drugs ──────────────────────────────────
    "lenacil":      ("N",   0,  "Lenacil (pyrimidine)"),
    "pyrimidine":   ("N",   0,  "Pyrimidine pesticide"),
    "carbamazepine": ("N",  0,  "Carbamazepine (anticonvulsant)"),
    "urea":         ("N",   0,  "Urea-class compound"),
    "dimoxystrobin": ("N",  0,  "Dimoxystrobin (strobilurin)"),
    "strobilurin":  ("N",   0,  "Strobilurin fungicide"),

    # ── Sulfonyl/sulfur-based compounds (S) ───────────────────────────────
    "metsulfuron-methyl": ("S", 0, "Metsulfuron-methyl (sulfonylurea)"),
    "sulfonylurea": ("S",   0,  "Sulfonylurea herbicide"),
    "ethofumesate": ("S",   0,  "Ethofumesate (benzofuran/sulfonate)"),
    "benzofuran":   ("S",   0,  "Benzofuran herbicide"),

    # ── PFAS (F) ───────────────────────────────────────────────────────────
    "pfoa":         ("F",   0,  "PFOA (perfluorooctanoic acid)"),
    "pfos":         ("F",   0,  "PFOS (perfluorooctane sulfonate)"),

    # ── Phenols (O) ────────────────────────────────────────────────────────
    "4nnphl":       ("O",   0,  "Phenol (nonylphenol)"),
    "4nnphlbra":    ("O",   0,  "Phenol (nonylphenol branched)"),
    "4totphl":      ("O",   0,  "Total phenol"),
    "4ophlh":       ("O",   0,  "Octylphenol"),
    "clphenol":     ("O",   0,  "Chlorophenol"),
    "24dcp":        ("O",   0,  "2,4-Dichlorophenol"),
    "ioxynil":      ("O",   0,  "Ioxynil (iodophenol)"),
    "phenol":       ("O",   0,  "Phenol"),

    # ── PAH — polycyclic aromatic hydrocarbons (C) ─────────────────────────
    "bzbfla":       ("C",   0,  "Benzo[b]fluoranthene (PAH)"),
    "bzghipyl":     ("C",   0,  "Benzo[ghi]perylene (PAH)"),
    "flah":         ("C",   0,  "Fluoranthene / benzo[jk]fluorene (PAH)"),
    "bzkfla":       ("C",   0,  "Benzo[k]fluoranthene (PAH)"),
    "bap":          ("C",   0,  "Benzo[a]pyrene (PAH)"),
    "benzopyrene":  ("C",   0,  "Benzopyrene (PAH)"),
    "idn123cdpyr":  ("C",   0,  "Indeno[1,2,3-cd]pyrene (PAH)"),

    # ── VOC — benzene / toluene / xylene (C) ──────────────────────────────
    "benzene":      ("C",   0,  "Benzene (VOC)"),
    "tolh":         ("C",   0,  "Toluene (VOC)"),
    "toluene":      ("C",   0,  "Toluene (VOC)"),
    "hc-tot":       ("C",   0,  "Total hydrocarbons"),
    "hydrocarbons": ("C",   0,  "Total hydrocarbons"),
    "organic carbon": ("C", 0,  "Organic carbon"),
    "toc":          ("C",   0,  "Total organic carbon"),
    "doc":          ("C",   0,  "Dissolved organic carbon"),

    # ── Chlorinated VOCs (Cl) ──────────────────────────────────────────────
    "ccl4":         ("Cl",  0,  "Carbon tetrachloride"),
    "carbon tetrachloride": ("Cl", 0, "Carbon tetrachloride"),
    "cis-dce":      ("Cl",  0,  "cis-1,2-Dichloroethene"),
    "trans-dce":    ("Cl",  0,  "trans-1,2-Dichloroethene"),
    "dce":          ("Cl",  0,  "Dichloroethene"),
    "11dce":        ("Cl",  0,  "1,1-Dichloroethene"),
    "tce":          ("Cl",  0,  "Trichloroethylene (VOC)"),
    "pce":          ("Cl",  0,  "Tetrachloroethylene (VOC)"),
    "chloroethenes": ("Cl", 0,  "Chloroethenes"),
    "chloroethene": ("Cl",  0,  "Chloroethene"),
    "tcma":         ("Cl",  0,  "Chloroform / trichloromethane"),
    "chloroform":   ("Cl",  0,  "Chloroform"),
    "mecl":         ("Cl",  0,  "Methylene dichloride"),
    "methylene dichloride": ("Cl", 0, "Methylene dichloride"),
    "edc":          ("Cl",  0,  "Ethylene dichloride (1,2-DCA)"),
    "ethylene dichloride": ("Cl", 0, "Ethylene dichloride"),
    "1122ttceta":   ("Cl",  0,  "1,1,2,2-Tetrachloroethane"),
    "1112ttceta":   ("Cl",  0,  "1,1,1,2-Tetrachloroethane"),
    "tetrachloroethane": ("Cl", 0, "Tetrachloroethane"),
    "135tcbz":      ("Cl",  0,  "1,3,5-Trichlorobenzene"),
    "124tcbz":      ("Cl",  0,  "1,2,4-Trichlorobenzene"),
    "123tcbz":      ("Cl",  0,  "1,2,3-Trichlorobenzene"),
    "tcb-tot":      ("Cl",  0,  "Total trichlorobenzene"),
    "trichlorobenzene": ("Cl", 0, "Trichlorobenzene"),

    # ── Brominated VOCs (Br) ───────────────────────────────────────────────
    "bromoform":    ("Br",  0,  "Bromoform (tribromomethane)"),
    "chlorodibromomethane": ("Br", 0, "Chlorodibromomethane"),
    "bdcma":        ("Br",  0,  "Bromodichloromethane"),
    "dichlorobromomethane": ("Br", 0, "Dichlorobromomethane"),
    "dibromochloromethane": ("Br", 0, "Dibromochloromethane"),

    # ── Pharmaceuticals / neutral organics (C) ────────────────────────────
    "diclofenac":   ("C",   0,  "Diclofenac (NSAID)"),
    "naproxen":     ("C",   0,  "Naproxen (NSAID)"),
    "anti-inflammatory drug": ("C", 0, "Anti-inflammatory drug"),
    "erythromycin": ("C",   0,  "Erythromycin (antibiotic)"),
    "azithromycin": ("C",   0,  "Azithromycin (antibiotic)"),
    "tmp":          ("N",   0,  "Trimethoprim (antibiotic)"),
    "smx":          ("S",   0,  "Sulfamethoxazole (sulfa antibiotic)"),
    "antibiotic":   ("C",   0,  "Antibiotic"),
    "bezafibrate":  ("C",   0,  "Bezafibrate (antilipidemic)"),
    "antilipidemic agent": ("C", 0, "Antilipidemic agent"),
    "atenolol":     ("N",   0,  "Atenolol (beta blocker)"),
    "beta blocker": ("N",   0,  "Beta blocker"),
    "anniline":     ("N",   0,  "Aniline derivative"),
}
# fmt: on

# ── Proxy atoms ────────────────────────────────────────────────────────────────
# Elements with Z > 36 lack PySCF STO-3G coverage.
# Each maps to the nearest same-group element that IS covered.
PROXY_ATOMS: dict[str, str] = {
    # Period 5 — same-group lighter analogue
    "Rb": "K",   # group 1
    "Sr": "Ca",  # group 2
    "Y":  "Sc",  # group 3
    "Nb": "V",   # group 5
    "Mo": "Cr",  # group 6
    "Ag": "Cu",  # group 11
    "Cd": "Zn",  # group 12
    "Sn": "Ge",  # group 14
    "Sb": "As",  # group 15
    "I":  "Br",  # group 17
    # Period 6
    "Cs": "K",   # group 1
    "Ba": "Ca",  # group 2
    "La": "Sc",  # lanthanide → group 3
    "Ce": "Sc",  # lanthanide → group 3
    "W":  "Cr",  # group 6
    "Pt": "Ni",  # group 10
    "Hg": "Zn",  # group 12
    "Tl": "Ga",  # group 13
    "Pb": "Ge",  # group 14
    "Bi": "As",  # group 15
    # Period 7+
    "U":  "Fe",  # actinide rough proxy (both +6 accessible)
}

# ── STO-3G supported elements ─────────────────────────────────────────────────
# PySCF provides STO-3G for H through Kr (Z = 1–36).
STO3G_SUPPORTED: set[str] = {
    # Period 1
    "H",  "He",
    # Period 2
    "Li", "Be", "B",  "C",  "N",  "O",  "F",  "Ne",
    # Period 3
    "Na", "Mg", "Al", "Si", "P",  "S",  "Cl", "Ar",
    # Period 4
    "K",  "Ca",
    "Sc", "Ti", "V",  "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
    "Ga", "Ge", "As", "Se", "Br", "Kr",
}


def get_simulation_atom(symbol: str) -> str:
    """Return an atom symbol usable with the STO-3G basis in PySCF.

    Follows the proxy chain transitively for heavy elements.
    Falls back to Cl if no valid proxy is found.
    """
    seen: set[str] = set()
    current = symbol
    while current not in STO3G_SUPPORTED:
        if current in seen:
            break
        seen.add(current)
        proxy = PROXY_ATOMS.get(current)
        if proxy is None:
            break
        current = proxy
    return current if current in STO3G_SUPPORTED else "Cl"


def identify_pollutant(params: list[dict]) -> tuple[str, int, str]:
    """Given measurement parameters, return the dominant pollutant.

    Scans the parameter list, matches each ``name`` (case-insensitive)
    against POLLUTANT_MAP, and returns the entry with the highest ``value``.
    Falls back to Cl⁻ if nothing matches.

    Args:
        params: list of dicts with at least ``name`` and ``value`` keys.

    Returns:
        ``(atom_symbol, charge, description)`` for the dominant pollutant.
    """
    best_match: tuple[str, int, str] | None = None
    best_value = -1.0

    for p in params:
        name = str(p.get("name", "")).strip().lower()
        value = float(p.get("value", 0))

        if name in POLLUTANT_MAP and value > best_value:
            best_value = value
            best_match = POLLUTANT_MAP[name]

    return best_match if best_match is not None else ("Cl", -1, "Chloride ion (default)")


def identify_all_pollutants(params: list[dict]) -> list[tuple[str, int, str, float]]:
    """Return all matched pollutants from *params*, sorted by concentration descending.

    Each entry is ``(atom_symbol, charge, description, value)``.
    If nothing matches, returns a single Cl⁻ fallback entry.
    """
    matches: list[tuple[str, int, str, float]] = []
    seen_symbols: set[str] = set()

    for p in params:
        name = str(p.get("name", "")).strip().lower()
        value = float(p.get("value", 0))

        if name in POLLUTANT_MAP:
            symbol, charge, desc = POLLUTANT_MAP[name]
            # Deduplicate by symbol — keep the highest concentration
            if symbol in seen_symbols:
                matches = [
                    (s, c, d, max(v, value) if s == symbol else v)
                    for s, c, d, v in matches
                ]
            else:
                seen_symbols.add(symbol)
                matches.append((symbol, charge, desc, value))

    if not matches:
        return [("Cl", -1, "Chloride ion (default)", 0.0)]

    matches.sort(key=lambda m: m[3], reverse=True)
    return matches
