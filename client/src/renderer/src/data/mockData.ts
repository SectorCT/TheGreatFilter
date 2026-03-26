export const filters = [
  {
    id: 'F-001',
    name: 'Municipal Supply A',
    status: 'Complete',
    date: '2026-03-20',
    source: 'Manual'
  },
  {
    id: 'F-002',
    name: 'River Sample Delta-7',
    status: 'Generating',
    date: '2026-03-25',
    source: 'GemStat'
  },
  {
    id: 'F-003',
    name: 'Lab Equipment Run #14',
    status: 'Pending',
    date: '2026-03-26',
    source: 'USB'
  },
  {
    id: 'F-004',
    name: 'Industrial Effluent B',
    status: 'Complete',
    date: '2026-03-18',
    source: 'CSV'
  },
  {
    id: 'F-005',
    name: 'Groundwater Station 9',
    status: 'Complete',
    date: '2026-03-15',
    source: 'GemStat'
  },
  {
    id: 'F-006',
    name: 'Reservoir Batch C-2',
    status: 'Generating',
    date: '2026-03-26',
    source: 'Manual'
  }
]

export const measurements = [
  {
    id: 'M-001',
    label: 'Tap Water Sample',
    ph: '7.2',
    temp: '18.5',
    do: '8.4',
    conductivity: '450',
    params: 12,
    date: '2026-03-24',
    source: 'Manual'
  },
  {
    id: 'M-002',
    label: 'River Danube - Station 4',
    ph: '7.8',
    temp: '14.2',
    do: '9.1',
    conductivity: '390',
    params: 24,
    date: '2026-03-22',
    source: 'GemStat'
  },
  {
    id: 'M-003',
    label: 'Lab Run #14 Output',
    ph: '6.9',
    temp: '22.0',
    do: '7.8',
    conductivity: '520',
    params: 18,
    date: '2026-03-20',
    source: 'USB'
  },
  {
    id: 'M-004',
    label: 'Industrial Discharge C',
    ph: '5.4',
    temp: '31.2',
    do: '4.2',
    conductivity: '910',
    params: 15,
    date: '2026-03-19',
    source: 'CSV'
  },
  {
    id: 'M-005',
    label: 'Groundwater Well 9',
    ph: '7.1',
    temp: '16.9',
    do: '8.0',
    conductivity: '480',
    params: 10,
    date: '2026-03-17',
    source: 'Manual'
  }
]

export const filterDetailParameters = [
  { code: 'TEMP', name: 'Temperature', unit: 'deg C', value: '18.5' },
  { code: 'PH', name: 'pH', unit: '-', value: '7.2' },
  { code: 'DO', name: 'Dissolved Oxygen', unit: 'mg/L', value: '8.4' },
  { code: 'COND', name: 'Conductivity', unit: 'uS/cm', value: '450' },
  { code: 'TURB', name: 'Turbidity', unit: 'NTU', value: '2.1' },
  { code: 'NO3', name: 'Nitrate', unit: 'mg/L', value: '3.2' },
  { code: 'PO4', name: 'Phosphate', unit: 'mg/L', value: '0.05' },
  { code: 'HARD', name: 'Total Hardness', unit: 'mg/L', value: '120' },
  { code: 'TDS', name: 'Total Dissolved Solids', unit: 'mg/L', value: '300' },
  { code: 'CL', name: 'Chloride', unit: 'mg/L', value: '25' },
  { code: 'FE', name: 'Iron', unit: 'mg/L', value: '0.12' },
  { code: 'MN', name: 'Manganese', unit: 'mg/L', value: '0.03' }
]

export const filterStages = [
  { stage: 1, type: 'Sediment Pre-Filter', media: 'Polypropylene', micron: '20 um' },
  { stage: 2, type: 'Activated Carbon', media: 'Granular Activated Carbon', micron: '5 um' },
  { stage: 3, type: 'Ion Exchange', media: 'Strong Acid Cation Resin', micron: 'N/A' },
  { stage: 4, type: 'Reverse Osmosis', media: 'TFC Membrane', micron: '0.0001 um' },
  { stage: 5, type: 'Post-Carbon Polish', media: 'Coconut Shell Carbon', micron: '1 um' }
]
