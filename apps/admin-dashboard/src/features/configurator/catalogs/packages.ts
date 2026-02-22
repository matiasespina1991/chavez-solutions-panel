export interface Package {
  id: string;
  labelEs: string;
  matrix: 'water' | 'soil';
  parameterIds: string[];
}

export const packages: Package[] = [
  {
    id: 'water_basic',
    labelEs: 'Agua potable básico',
    matrix: 'water',
    parameterIds: ['free_chlorine', 'turbidity', 'fecal_coliforms'],
  },
  {
    id: 'water_heavy_metals',
    labelEs: 'Metales pesados',
    matrix: 'water',
    parameterIds: ['arsenic', 'cadmium', 'copper', 'chromium', 'mercury', 'lead'],
  },
  {
    id: 'water_micro',
    labelEs: 'Microbiológico',
    matrix: 'water',
    parameterIds: ['fecal_coliforms', 'cryptosporidium', 'giardia'],
  },
  {
    id: 'soil_metals',
    labelEs: 'Metales (V, Ni, Pb)',
    matrix: 'soil',
    parameterIds: ['vanadium', 'nickel', 'lead_soil'],
  },
  {
    id: 'soil_tph',
    labelEs: 'Hidrocarburos (TPH)',
    matrix: 'soil',
    parameterIds: ['tph'],
  },
  {
    id: 'soil_pahs',
    labelEs: 'HAPs',
    matrix: 'soil',
    parameterIds: ['pahs'],
  },
  {
    id: 'soil_basic',
    labelEs: 'Suelo completo básico',
    matrix: 'soil',
    parameterIds: ['vanadium', 'nickel', 'lead_soil', 'tph', 'pahs'],
  },
];
