export type ParameterOption = {
  id: string
  file: string
  code: string
  name: string
  unit: string
  group: string
}

const rawParametersCsv = `Pesticides_M_to_R.csv,MCPB,"2,4-MCPB",µg/l
Pesticide_A_B.csv,ALACHLOR,Alachlor,µg/l
Persistent_Organic_Pesticides.csv,ALDRIN,Aldrin,µg/l
Alkalinity.csv,Alk-Tot,Alkalinity,mg/l
Aluminium.csv,Al-Dis,Aluminium,mg/l
Aluminium.csv,Al-Tot,Aluminium,mg/l
Other_Nitrogen.csv,NH3N,Ammonia,mg/l
Other_Nitrogen.csv,NH4N,Ammonia,mg/l
Pesticides_M_to_R.csv,METOLACHOR,Anniline,µg/l
Pharmaceuticals.csv,DICLOFENAC,Anti-Inflammatory Drug,µg/l
Pharmaceuticals.csv,NAPROXEN,Anti-Inflammatory Drug,µg/l
Pharmaceuticals.csv,ERYTHROMYCIN,Antibiotic,µg/l
Pharmaceuticals.csv,AZITHROMYCIN,Antibiotic,µg/l
Pharmaceuticals.csv,TMP,Antibiotic,µg/l
Pharmaceuticals.csv,SMX,Antibiotic,µg/l
Pharmaceuticals.csv,BEZAFIBRATE,Antilipidemic Agent,µg/l
Antimony.csv,Sb-Tot,Antimony,mg/l
Arsenic.csv,As-Dis,Arsenic,mg/l
Arsenic.csv,As-Tot,Arsenic,mg/l
Persistent_Organic_Pesticides.csv,BHC-beta,BHC,µg/l
Persistent_Organic_Pesticides.csv,BHC-alpha,BHC,µg/l
Persistent_Organic_Pesticides.csv,BHC,BHC,µg/l
Persistent_Organic_Pesticides.csv,BHC-gamma,BHC,µg/l
Barium.csv,Ba-Tot,Barium,mg/l
Volatile_Organic_Compounds.csv,BENZENE,Benzene,µg/l
PAH.csv,BZBFLA,Benzo[b]fluoranthene,µg/l
PAH.csv,BZGHIPYL,Benzo[ghi]perylene,µg/l
PAH.csv,FLAH,Benzo[jk]fluorene,µg/l
PAH.csv,BZKFLA,Benzo[k]fluoranthene,µg/l
Pesticides_E_to_L.csv,ETHOFUMESATE,Benzofuran,µg/l
PAH.csv,BAP,Benzopyrene,µg/l
Berillium.csv,Be-Tot,Beryllium,mg/l
Pharmaceuticals.csv,ATENOLOL,Beta Blocker,µg/l
Bicarbonate.csv,HCO3,Bicarbonate,mg/l
Bismuth.csv,Bi-Ext,Bismuth,µg/l
Bismuth.csv,Bi-Tot,Bismuth,µg/l
Boron.csv,B-Tot,Boron,mg/l
Boron.csv,B-Dis,Boron,mg/l
Bromine.csv,Br-Dis,Bromide,mg/l
Bromine.csv,Br-Tot,Bromide,mg/l
Bromine.csv,Br2-Dis,Bromine,mg/l
Halocarbon.csv,BROMOFORM,Bromoform,µg/l
Cadmium.csv,Cd-Dis,Cadmium,µg/l
Cadmium.csv,Cd-Tot,Cadmium,µg/l
Caesium.csv,Cs-Ext,Caesium,µg/l
Caesium.csv,Cs-Tot,Caesium,µg/l
Caesium.csv,Cs-Dis,Caesium,µg/l
Calcium.csv,Ca-Dis,Calcium,mg/l
Calcium.csv,Ca-Tot,Calcium,mg/l
Pesticides_M_to_R.csv,METHIOCARB,Carbamate,µg/l
Volatile_Organic_Compounds.csv,CCl4,Carbon Tetrachloride,µg/l
Cerium.csv,Ce-Dis,Cerium,µg/l
Cerium.csv,Ce-Tot,Cerium,µg/l
Cerium.csv,Ce-Ext,Cerium,µg/l
Pesticides_C_D.csv,CHLORFENVINPHOS,Chlorfenvinphos,µg/l
Chloride.csv,Cl-Dis,Chloride,mg/l
Chloride.csv,Cl-Tot,Chloride,mg/l
Halocarbon.csv,cis-DCE,Chloroethene,µg/l
Halocarbon.csv,DCE,Chloroethene,µg/l
Halocarbon.csv,11DCE,Chloroethene,µg/l
Halocarbon.csv,trans-DCE,Chloroethene,µg/l
Volatile_Organic_Compounds.csv,TCE,Chloroethenes,µg/l
Volatile_Organic_Compounds.csv,PCE,Chloroethenes,µg/l
Halocarbon.csv,TCMA,Chloroform,µg/l
Pigment.csv,Chl-a,Chlorophyll A,mg/l
Pesticides_C_D.csv,CHLORPYRIFOS,Chlorpyrifos,µg/l
Chromium.csv,Cr-Dis,Chromium,mg/l
Chromium.csv,Cr-Tot,Chromium,mg/l
Cobalt.csv,Co-Dis,Cobalt,mg/l
Indicator_Organism.csv,FECALCOLI,Coliforms,1/100 ml
Indicator_Organism.csv,ECOLI,Coliforms,1/100 ml
Indicator_Organism.csv,TOTCOLI,Coliforms,1/100 ml
Copper.csv,Cu-Tot,Copper,mg/l
Copper.csv,Cu-Dis,Copper,mg/l
Cyanide.csv,CN-Tot,Cyanide,mg/l
Cyanide.csv,CN-Free,Cyanide,mg/l
Pesticides_E_to_L.csv,ISODRIN,Cyclodiene Pesticide,µg/l
Pesticides_C_D.csv,44DDE,DDE,µg/l
Pesticides_C_D.csv,24DDT,DDT,µg/l
Pesticides_C_D.csv,44DDT,DDT,µg/l
Persistent_Organic_Pesticides.csv,DDT,DDT,µg/l
Halocarbon.csv,CHLORODIBROMOMETHANE,Dibromochloromethane,µg/l
Halocarbon.csv,BDCMA,Dichlorobromomethane,µg/l
Pesticides_C_D.csv,DICHLORVOS,Dichlorvos,µg/l
Persistent_Organic_Pesticides.csv,DIELDRIN,Dieldrin,µg/l
Pesticides_M_to_R.csv,PENDIMETHALIN,Dinitroaniline,µg/l
Flux.csv,Q-Inst,Discharge,m³/s
Water.csv,TDS,Dissolved Solids,mg/l
Electrical_Conductance.csv,EC,Electrical Conductance,µS/cm
Persistent_Organic_Pesticides.csv,ENDOSULFAN,Endosulfan,µg/l
Persistent_Organic_Pesticides.csv,ENDOSULFANI,Endosulfan,µg/l
Persistent_Organic_Pesticides.csv,ENDRIN,Endrin,µg/l
Volatile_Organic_Compounds.csv,EDC,Ethylene Dichloride,µg/l
Fluoride.csv,F-Dis,Fluoride,mg/l
Fluoride.csv,F-Tot,Fluoride,mg/l
Gallium.csv,Ga-Tot,Gallium,µg/l
Gallium.csv,Ga-Ext,Gallium,µg/l
Persistent_Organic_Pesticides.csv,HCB,HCB,µg/l
Hardness.csv,H-T,Hardness,mg/l
Pesticides_E_to_L.csv,HEPTACHLOREPOX,Heptachlor Epoxide,µg/l
Organic.csv,HC-Tot,Hydrocarbons,µg/l
Hydroxide.csv,OH,Hydroxide,mg/l
Iron.csv,Fe-Tot,Iron,mg/l
Iron.csv,Fe-Dis,Iron,mg/l
Pesticides_E_to_L.csv,ISOPROTURON,Isoproturon,µg/l
Lanthanum.csv,La-Ext,Lanthanum,µg/l
Lanthanum.csv,La-Tot,Lanthanum,µg/l
Lead.csv,Pb-Tot,Lead,mg/l
Lead.csv,Pb-Dis,Lead,mg/l
Lithium.csv,Li-Ext,Lithium,µg/l
Lithium.csv,Li-Tot,Lithium,µg/l
Lithium.csv,Li-Tot,Lithium,mg/l
Pesticides_M_to_R.csv,MCPA,MCPA,µg/l
Magnesium.csv,Mg-Dis,Magnesium,mg/l
Magnesium.csv,Mg-Tot,Magnesium,mg/l
Manganese.csv,Mn-Dis,Manganese,mg/l
Manganese.csv,Mn-Tot,Manganese,mg/l
Pesticides_M_to_R.csv,MCPPACID,Mecoprop,µg/l
Mercury.csv,Hg-Dis,Mercury,µg/l
Mercury.csv,Hg-Tot,Mercury,µg/l
Pesticides_M_to_R.csv,METHOMYL,Methomyl,µg/l
Volatile_Organic_Compounds.csv,MECL,Methylene Dichloride,µg/l
Pesticides_M_to_R.csv,METRIBUZIN,Metribuzin,µg/l
Molybdenum.csv,Mo-Tot,Molybdenum,mg/l
Pesticides_C_D.csv,CLOTHIANIDINE,Neonicotinoid,µg/l
Nickel.csv,Ni-Dis,Nickel,mg/l
Nickel.csv,Ni-Tot,Nickel,mg/l
Niobium.csv,Nb-Ext,Niobium,µg/l
Niobium.csv,Nb-Dis,Niobium,µg/l
Niobium.csv,Nb-Tot,Niobium,µg/l
PAH.csv,IDN123CDPYR,O-Phenylenpyrene,µg/l
Carbon.csv,TOC,Organic Carbon,mg/l
Carbon.csv,DOC,Organic Carbon,mg/l
Pesticides_M_to_R.csv,QUINOXYFEN,Organochlorine,µg/l
Pesticides_C_D.csv,DIMETHOATE,Organothiophosphate,µg/l
Pesticides_C_D.csv,DIMPYLATE,Organothiophosphate,µg/l
Pesticides_E_to_L.csv,FENITROTHION,Organothiophosphate,µg/l
Pesticides_M_to_R.csv,METAPHOS,Organothiophosphate,µg/l
Pesticides_M_to_R.csv,PARATHION,Organothiophosphate,µg/l
Pesticides_M_to_R.csv,MALATHION,Organothiophosphate,µg/l
Phosphorus.csv,DRP,Orthophosphate,mg/l
Oxidized_Nitrogen.csv,NO2N,Oxidized Nitrogen,mg/l
Oxidized_Nitrogen.csv,NO3N,Oxidized Nitrogen,mg/l
Oxidized_Nitrogen.csv,NOxN,Oxidized Nitrogen,mg/l
Dissolved_Gas.csv,O2-Dis-Sat,Oxygen,%
Dissolved_Gas.csv,O2-Dis,Oxygen,mg/l
Oxygen_Demand.csv,PV,Oxygen Demand,mg/l
Oxygen_Demand.csv,BOD,Oxygen Demand,mg/l
Oxygen_Demand.csv,COD,Oxygen Demand,mg/l
Persistent_Organic_Pesticides.csv,PCB,PCB,µg/l
Persistent_Organic_Pesticides.csv,PCP,PCP,µg/l
PFAS.csv,PFOA,PFOA,µg/l
PFAS.csv,PFOS,PFOS,µg/l
Persistent_Organic_Pesticides.csv,PECBZ,Pentachlorobenzene,µg/l
Surfactant.csv,4NNPHL,Phenol,µg/l
Surfactant.csv,4NNPHLBRA,Phenol,µg/l
Phenyl.csv,4TOTPHL,Phenol,µg/l
Surfactant.csv,4OPHLH,Phenol,µg/l
Phenyl.csv,CLPHENOL,Phenol,µg/l
Pesticides_E_to_L.csv,IOXYNIL,Phenol,µg/l
Phenyl.csv,24DCP,Phenol,µg/l
Pesticides_C_D.csv,DCMU,Phenylurea,µg/l
Pesticides_E_to_L.csv,LINURON,Phenylurea,µg/l
Phytoplankton.csv,Phyt-B,Phytoplankton,mg/m³
Platinum.csv,Pt-Dis,Platinum,µg/l
Platinum.csv,Pt-Ext,Platinum,µg/l
Platinum.csv,Pt-Tot,Platinum,µg/l
Potassium.csv,K-Tot,Potassium,mg/l
Potassium.csv,K-Dis,Potassium,mg/l
Pesticides_M_to_R.csv,PROMETRYN,Prometryn,µg/l
Pesticides_M_to_R.csv,PROPAZINE,Propazine,µg/l
Pesticides_E_to_L.csv,LENACIL,Pyrimidine,µg/l
Pesticides_C_D.csv,44DDD,Rhothane,µg/l
Rubidium.csv,Rb-Ext,Rubidium,µg/l
Rubidium.csv,Rb-Tot,Rubidium,µg/l
Persistent_Organic_Pesticides.csv,SCCP,SCCP,µg/l
Salinity.csv,Sal,Salinity,psu
Salinity.csv,Sal,Salinity,ppt
Salinity.csv,Sal,Salinity,---
Selenium.csv,Se-Dis,Selenium,mg/l
Selenium.csv,Se-Tot,Selenium,mg/l
Silicon.csv,SiO2-Tot,Silicate,mg/l
Silicon.csv,SiO2-Dis,Silicate,mg/l
Silicon.csv,Si-Ext,Silicon,mg/l
Silicon.csv,Si-Dis,Silicon,mg/l
Silver.csv,Ag-Tot,Silver,µg/l
Silver.csv,Ag-Dis,Silver,µg/l
Pesticides_S_to_Z.csv,SIMAZINE,Simazine,µg/l
Sodium.csv,Na-Tot,Sodium,mg/l
Sodium.csv,Na-Dis,Sodium,mg/l
Pesticides_C_D.csv,DIMOXYSTROBIN,Strobilurin,µg/l
Strontium.csv,Sr-Tot,Strontium,mg/l
Strontium.csv,Sr-Ext,Strontium,µg/l
Strontium.csv,Sr-Tot,Strontium,µg/l
Sulfur.csv,SO4-Dis,Sulfate,mg/l
Sulfur.csv,SO4-Tot,Sulfate,mg/l
Pesticides_M_to_R.csv,METSULFURON-METHYL,Sulfonylurea,µg/l
Water.csv,TSS,Suspended Solids,mg/l
Temperature.csv,TEMP,Temperature,°C
Halocarbon.csv,1122TTCETA,Tetrachloroethane,µg/l
Halocarbon.csv,1112TTCETA,Tetrachloroethane,µg/l
Thallium.csv,Tl-Tot,Thallium,mg/l
Tin.csv,Sn-Tot,Tin,mg/l
Titanium.csv,Ti-Tot,Titanium,µg/l
Volatile_Organic_Compounds.csv,TOLH,Toluene,µg/l
Water.csv,TS,Total Solids,mg/l
Pesticide_A_B.csv,ATRAZINE,Triazine,µg/l
Pesticides_M_to_R.csv,METAMITRON,Triazine,µg/l
Volatile_Organic_Compounds.csv,135TCBZ,Trichlorobenzene,µg/l
Volatile_Organic_Compounds.csv,124TCBZ,Trichlorobenzene,µg/l
Volatile_Organic_Compounds.csv,TCB-Tot,Trichlorobenzene,µg/l
Volatile_Organic_Compounds.csv,123TCBZ,Trichlorobenzene,µg/l
Tungsten.csv,W-Dis,Tungsten,µg/l
Tungsten.csv,W-Tot,Tungsten,µg/l
Tungsten.csv,W-Ext,Tungsten,µg/l
Optical.csv,TURB,Turbidity,NTU
Uranium.csv,U-Dis,Uranium,mg/l
Uranium.csv,U-Tot,Uranium,mg/l
Pharmaceuticals.csv,CARBAMAZEPINE,Urea,µg/l
Vanadium.csv,V-Dis,Vanadium,mg/l
Vanadium.csv,V-Tot,Vanadium,mg/l
Yttrium.csv,Y-Tot,Yttrium,µg/l
Yttrium.csv,Y-Ext,Yttrium,µg/l
Zinc.csv,Zn-Dis,Zinc,mg/l
Zinc.csv,Zn-Tot,Zinc,mg/l
pH.csv,pH,pH,---`

