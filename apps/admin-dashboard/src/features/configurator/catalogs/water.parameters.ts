export interface Parameter {
  id: string;
  labelEs: string;
  defaultUnit: string;
  defaultMethod: string;
  defaultRange?: string;
  accreditedDefault?: boolean;
}

export const waterParameters: Parameter[] = [
  { id: 'arsenic', labelEs: 'Arsénico', defaultUnit: 'mg/L', defaultMethod: 'EPA 200.8', accreditedDefault: true },
  { id: 'cadmium', labelEs: 'Cadmio', defaultUnit: 'mg/L', defaultMethod: 'EPA 200.8', accreditedDefault: true },
  { id: 'free_chlorine', labelEs: 'Cloro libre residual', defaultUnit: 'mg/L', defaultMethod: 'SM 4500-Cl G', accreditedDefault: true },
  { id: 'copper', labelEs: 'Cobre', defaultUnit: 'mg/L', defaultMethod: 'EPA 200.8', accreditedDefault: true },
  { id: 'chromium', labelEs: 'Cromo', defaultUnit: 'mg/L', defaultMethod: 'EPA 200.8', accreditedDefault: true },
  { id: 'fluoride', labelEs: 'Fluoruro', defaultUnit: 'mg/L', defaultMethod: 'SM 4500-F C', accreditedDefault: true },
  { id: 'mercury', labelEs: 'Mercurio', defaultUnit: 'mg/L', defaultMethod: 'EPA 245.1', accreditedDefault: true },
  { id: 'nitrates', labelEs: 'Nitratos', defaultUnit: 'mg/L', defaultMethod: 'SM 4500-NO3 E', accreditedDefault: true },
  { id: 'nitrites', labelEs: 'Nitritos', defaultUnit: 'mg/L', defaultMethod: 'SM 4500-NO2 B', accreditedDefault: true },
  { id: 'lead', labelEs: 'Plomo', defaultUnit: 'mg/L', defaultMethod: 'EPA 200.8', accreditedDefault: true },
  { id: 'turbidity', labelEs: 'Turbiedad', defaultUnit: 'NTU', defaultMethod: 'EPA 180.1', accreditedDefault: true },
  { id: 'fecal_coliforms', labelEs: 'Coliformes fecales', defaultUnit: 'NMP/100mL', defaultMethod: 'SM 9221 E', accreditedDefault: true },
  { id: 'cryptosporidium', labelEs: 'Cryptosporidium', defaultUnit: 'Ooquistes/L', defaultMethod: 'EPA 1623', accreditedDefault: false },
  { id: 'giardia', labelEs: 'Giardia', defaultUnit: 'Quistes/L', defaultMethod: 'EPA 1623', accreditedDefault: false },
];
