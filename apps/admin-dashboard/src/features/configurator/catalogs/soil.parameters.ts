import { Parameter } from './water.parameters';

export const soilParameters: Parameter[] = [
  { id: 'vanadium', labelEs: 'Vanadio', defaultUnit: 'mg/kg', defaultMethod: 'EPA 6010D', accreditedDefault: true },
  { id: 'nickel', labelEs: 'Níquel', defaultUnit: 'mg/kg', defaultMethod: 'EPA 6010D', accreditedDefault: true },
  { id: 'lead_soil', labelEs: 'Plomo', defaultUnit: 'mg/kg', defaultMethod: 'EPA 6010D', accreditedDefault: true },
  { id: 'tph', labelEs: 'TPH', defaultUnit: 'mg/kg', defaultMethod: 'EPA 8015C', accreditedDefault: true },
  { id: 'pahs', labelEs: 'HAPs', defaultUnit: 'mg/kg', defaultMethod: 'EPA 8270E', accreditedDefault: true },
];