const groupByKeyword: Array<{ keyword: string; group: string }> = [
  { keyword: 'Pesticide', group: 'Pesticides' },
  { keyword: 'PFAS', group: 'PFAS' },
  { keyword: 'Pharmaceutical', group: 'Pharmaceuticals' },
  { keyword: 'PAH', group: 'Organic Contaminants' },
  { keyword: 'Organic', group: 'Organic Contaminants' },
  { keyword: 'Halocarbon', group: 'Volatile Organics' },
  { keyword: 'Volatile_Organic', group: 'Volatile Organics' },
  { keyword: 'Indicator_Organism', group: 'Microbiology' },
  { keyword: 'Nitrogen', group: 'Nutrients' },
  { keyword: 'Phosphorus', group: 'Nutrients' },
  { keyword: 'Carbon', group: 'Nutrients' },
  { keyword: 'Water', group: 'Physical and General' },
  { keyword: 'Temperature', group: 'Physical and General' },
  { keyword: 'Conductance', group: 'Physical and General' },
  { keyword: 'Flux', group: 'Physical and General' },
  { keyword: 'Dissolved_Gas', group: 'Physical and General' },
  { keyword: 'Salinity', group: 'Physical and General' },
  { keyword: 'Optical', group: 'Physical and General' },
  { keyword: 'pH', group: 'Physical and General' }
]

function splitCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }
    if (char === ',' && !insideQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

function inferGroup(file: string): string {
  const fileName = file.replace('.csv', '')
  for (const entry of groupByKeyword) {
    if (fileName.includes(entry.keyword)) return entry.group
  }
  return 'Metals and Inorganics'
}

function createParameterOptions(): ParameterOption[] {
  return rawParametersCsv
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [file = '', code = '', name = '', unit = ''] = splitCsvLine(line)
      const normalizedUnit = unit === '---' ? 'N/A' : unit
      return {
        id: `${file}|${code}|${name}|${normalizedUnit}`,
        file,
        code,
        name,
        unit: normalizedUnit,
        group: inferGroup(file)
      }
    })
}

export const contaminationParameters = createParameterOptions()
