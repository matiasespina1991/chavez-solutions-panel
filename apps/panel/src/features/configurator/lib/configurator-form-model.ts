import * as z from 'zod';

import { type ImportedServiceDocument } from '@/features/configurator/services/configurations';

export const formSchema = z.object({
  matrix: z.array(z.string()),
  reference: z.string().min(1, 'Referencia es requerida'),
  createdAt: z.date().optional(),
  validDays: z.number().optional(),
  notes: z.string().optional(),
  client: z.object({
    businessName: z.string().min(1, 'Razón social es requerida'),
    taxId: z.string().min(1, 'RUC es requerido'),
    contactName: z.string().min(1, 'Persona de contacto es requerida'),
    contactRole: z.string().nullable().optional(),
    email: z.string().email('Email inválido'),
    phone: z.string().min(1, 'Teléfono es requerido'),
    address: z.string().min(1, 'Dirección es requerida'),
    city: z.string().min(1, 'Ciudad es requerida')
  }),
  samples: z.object({
    agreedCount: z.number().min(1, 'Mínimo 1 muestra'),
    additionalCount: z.number().default(0),
    executedCount: z.number().default(1),
    items: z.array(
      z.object({
        sampleCode: z.string().optional().default(''),
        sampleType: z.string().optional().default(''),
        takenAt: z.date().nullable().optional(),
        notes: z.string().default('')
      })
    )
  }),
  services: z.object({
    items: z.array(
      z.object({
        serviceId: z.string(),
        parameterId: z.string(),
        parameterLabel: z.string(),
        tableLabel: z.string().nullable(),
        unit: z.string().nullable(),
        method: z.string().nullable(),
        rangeMin: z.string(),
        rangeMax: z.string(),
        quantity: z.number().min(1),
        unitPrice: z.number().nullable(),
        discountAmount: z.number().nullable()
      })
    ),
    grouped: z.array(
      z.object({
        name: z.string(),
        items: z.array(
          z.object({
            serviceId: z.string(),
            parameterId: z.string(),
            parameterLabel: z.string(),
            tableLabel: z.string().nullable(),
            unit: z.string().nullable(),
            method: z.string().nullable(),
            rangeMin: z.string(),
            rangeMax: z.string(),
            quantity: z.number().min(1),
            unitPrice: z.number().nullable(),
            discountAmount: z.number().nullable()
          })
        )
      })
    )
  }),
  analyses: z.object({
    applyMode: z.enum(['all_samples', 'by_sample']),
    items: z.array(
      z.object({
        parameterId: z.string(),
        parameterLabelEs: z.string(),
        unit: z.string(),
        method: z.string(),
        rangeOffered: z.string(),
        isAccredited: z.boolean(),
        turnaround: z.enum(['standard', 'urgent']),
        unitPrice: z.number().nullable(),
        discountAmount: z.number().nullable().optional(),
        appliesToSampleCodes: z.array(z.string()).nullable()
      })
    )
  }),
  pricing: z.object({
    currency: z.literal('USD'),
    subtotal: z.number().nullable(),
    taxPercent: z.number().nullable(),
    total: z.number().nullable(),
    validDays: z.number().nullable()
  })
});

export type FormValues = z.infer<typeof formSchema>;
export type ConfiguratorTab = 'client' | 'samples' | 'details' | 'summary';
export type DialogFilterKey = 'matEnsayo' | 'norma' | 'tabla' | 'tecnica';
export type DialogFilters = Record<DialogFilterKey, string[]>;
export type ServiceFilterOption = { value: string; count: number };

export const DIALOG_FILTER_LABELS: Record<DialogFilterKey, string> = {
  matEnsayo: 'Material de ensayo',
  norma: 'Norma',
  tabla: 'Tabla',
  tecnica: 'Técnica'
};

export const TAB_ORDER: ConfiguratorTab[] = ['client', 'samples', 'details', 'summary'];

export type SelectedService = ImportedServiceDocument & {
  quantity: number;
  rangeMin: string;
  rangeMax: string;
  unitPrice: number | null;
  discountAmount: number | null;
};

export type SelectedServiceGroup = {
  id: string;
  name: string;
  items: SelectedService[];
};

export const createDefaultFormValues = (): FormValues => ({
  matrix: [],
  reference: `PR-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
  createdAt: new Date(),
  validDays: 30,
  notes: '',
  client: {
    businessName: '',
    taxId: '',
    contactName: '',
    contactRole: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  },
  samples: {
    agreedCount: 1,
    additionalCount: 0,
    executedCount: 1,
    items: []
  },
  services: {
    items: [],
    grouped: []
  },
  analyses: {
    applyMode: 'all_samples',
    items: []
  },
  pricing: {
    currency: 'USD',
    subtotal: 0,
    taxPercent: 15,
    total: 0,
    validDays: 30
  }
});
