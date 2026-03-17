'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  createConfiguration,
  getConfigurationById,
  updateConfiguration,
  ConfigurationDocument,
  ConfigurationServiceItem,
  ImportedServiceDocument,
  listImportedServices
} from '../services/configurations';

const formSchema = z.object({
  type: z.literal('proforma'),
  matrix: z.enum(['water', 'soil']),
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
  services: z.array(
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

type FormValues = z.infer<typeof formSchema>;

type SelectedService = ImportedServiceDocument & {
  quantity: number;
  rangeMin: string;
  rangeMax: string;
  unitPrice: number | null;
  discountAmount: number | null;
};

const createDefaultFormValues = (): FormValues => ({
  type: 'proforma',
  matrix: 'water',
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
  services: [],
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

export default function ConfiguratorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRequestId = searchParams.get('requestId');
  const isEditMode = Boolean(editRequestId);
  const cacheKey = `configurator:cache:${editRequestId ?? 'new'}`;
  const [activeTab, setActiveTab] = useState('type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [loadedRequestStatus, setLoadedRequestStatus] = useState<
    'draft' | 'final' | 'paused' | null
  >(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState<
    ImportedServiceDocument[]
  >([]);
  const [isLoadingAvailableServices, setIsLoadingAvailableServices] =
    useState(false);
  const [dialogSelectedServiceIds, setDialogSelectedServiceIds] = useState<
    string[]
  >([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    []
  );
  const requestedTab = searchParams.get('tab');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: createDefaultFormValues()
  });

  useEffect(() => {
    if (
      requestedTab &&
      ['type', 'client', 'samples', 'services', 'summary'].includes(
        requestedTab
      )
    ) {
      setActiveTab(requestedTab === 'services' ? 'samples' : requestedTab);
    }
  }, [requestedTab]);

  const matrix = form.watch('matrix');
  const reference = form.watch('reference');
  const agreedCount = form.watch('samples.agreedCount');
  const clientWatch = form.watch('client');
  const samplesWatch = form.watch('samples');

  const tabStatus: Record<'type' | 'client' | 'samples', 'ok' | 'error'> = {
    type: (() => {
      const matrixValue = matrix;
      const validDays = form.watch('validDays');

      if (!reference || !matrixValue) return 'error';
      if (!validDays) return 'error';
      return 'ok';
    })(),
    client: (() => {
      const client = clientWatch;
      if (!client) return 'error';
      if (
        !client.businessName ||
        !client.taxId ||
        !client.contactName ||
        !client.email ||
        !client.phone ||
        !client.address ||
        !client.city
      ) {
        return 'error';
      }
      return 'ok';
    })(),
    samples: (() => {
      const samples = samplesWatch;
      if (!samples) return 'error';
      if (!samples.agreedCount || samples.agreedCount < 1) return 'error';
      if (!selectedServices.length) return 'error';
      const hasInvalidServiceInput = selectedServices.some((service) => {
        const quantity = service.quantity ?? 0;
        const rangeMin = (service.rangeMin ?? '').trim();
        const rangeMax = (service.rangeMax ?? '').trim();
        const unitPrice = service.unitPrice;

        if (!Number.isFinite(quantity) || quantity <= 0) return true;
        if (!rangeMin || !rangeMax) return true;
        if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice)) {
          return true;
        }
        if (unitPrice < 0) return true;
        if (
          service.discountAmount !== null &&
          service.discountAmount !== undefined &&
          (!Number.isFinite(service.discountAmount) ||
            service.discountAmount < 0)
        ) {
          return true;
        }
        return false;
      });
      if (hasInvalidServiceInput) return 'error';
      return 'ok';
    })()
  };

  const canSubmitFinal =
    tabStatus.type === 'ok' &&
    tabStatus.client === 'ok' &&
    tabStatus.samples === 'ok';

  const getServiceId = (service: ImportedServiceDocument) =>
    service.ID_CONFIG_PARAMETRO || service.id;

  const normalizeRangeValue = (raw: string) => {
    const value = raw.trim();
    if (!value) return '';

    const hasComma = value.includes(',');
    const hasDot = value.includes('.');

    // 1,234.56 -> 1234.56
    if (hasComma && hasDot && /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(value)) {
      return value.replace(/,/g, '');
    }

    // 1.234,56 -> 1234.56
    if (hasComma && hasDot && /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(value)) {
      return value.replace(/\./g, '').replace(',', '.');
    }

    // 0,000.0000 (formato mixto raro del CSV) -> 0.0000
    if (hasComma && hasDot) {
      return value.replace(/,/g, '');
    }

    // 0,25 -> 0.25
    if (hasComma && !hasDot) {
      return value.replace(',', '.');
    }

    return value;
  };

  const toSelectedService = (
    service: ImportedServiceDocument,
    overrides?: Partial<SelectedService>
  ): SelectedService => {
    return {
      ...service,
      quantity: overrides?.quantity ?? 1,
      rangeMin:
        typeof overrides?.rangeMin === 'string'
          ? normalizeRangeValue(overrides.rangeMin)
          : '',
      rangeMax:
        typeof overrides?.rangeMax === 'string'
          ? normalizeRangeValue(overrides.rangeMax)
          : '',
      unitPrice: overrides?.unitPrice ?? null,
      discountAmount: overrides?.discountAmount ?? null
    };
  };

  const formatRange = (service: SelectedService) => {
    const lower = service.rangeMin.trim();
    const upper = service.rangeMax.trim();
    if (!lower && !upper) return '—';
    if (lower && upper) return `${lower} a ${upper}`;
    return lower || upper;
  };

  const parseRangeOffered = (rangeOffered: string) => {
    const normalized = rangeOffered.trim();
    if (!normalized || normalized === '—') {
      return { rangeMin: '', rangeMax: '' };
    }

    const parts = normalized.split(/\s+a\s+/i);
    if (parts.length === 2) {
      return {
        rangeMin: normalizeRangeValue(parts[0]),
        rangeMax: normalizeRangeValue(parts[1])
      };
    }

    return { rangeMin: normalizeRangeValue(normalized), rangeMax: '' };
  };

  const mapServicesToAnalyses = (
    services: SelectedService[]
  ): FormValues['analyses']['items'] =>
    services.map((service) => ({
      parameterId: getServiceId(service),
      parameterLabelEs: service.ID_PARAMETRO || getServiceId(service) || '-',
      unit: service.UNIDAD_NORMA || service.UNIDAD_INTERNO || '-',
      method:
        service.ID_TECNICA ||
        service.ID_MET_REFERENCIA ||
        service.ID_MET_INTERNO ||
        '-',
      rangeOffered: formatRange(service),
      isAccredited: false,
      turnaround: 'standard',
      unitPrice: service.unitPrice,
      discountAmount: service.discountAmount,
      appliesToSampleCodes: null
    }));

  const mapSelectedServicesToDocument = (
    services: SelectedService[]
  ): ConfigurationServiceItem[] =>
    services.map((service) => ({
      serviceId: service.id,
      parameterId: getServiceId(service),
      parameterLabel: service.ID_PARAMETRO || getServiceId(service) || '-',
      tableLabel: service.ID_TABLA_NORMA || null,
      unit: service.UNIDAD_NORMA || service.UNIDAD_INTERNO || null,
      method:
        service.ID_TECNICA ||
        service.ID_MET_REFERENCIA ||
        service.ID_MET_INTERNO ||
        null,
      rangeMin: service.rangeMin,
      rangeMax: service.rangeMax,
      quantity: service.quantity,
      unitPrice: service.unitPrice,
      discountAmount: service.discountAmount
    }));

  const mapStoredServicesToSelected = (
    services: ConfigurationServiceItem[]
  ): SelectedService[] =>
    services.map((service) =>
      toSelectedService(
        {
          id: service.serviceId || service.parameterId,
          ID_CONFIG_PARAMETRO: service.parameterId,
          ID_PARAMETRO: service.parameterLabel,
          ID_TABLA_NORMA: service.tableLabel || undefined,
          UNIDAD_NORMA: service.unit || undefined,
          ID_TECNICA: service.method || undefined,
          LIM_INF_NORMA: undefined,
          LIM_SUP_NORMA: undefined,
          PRECIO: service.unitPrice
        },
        {
          quantity: service.quantity,
          rangeMin: service.rangeMin,
          rangeMax: service.rangeMax,
          unitPrice: service.unitPrice,
          discountAmount: service.discountAmount
        }
      )
    );

  const toDateOrNull = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      try {
        return (value as { toDate: () => Date }).toDate();
      } catch {
        return null;
      }
    }
    return null;
  };

  const mergeWithCachedValues = (
    baseValues: FormValues,
    cachedRaw: unknown
  ): FormValues => {
    if (!cachedRaw || typeof cachedRaw !== 'object') return baseValues;

    const cached = cachedRaw as Partial<FormValues> & {
      client?: Partial<FormValues['client']>;
      samples?:
        | (Partial<FormValues['samples']> & {
            items?: Array<Partial<FormValues['samples']['items'][number]>>;
          })
        | undefined;
      analyses?:
        | (Partial<FormValues['analyses']> & {
            items?: FormValues['analyses']['items'];
          })
        | undefined;
      pricing?: Partial<FormValues['pricing']>;
    };

    const mergedSampleItems = Array.isArray(cached.samples?.items)
      ? cached.samples.items.map((item, index) => ({
          sampleCode:
            typeof item.sampleCode === 'string'
              ? item.sampleCode
              : (baseValues.samples.items[index]?.sampleCode ??
                `M-${String(index + 1).padStart(3, '0')}`),
          sampleType:
            typeof item.sampleType === 'string' ? item.sampleType : '',
          takenAt: toDateOrNull(item.takenAt),
          notes: typeof item.notes === 'string' ? item.notes : ''
        }))
      : baseValues.samples.items;

    return {
      ...baseValues,
      ...cached,
      type: 'proforma',
      createdAt: toDateOrNull(cached.createdAt) ?? baseValues.createdAt,
      client: {
        ...baseValues.client,
        ...(cached.client ?? {})
      },
      samples: {
        ...baseValues.samples,
        ...(cached.samples ?? {}),
        items: mergedSampleItems
      },
      analyses: {
        ...baseValues.analyses,
        ...(cached.analyses ?? {}),
        items: Array.isArray(cached.analyses?.items)
          ? cached.analyses.items
          : baseValues.analyses.items
      },
      pricing: {
        ...baseValues.pricing,
        ...(cached.pricing ?? {})
      }
    };
  };

  const removeCachedDraft = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(cacheKey);
  };

  const handleConfirmClearCurrentData = () => {
    form.reset(createDefaultFormValues());
    setSelectedServices([]);
    setActiveTab('type');
    removeCachedDraft();
    setIsClearDialogOpen(false);
    toast.success('Los datos en curso fueron vaciados correctamente.');
  };

  const clearCurrentDataButton = (
    <Button
      type='button'
      variant='outline'
      size='icon'
      className='cursor-pointer'
      disabled={isSubmitting || isLoadingRequest}
      onClick={() => setIsClearDialogOpen(true)}
      aria-label='Vaciar datos en curso'
      title='Vaciar datos en curso'
    >
      <Trash2 className='h-4 w-4' />
    </Button>
  );

  useEffect(() => {
    const loadAvailableServices = async () => {
      try {
        setIsLoadingAvailableServices(true);
        const docs = await listImportedServices();
        setAvailableServices(docs);
      } catch (error) {
        console.error('Error loading services catalog:', error);
        toast.error('No se pudieron cargar los servicios disponibles.');
      } finally {
        setIsLoadingAvailableServices(false);
      }
    };

    void loadAvailableServices();
  }, []);

  useEffect(() => {
    if (!availableServices.length || !selectedServices.length) return;

    setSelectedServices((prev) => {
      let hasChanges = false;
      const next = prev.map((service) => {
        const serviceId = getServiceId(service);
        const canonical = availableServices.find(
          (candidate) => getServiceId(candidate) === serviceId
        );

        if (!canonical) return service;

        // Rehydrate display metadata (tabla, método, unidad, etc.)
        // while preserving user-edited fields.
        const hydrated = toSelectedService(canonical, service);

        if (
          hydrated.ID_TABLA_NORMA !== service.ID_TABLA_NORMA ||
          hydrated.UNIDAD_NORMA !== service.UNIDAD_NORMA ||
          hydrated.UNIDAD_INTERNO !== service.UNIDAD_INTERNO ||
          hydrated.ID_TECNICA !== service.ID_TECNICA ||
          hydrated.ID_MET_REFERENCIA !== service.ID_MET_REFERENCIA ||
          hydrated.ID_MET_INTERNO !== service.ID_MET_INTERNO
        ) {
          hasChanges = true;
        }

        return hydrated;
      });

      return hasChanges ? next : prev;
    });
  }, [availableServices, selectedServices]);

  useEffect(() => {
    if (typeof window === 'undefined' || editRequestId) return;

    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (!cached) return;

      const parsed = JSON.parse(cached) as unknown;
      const merged = mergeWithCachedValues(createDefaultFormValues(), parsed);
      form.reset(merged);
      setSelectedServices(
        merged.services?.length
          ? mapStoredServicesToSelected(merged.services)
          : merged.analyses.items.map((item, index) =>
              (() => {
                const parsedRange = parseRangeOffered(item.rangeOffered);
                return toSelectedService(
                  {
                    id: `${item.parameterId}-${index}`,
                    ID_CONFIG_PARAMETRO: item.parameterId,
                    ID_PARAMETRO: item.parameterLabelEs,
                    UNIDAD_NORMA: item.unit,
                    ID_TECNICA: item.method,
                    LIM_INF_NORMA: undefined,
                    LIM_SUP_NORMA: undefined,
                    PRECIO: item.unitPrice ?? null
                  },
                  {
                    quantity: 1,
                    rangeMin: parsedRange.rangeMin,
                    rangeMax: parsedRange.rangeMax,
                    unitPrice: item.unitPrice ?? null,
                    discountAmount:
                      typeof item.discountAmount === 'number'
                        ? item.discountAmount
                        : null
                  }
                );
              })()
            )
      );
    } catch (error) {
      console.error('Error restoring configurator cache:', error);
    }
  }, [cacheKey, editRequestId, form]);

  useEffect(() => {
    const loadRequest = async () => {
      if (!editRequestId) return;

      try {
        setIsLoadingRequest(true);
        const existing = await getConfigurationById(editRequestId);

        if (!existing) {
          toast.error('No se encontró la solicitud seleccionada');
          router.push('/dashboard/service-requests');
          return;
        }

        const loadedValues: FormValues = {
          type: 'proforma',
          matrix: existing.matrix,
          reference: existing.reference,
          createdAt: toDateOrNull(existing.createdAt) || new Date(),
          validDays: existing.pricing?.validDays ?? 30,
          notes: existing.notes || '',
          client: {
            businessName: existing.client.businessName,
            taxId: existing.client.taxId,
            contactName: existing.client.contactName,
            contactRole: existing.client.contactRole || '',
            email: existing.client.email,
            phone: existing.client.phone,
            address: existing.client.address,
            city: existing.client.city
          },
          samples: {
            agreedCount: existing.samples.agreedCount,
            additionalCount: existing.samples.additionalCount,
            executedCount: existing.samples.executedCount,
            items: []
          },
          services: Array.isArray(existing.services) ? existing.services : [],
          analyses: {
            applyMode: existing.analyses.applyMode,
            items: existing.analyses.items
          },
          pricing: {
            currency: 'USD',
            subtotal: existing.pricing.subtotal,
            taxPercent: existing.pricing.taxPercent,
            total: existing.pricing.total,
            validDays: existing.pricing.validDays
          }
        };

        setLoadedRequestStatus(
          existing.serviceRequestStatus === 'work_order_paused'
            ? 'paused'
            : existing.status
        );

        if (typeof window !== 'undefined') {
          try {
            const cached = window.localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached) as unknown;
              const merged = mergeWithCachedValues(loadedValues, parsed);
              form.reset(merged);
              setSelectedServices(
                merged.services?.length
                  ? mapStoredServicesToSelected(merged.services)
                  : merged.analyses.items.map((item, index) =>
                      (() => {
                        const parsedRange = parseRangeOffered(item.rangeOffered);
                        return toSelectedService(
                          {
                            id: `${item.parameterId}-${index}`,
                            ID_CONFIG_PARAMETRO: item.parameterId,
                            ID_PARAMETRO: item.parameterLabelEs,
                            UNIDAD_NORMA: item.unit,
                            ID_TECNICA: item.method,
                            LIM_INF_NORMA: undefined,
                            LIM_SUP_NORMA: undefined,
                            PRECIO: item.unitPrice ?? null
                          },
                          {
                            quantity: 1,
                            rangeMin: parsedRange.rangeMin,
                            rangeMax: parsedRange.rangeMax,
                            unitPrice: item.unitPrice ?? null,
                            discountAmount:
                              typeof item.discountAmount === 'number'
                                ? item.discountAmount
                                : null
                          }
                        );
                      })()
                    )
              );
              return;
            }
          } catch (error) {
            console.error('Error restoring edit cache:', error);
          }
        }

        form.reset(loadedValues);
        setSelectedServices(
          loadedValues.services?.length
            ? mapStoredServicesToSelected(loadedValues.services)
            : loadedValues.analyses.items.map((item, index) =>
                (() => {
                  const parsedRange = parseRangeOffered(item.rangeOffered);
                  return toSelectedService(
                    {
                      id: `${item.parameterId}-${index}`,
                      ID_CONFIG_PARAMETRO: item.parameterId,
                      ID_PARAMETRO: item.parameterLabelEs,
                      UNIDAD_NORMA: item.unit,
                      ID_TECNICA: item.method,
                      LIM_INF_NORMA: undefined,
                      LIM_SUP_NORMA: undefined,
                      PRECIO: item.unitPrice ?? null
                    },
                    {
                      quantity: 1,
                      rangeMin: parsedRange.rangeMin,
                      rangeMax: parsedRange.rangeMax,
                      unitPrice: item.unitPrice ?? null,
                      discountAmount:
                        typeof item.discountAmount === 'number'
                          ? item.discountAmount
                          : null
                    }
                  );
                })()
              )
        );
      } catch (error) {
        console.error('Error loading request for edit:', error);
        toast.error('No se pudo cargar la solicitud para editar');
      } finally {
        setIsLoadingRequest(false);
      }
    };

    loadRequest();
  }, [cacheKey, editRequestId, form, router]);

  const isDraftEditMode = isEditMode && loadedRequestStatus === 'draft';
  const isPausedEditMode = isEditMode && loadedRequestStatus === 'paused';
  const showDraftActions = !isEditMode;
  const isDraftSaveDisabled =
    isSubmitting || isLoadingRequest || isPausedEditMode;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const subscription = form.watch((values) => {
      if (isLoadingRequest) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify(values));
        } catch (error) {
          console.error('Error persisting configurator cache:', error);
        }
      }, 250);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cacheKey, form, isLoadingRequest]);

  useEffect(() => {
    const mappedAnalyses = mapServicesToAnalyses(selectedServices);
    const mappedServices = mapSelectedServicesToDocument(selectedServices);
    form.setValue('services', mappedServices);
    form.setValue('analyses.applyMode', 'all_samples');
    form.setValue('analyses.items', mappedAnalyses);

    const subtotal = selectedServices.reduce((acc, service) => {
      const price = service.unitPrice ?? 0;
      const discount = service.discountAmount ?? 0;
      const lineSubtotal = Math.max(0, service.quantity * price - discount);
      return acc + lineSubtotal;
    }, 0);
    const taxPercent = form.getValues('pricing.taxPercent') || 15;
    const total = subtotal + (subtotal * taxPercent) / 100;
    form.setValue('pricing.subtotal', subtotal);
    form.setValue('pricing.total', total);
  }, [form, selectedServices]);

  // Keep executed count aligned with agreed count
  useEffect(() => {
    const targetCount = agreedCount || 1;
    form.setValue('samples.executedCount', targetCount);
    form.setValue('samples.items', []);
  }, [agreedCount, form]);

  const onSubmit = async (values: FormValues, status: 'draft' | 'final') => {
    if (status === 'draft' && isPausedEditMode) {
      toast.error(
        'No se puede guardar como borrador una solicitud con orden de trabajo pausada.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const docData: Omit<
        ConfigurationDocument,
        'id' | 'createdAt' | 'updatedAt'
      > = {
        type: values.type,
        matrix: values.matrix,
        reference: values.reference,
        status,
        notes: values.notes || '',
        client: {
          ...values.client,
          contactRole: values.client.contactRole || null
        },
        samples: {
          ...values.samples,
          items: []
        },
        services: mapSelectedServicesToDocument(selectedServices),
        analyses: {
          applyMode: values.analyses.applyMode,
          items: values.analyses.items
        },
        pricing: {
          ...values.pricing,
          subtotal: values.pricing.subtotal ?? 0,
          total: values.pricing.total ?? 0
        }
      };

      if (editRequestId) {
        await updateConfiguration(editRequestId, {
          ...docData,
          status
        });
      } else {
        await createConfiguration(docData);
      }

      if (status === 'draft') {
        toast.success(
          editRequestId
            ? 'Borrador actualizado correctamente'
            : 'Solicitud guardada como borrador'
        );
      } else {
        toast.success(
          editRequestId
            ? 'Solicitud actualizada y ejecutada correctamente'
            : 'Proforma emitida correctamente'
        );
      }
      removeCachedDraft();
      router.push('/dashboard/service-requests');
    } catch (error) {
      console.error('Error saving configuration:', error);
      const errorMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'No se pudo guardar la solicitud';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUpdateRequest = async (values: FormValues) => {
    if (!editRequestId) return;

    try {
      setIsSubmitting(true);

      const updateData: Partial<ConfigurationDocument> = {
        type: values.type,
        matrix: values.matrix,
        reference: values.reference,
        notes: values.notes || '',
        client: {
          ...values.client,
          contactRole: values.client.contactRole || null
        },
        samples: {
          ...values.samples,
          items: []
        },
        services: mapSelectedServicesToDocument(selectedServices),
        analyses: {
          applyMode: values.analyses.applyMode,
          items: values.analyses.items
        },
        pricing: {
          ...values.pricing,
          subtotal: values.pricing.subtotal ?? 0,
          total: values.pricing.total ?? 0
        }
      };

      await updateConfiguration(editRequestId, updateData);
      toast.success('Solicitud actualizada');
      removeCachedDraft();
      router.push('/dashboard/service-requests');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Error al actualizar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteClick = () => {
    form.handleSubmit((data) => onSubmit(data, 'final'))();
  };

  const handleOpenServicesDialog = () => {
    setDialogSelectedServiceIds(
      selectedServices.map((service) => getServiceId(service))
    );
    setIsServicesDialogOpen(true);
  };

  const handleToggleServiceSelection = (serviceId: string) => {
    setDialogSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleAddServicesToForm = () => {
    const selectedSet = new Set(dialogSelectedServiceIds);
    const existingById = new Map(
      selectedServices.map((service) => [getServiceId(service), service])
    );
    const nextServices = availableServices
      .filter((service) => selectedSet.has(getServiceId(service)))
      .map((service) => {
        const serviceId = getServiceId(service);
        const existing = existingById.get(serviceId);
        return toSelectedService(service, existing);
      });

    setSelectedServices(nextServices);
    setIsServicesDialogOpen(false);
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.filter(
        (service) => getServiceId(service) !== serviceId
      )
    );
  };

  const handleUpdateServiceField = (
    serviceId: string,
    field:
      | 'quantity'
      | 'rangeMin'
      | 'rangeMax'
      | 'unitPrice'
      | 'discountAmount',
    value: string
  ) => {
    setSelectedServices((prev) =>
      prev.map((service) => {
        if (getServiceId(service) !== serviceId) return service;

        if (field === 'quantity') {
          const parsed = Number(value);
          return {
            ...service,
            quantity:
              Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
          };
        }

        if (field === 'unitPrice') {
          if (!value.trim()) {
            return { ...service, unitPrice: null };
          }
          const parsed = Number(value);
          return {
            ...service,
            unitPrice: Number.isFinite(parsed) ? parsed : service.unitPrice
          };
        }

        if (field === 'discountAmount') {
          if (!value.trim()) {
            return { ...service, discountAmount: null };
          }
          const parsed = Number(value);
          return {
            ...service,
            discountAmount: Number.isFinite(parsed)
              ? parsed
              : service.discountAmount
          };
        }

        return { ...service, [field]: value };
      })
    );
  };

  const summaryNotes = (form.getValues('notes') || '').trim();
  const referenceLabel = reference?.trim() || '—';
  const validDaysValue = form.watch('validDays');
  const createdAtValue = form.watch('createdAt');
  const validUntilLabel = (() => {
    if (!validDaysValue || validDaysValue <= 0) return '—';
    const baseDate = toDateOrNull(createdAtValue) || new Date();
    const validUntil = new Date(baseDate);
    validUntil.setDate(validUntil.getDate() + validDaysValue);
    return validUntil.toLocaleDateString('es-EC');
  })();

  const summarySubtotal = form.watch('pricing.subtotal') ?? 0;
  const summaryTaxPercent = form.watch('pricing.taxPercent') ?? 15;
  const summaryTaxAmount = (summarySubtotal * summaryTaxPercent) / 100;
  const summaryTotal = form.watch('pricing.total') ?? summarySubtotal + summaryTaxAmount;

  return (
    <Form form={form} onSubmit={(e) => e.preventDefault()}>
      <div className='space-y-2'>
        {isEditMode ? (
          <p className='text-base text-black'>
            <span className='font-medium'>
              Referencia de la solicitud actual:
            </span>{' '}
            {referenceLabel}
            {loadedRequestStatus === 'draft' ? (
              <span className='text-muted-foreground'> (borrador)</span>
            ) : loadedRequestStatus === 'paused' ? (
              <span className='text-muted-foreground'> (pausada)</span>
            ) : null}
          </p>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger
              value='type'
              className='flex cursor-pointer items-center justify-center gap-2'
            >
              <span>1. Datos</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tabStatus.type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </TabsTrigger>
            <TabsTrigger
              value='client'
              className='flex cursor-pointer items-center justify-center gap-2'
            >
              <span>2. Cliente</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tabStatus.client === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </TabsTrigger>
            <TabsTrigger
              value='samples'
              className='flex cursor-pointer items-center justify-center gap-2'
            >
              <span>3. Servicios</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tabStatus.samples === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </TabsTrigger>
            <TabsTrigger value='summary' className='cursor-pointer'>
              4. Resumen
            </TabsTrigger>
          </TabsList>

          {/* PASO A: DATOS Y METADATOS */}
          <TabsContent value='type' className='mt-4 space-y-4'>
            <Card className='border-0 shadow-none'>
              <CardHeader>
                <CardTitle>Datos de la proforma</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control as any}
                  name='matrix'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matriz</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className='flex flex-row space-x-4'
                          onValueChange={(val) => {
                            field.onChange(val);
                            // Operational sample details are captured post-OT.
                            form.setValue('samples.items', []);
                          }}
                          defaultValue={field.value}
                        >
                          <FormItem className='flex items-center space-y-0 space-x-2'>
                            <FormControl>
                              <RadioGroupItem
                                value='water'
                                className='cursor-pointer'
                              />
                            </FormControl>
                            <FormLabel className='font-normal'>Agua</FormLabel>
                          </FormItem>
                          <FormItem className='flex items-center space-y-0 space-x-2'>
                            <FormControl>
                              <RadioGroupItem
                                value='soil'
                                className='cursor-pointer'
                              />
                            </FormControl>
                            <FormLabel className='font-normal'>Suelo</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control as any}
                    name='reference'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referencia</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name='validDays'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validez de oferta (días)</FormLabel>
                        <Select
                          onValueChange={(val) =>
                            field.onChange(parseInt(val))
                          }
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Seleccione validez' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='15'>15 días</SelectItem>
                            <SelectItem value='30'>30 días</SelectItem>
                            <SelectItem value='60'>60 días</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control as any}
                  name='notes'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea {...field} className='min-h-[79px]' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='flex justify-end gap-2'>
                  {showDraftActions ? clearCurrentDataButton : null}
                  {showDraftActions ? (
                    <Button
                      type='button'
                      variant='secondary'
                      disabled={isDraftSaveDisabled}
                      onClick={() => onSubmit(form.getValues(), 'draft')}
                    >
                      Guardar como Borrador
                    </Button>
                  ) : null}
                  <Button type='button' onClick={() => setActiveTab('client')}>
                    Siguiente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PASO B: CLIENTE */}
          <TabsContent value='client' className='mt-4 space-y-4'>
            <Card className='border-0 shadow-none'>
              <CardHeader>
                <CardTitle>Datos del Cliente</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control as any}
                    name='client.businessName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razón Social</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='client.taxId'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RUC</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='client.contactName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persona de Contacto</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='client.contactRole'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo (Opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='client.email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type='email' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='client.phone'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='client.address'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='client.city'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad/Localidad</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className='flex justify-between'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setActiveTab('type')}
                  >
                    Anterior
                  </Button>
                  <div className='flex items-center gap-2'>
                    {showDraftActions ? clearCurrentDataButton : null}
                    {showDraftActions ? (
                      <Button
                        type='button'
                        variant='secondary'
                        disabled={isDraftSaveDisabled}
                        onClick={() => onSubmit(form.getValues(), 'draft')}
                      >
                        Guardar como Borrador
                      </Button>
                    ) : null}
                    <Button
                      type='button'
                      onClick={() => setActiveTab('samples')}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PASO C: SERVICIOS */}
          <TabsContent value='samples' className='mt-4 space-y-4'>
            <Card className='border-0 shadow-none'>
              <CardHeader>
                <CardTitle>Servicios</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-3 rounded-md border p-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <h4 className='text-sm font-semibold'>
                        Servicios seleccionados
                      </h4>
                      <p className='text-muted-foreground text-xs'>
                        Elegí uno o varios servicios importados desde
                        Administración.
                      </p>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      className='cursor-pointer'
                      onClick={handleOpenServicesDialog}
                      disabled={isLoadingAvailableServices}
                    >
                      <Plus className='h-4 w-4' />
                      Agregar servicios
                    </Button>
                  </div>

                  {selectedServices.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>
                      No hay servicios seleccionados.
                    </p>
                  ) : (
                    <div className='space-y-2'>
                      {selectedServices.map((service) => {
                        const serviceId =
                          service.ID_CONFIG_PARAMETRO || service.id;
                        return (
                          <div
                            key={serviceId}
                            className='bg-muted/20 rounded-md border p-3'
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <div className='space-y-3 flex-1'>
                                <p className='text-sm font-medium'>
                                  {service.ID_PARAMETRO || serviceId}
                                </p>
                                <p className='text-muted-foreground text-xs'>
                                  {service.ID_TABLA_NORMA || 'Sin tabla'} •{' '}
                                  {service.UNIDAD_NORMA ||
                                    service.UNIDAD_INTERNO ||
                                    'Sin unidad'}
                                </p>
                                <p className='text-muted-foreground text-xs'>
                                  {service.ID_TECNICA ||
                                    service.ID_MET_REFERENCIA ||
                                    service.ID_MET_INTERNO ||
                                    'Sin método'}
                                </p>
                                <div className='grid grid-cols-1 gap-2 md:grid-cols-5'>
                                  <div className='space-y-1'>
                                    <label
                                      htmlFor={`quantity-${serviceId}`}
                                      className='text-muted-foreground text-xs'
                                    >
                                      Cantidad
                                    </label>
                                    <Input
                                      id={`quantity-${serviceId}`}
                                      type='number'
                                      min={1}
                                      value={service.quantity ?? 1}
                                      onChange={(event) =>
                                        handleUpdateServiceField(
                                          serviceId,
                                          'quantity',
                                          event.target.value
                                        )
                                      }
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <label
                                      htmlFor={`range-min-${serviceId}`}
                                      className='text-muted-foreground text-xs'
                                    >
                                      Rango mínimo
                                    </label>
                                    <Input
                                      id={`range-min-${serviceId}`}
                                      value={service.rangeMin ?? ''}
                                      onChange={(event) =>
                                        handleUpdateServiceField(
                                          serviceId,
                                          'rangeMin',
                                          event.target.value
                                        )
                                      }
                                      placeholder='Ej: 0.10'
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <label
                                      htmlFor={`range-max-${serviceId}`}
                                      className='text-muted-foreground text-xs'
                                    >
                                      Rango máximo
                                    </label>
                                    <Input
                                      id={`range-max-${serviceId}`}
                                      value={service.rangeMax ?? ''}
                                      onChange={(event) =>
                                        handleUpdateServiceField(
                                          serviceId,
                                          'rangeMax',
                                          event.target.value
                                        )
                                      }
                                      placeholder='Ej: 10.00'
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <label
                                      htmlFor={`price-${serviceId}`}
                                      className='text-muted-foreground text-xs'
                                    >
                                      Precio (USD)
                                    </label>
                                    <Input
                                      id={`price-${serviceId}`}
                                      type='number'
                                      min={0}
                                      step='0.01'
                                      value={
                                        typeof service.unitPrice === 'number'
                                          ? service.unitPrice
                                          : ''
                                      }
                                      onChange={(event) =>
                                        handleUpdateServiceField(
                                          serviceId,
                                          'unitPrice',
                                          event.target.value
                                        )
                                      }
                                      placeholder='Ej: 12.50'
                                    />
                                  </div>
                                  <div className='space-y-1'>
                                    <label
                                      htmlFor={`discount-${serviceId}`}
                                      className='text-muted-foreground text-xs'
                                    >
                                      Descuento (USD)
                                    </label>
                                    <Input
                                      id={`discount-${serviceId}`}
                                      type='number'
                                      min={0}
                                      step='0.01'
                                      value={
                                        typeof service.discountAmount ===
                                        'number'
                                          ? service.discountAmount
                                          : ''
                                      }
                                      onChange={(event) =>
                                        handleUpdateServiceField(
                                          serviceId,
                                          'discountAmount',
                                          event.target.value
                                        )
                                      }
                                      placeholder='Ej: 2.50'
                                    />
                                  </div>
                                </div>
                              </div>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 cursor-pointer'
                                onClick={() => handleRemoveService(serviceId)}
                                aria-label='Quitar servicio'
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className='mt-6 flex justify-between'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setActiveTab('client')}
                  >
                    Anterior
                  </Button>
                  <div className='flex items-center gap-2'>
                    {showDraftActions ? clearCurrentDataButton : null}
                    {showDraftActions ? (
                      <Button
                        type='button'
                        variant='secondary'
                        disabled={isDraftSaveDisabled}
                        onClick={() => onSubmit(form.getValues(), 'draft')}
                      >
                        Guardar como Borrador
                      </Button>
                    ) : null}
                    <Button
                      type='button'
                      onClick={() => setActiveTab('summary')}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PASO E: RESUMEN */}
          <TabsContent value='summary' className='mt-4'>
            <Card className='border-0 p-0 shadow-none'>
              <CardContent className='space-y-5 px-6 py-5'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Datos Generales
                    </h4>
                    <p>
                      <span className='font-medium'>Tipo:</span> Proforma
                    </p>
                    <p>
                      <span className='font-medium'>Matriz:</span>{' '}
                      {matrix === 'water' ? 'Agua' : 'Suelo'}
                    </p>
                    <p>
                      <span className='font-medium'>Referencia:</span>{' '}
                      {form.getValues('reference')}
                    </p>
                    <p>
                      <span className='font-medium'>Validez:</span>{' '}
                      {validDaysValue ? `${validDaysValue} días` : '—'}
                    </p>
                    <p>
                      <span className='font-medium'>Válida hasta:</span>{' '}
                      {validUntilLabel}
                    </p>
                  </div>
                  <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Cliente
                    </h4>
                    <p>
                      <span className='font-medium'>Razón Social:</span>{' '}
                      {form.getValues('client.businessName') || '—'}
                    </p>
                    <p>
                      <span className='font-medium'>RUC:</span>{' '}
                      {form.getValues('client.taxId') || '—'}
                    </p>
                    <p>
                      <span className='font-medium'>Contacto:</span>{' '}
                      {form.getValues('client.contactName') || '—'}
                    </p>
                  </div>
                </div>

                <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                  <h4 className='font-semibold text-black'>
                    Servicios ({selectedServices.length})
                  </h4>
                  {selectedServices.length ? (
                    <div className='space-y-1'>
                      {selectedServices.map((service) => (
                        <p
                          key={service.ID_CONFIG_PARAMETRO || service.id}
                          className='text-sm'
                        >
                          {service.ID_PARAMETRO ||
                            service.ID_CONFIG_PARAMETRO ||
                            service.id}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm'>No hay servicios seleccionados.</p>
                  )}
                </div>

                <div className='space-y-4 rounded-md border p-4'>
                  {selectedServices.length > 0 ? (
                    <div className='space-y-2'>
                      <h4 className='text-muted-foreground font-semibold'>
                        Detalle de costos por análisis
                      </h4>
                      <div className='overflow-x-auto rounded-md border'>
                        <table className='w-full text-left text-sm'>
                          <thead className='bg-muted text-muted-foreground'>
                            <tr>
                              <th className='p-2'>Parámetro</th>
                              <th className='p-2 text-right'>Muestras</th>
                              <th className='p-2 text-right'>Costo unitario</th>
                              <th className='p-2 text-right'>Descuento</th>
                              <th className='p-2 text-right'>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedServices.map((service) => {
                              const serviceId =
                                service.ID_CONFIG_PARAMETRO || service.id;
                              const quantity = service.quantity ?? 1;
                              const unitPrice = service.unitPrice ?? null;
                              const discountAmount =
                                service.discountAmount ?? null;
                              const lineBase =
                                unitPrice !== null ? unitPrice * quantity : null;
                              const lineTotal =
                                lineBase !== null
                                  ? Math.max(0, lineBase - (discountAmount ?? 0))
                                  : null;
                              return (
                                <tr key={`summary-cost-${serviceId}`} className='border-t'>
                                  <td className='p-2'>
                                    {service.ID_PARAMETRO || serviceId}
                                  </td>
                                  <td className='p-2 text-right'>{quantity}</td>
                                  <td className='p-2 text-right'>
                                    {unitPrice !== null
                                      ? `$${unitPrice.toFixed(2)}`
                                      : '—'}
                                  </td>
                                  <td className='p-2 text-right'>
                                    {discountAmount !== null
                                      ? `$${discountAmount.toFixed(2)}`
                                      : '—'}
                                  </td>
                                  <td className='p-2 text-right'>
                                    {lineTotal !== null
                                      ? `$${lineTotal.toFixed(2)}`
                                      : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  <h4 className='text-muted-foreground font-semibold'>
                    Costos estimados
                  </h4>
                  <div className='w-full max-w-xs space-y-1'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Subtotal:</span>
                      <span>${summarySubtotal.toFixed(2)}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>
                        IVA ({summaryTaxPercent}%):
                      </span>
                      <span>${summaryTaxAmount.toFixed(2)}</span>
                    </div>
                    <div className='mt-1 flex justify-between border-t pt-1 text-lg font-bold'>
                      <span>Total:</span>
                      <span>${summaryTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {summaryNotes ? (
                  <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Notas
                    </h4>
                    <p className='whitespace-pre-wrap'>{summaryNotes}</p>
                  </div>
                ) : null}

                <div className='mt-6 flex justify-between border-t pt-4'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setActiveTab('samples')}
                  >
                    Anterior
                  </Button>
                  <div className='flex items-center gap-2'>
                    {showDraftActions ? clearCurrentDataButton : null}
                    {isDraftEditMode ? (
                      <>
                        <Button
                          type='button'
                          className='bg-black text-white hover:bg-black/90 disabled:bg-black disabled:text-white'
                          disabled={
                            isSubmitting || isLoadingRequest || !canSubmitFinal
                          }
                          onClick={handleExecuteClick}
                        >
                          Ejecutar Proforma
                        </Button>
                      </>
                    ) : isEditMode ? (
                      <Button
                        type='button'
                        disabled={
                          isSubmitting || isLoadingRequest || !canSubmitFinal
                        }
                        onClick={() =>
                          form.handleSubmit((data) => onUpdateRequest(data))()
                        }
                      >
                        Actualizar solicitud
                      </Button>
                    ) : (
                      <>
                        {showDraftActions ? (
                          <Button
                            type='button'
                            variant='secondary'
                            disabled={isDraftSaveDisabled}
                            onClick={() => onSubmit(form.getValues(), 'draft')}
                          >
                            Guardar como Borrador
                          </Button>
                        ) : null}
                        <Button
                          type='button'
                          className='bg-black text-white hover:bg-black/90 disabled:bg-black disabled:text-white'
                          disabled={
                            isSubmitting || isLoadingRequest || !canSubmitFinal
                          }
                          onClick={handleExecuteClick}
                        >
                          Ejecutar Proforma
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog
        open={isServicesDialogOpen}
        onOpenChange={setIsServicesDialogOpen}
      >
        <AlertDialogContent className='w-[96vw] max-w-[1100px] sm:max-w-[1100px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>Agregar servicios</AlertDialogTitle>
            <AlertDialogDescription>
              Seleccioná uno o varios servicios para incluir en la proforma.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='max-h-[28rem] space-y-2 overflow-y-auto pr-1'>
            {isLoadingAvailableServices ? (
              <p className='text-muted-foreground text-sm'>
                Cargando servicios...
              </p>
            ) : availableServices.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                No hay servicios disponibles. Importalos desde Administración.
              </p>
            ) : (
              availableServices.map((service) => {
                const serviceId = service.ID_CONFIG_PARAMETRO || service.id;
                const isSelected = dialogSelectedServiceIds.includes(serviceId);
                return (
                  <button
                    key={serviceId}
                    type='button'
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-black bg-black/5'
                        : 'hover:bg-muted/50 border-border'
                    }`}
                    onClick={() => handleToggleServiceSelection(serviceId)}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='space-y-1'>
                        <p className='text-sm font-medium'>
                          {service.ID_PARAMETRO || serviceId}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {service.ID_TABLA_NORMA || 'Sin tabla'} •{' '}
                          {service.UNIDAD_NORMA ||
                            service.UNIDAD_INTERNO ||
                            'Sin unidad'}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {service.ID_TECNICA ||
                            service.ID_MET_REFERENCIA ||
                            service.ID_MET_INTERNO ||
                            'Sin método'}
                        </p>
                      </div>
                      {isSelected ? (
                        <span className='inline-flex h-6 w-6 items-center justify-center rounded-full border border-black bg-black text-white'>
                          <Check className='h-3.5 w-3.5' />
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90'
              onClick={handleAddServicesToForm}
              disabled={
                isLoadingAvailableServices ||
                availableServices.length === 0 ||
                dialogSelectedServiceIds.length === 0
              }
            >
              Agregar seleccionados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar vaciado de datos</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea vaciar los datos actualmente cargados en
              este configurador? Esta acción eliminará la información en curso y
              no podrá deshacerse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive hover:bg-destructive/90 cursor-pointer text-white'
              onClick={handleConfirmClearCurrentData}
            >
              Vaciar datos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
