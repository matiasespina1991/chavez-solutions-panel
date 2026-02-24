'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trash2 } from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { waterParameters } from '../catalogs/water.parameters';
import { soilParameters } from '../catalogs/soil.parameters';
import { packages } from '../catalogs/packages';
import {
  createConfiguration,
  createWorkOrderFromRequest,
  getConfigurationById,
  updateConfiguration,
  ConfigurationDocument
} from '../services/configurations';

const formSchema = z.object({
  type: z.enum(['proforma', 'work_order', 'both']),
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
        sampleCode: z.string().min(1, 'Código requerido'),
        sampleType: z.string().min(1, 'Tipo requerido'),
        takenAt: z.date().nullable().optional(),
        notes: z.string().default('')
      })
    )
  }),
  analyses: z.object({
    applyMode: z.enum(['all_samples', 'by_sample']),
    items: z
      .array(
        z.object({
          parameterId: z.string(),
          parameterLabelEs: z.string(),
          unit: z.string(),
          method: z.string(),
          rangeOffered: z.string(),
          isAccredited: z.boolean(),
          turnaround: z.enum(['standard', 'urgent']),
          unitPrice: z.number().nullable(),
          appliesToSampleCodes: z.array(z.string()).nullable()
        })
      )
      .min(1, 'Seleccione al menos un parámetro')
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

const createDefaultFormValues = (): FormValues => ({
  type: 'both',
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
    items: [
      {
        sampleCode: 'M-001',
        sampleType: '',
        takenAt: null,
        notes: ''
      }
    ]
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

export default function ConfiguratorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRequestId = searchParams.get('requestId');
  const isEditMode = Boolean(editRequestId);
  const cacheKey = `configurator:cache:${editRequestId ?? 'new'}`;
  const [activeTab, setActiveTab] = useState('type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const requestedTab = searchParams.get('tab');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: createDefaultFormValues()
  });

  const {
    fields: sampleItems,
    append: appendSample,
    remove: removeSample,
    replace: replaceSamples
  } = useFieldArray({
    control: form.control,
    name: 'samples.items'
  });

  const {
    fields: analysisItems,
    append: appendAnalysis,
    remove: removeAnalysis
  } = useFieldArray({
    control: form.control,
    name: 'analyses.items'
  });

  useEffect(() => {
    if (
      requestedTab &&
      ['type', 'client', 'samples', 'analyses', 'summary'].includes(
        requestedTab
      )
    ) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const matrix = form.watch('matrix');
  const agreedCount = form.watch('samples.agreedCount');
  const type = form.watch('type');
  const analysesItemsWatch = useWatch({
    control: form.control,
    name: 'analyses.items',
    defaultValue: []
  });
  const clientWatch = form.watch('client');
  const samplesWatch = form.watch('samples');
  const analysesWatch = form.watch('analyses');

  const tabStatus: Record<
    'type' | 'client' | 'samples' | 'analyses',
    'ok' | 'error'
  > = {
    type: (() => {
      const reference = form.watch('reference');
      const matrixValue = matrix;
      const typeValue = type;
      const validDays = form.watch('validDays');

      if (!reference || !matrixValue || !typeValue) return 'error';
      if ((typeValue === 'proforma' || typeValue === 'both') && !validDays)
        return 'error';
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
      if (!samples.items || samples.items.length === 0) return 'error';
      if (samples.items.some((item) => !item.sampleCode || !item.sampleType))
        return 'error';
      return 'ok';
    })(),
    analyses: (() => {
      const analyses = analysesWatch;
      if (!analyses) return 'error';
      if (!analyses.items || analyses.items.length === 0) return 'error';
      return 'ok';
    })()
  };

  const canSubmitFinal =
    tabStatus.type === 'ok' &&
    tabStatus.client === 'ok' &&
    tabStatus.samples === 'ok' &&
    tabStatus.analyses === 'ok';

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
    if (typeof window === 'undefined' || editRequestId) return;

    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (!cached) return;

      const parsed = JSON.parse(cached) as unknown;
      form.reset(mergeWithCachedValues(createDefaultFormValues(), parsed));
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
          type: existing.type,
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
            items: existing.samples.items.map((item) => ({
              sampleCode: item.sampleCode,
              sampleType: item.sampleType,
              takenAt: toDateOrNull(item.takenAt),
              notes: item.notes || ''
            }))
          },
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

        if (typeof window !== 'undefined') {
          try {
            const cached = window.localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached) as unknown;
              form.reset(mergeWithCachedValues(loadedValues, parsed));
              return;
            }
          } catch (error) {
            console.error('Error restoring edit cache:', error);
          }
        }

        form.reset(loadedValues);
      } catch (error) {
        console.error('Error loading request for edit:', error);
        toast.error('No se pudo cargar la solicitud para editar');
      } finally {
        setIsLoadingRequest(false);
      }
    };

    loadRequest();
  }, [cacheKey, editRequestId, form, router]);

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

  // Update sample items when agreedCount changes
  useEffect(() => {
    const currentCount = sampleItems.length;
    const targetCount = agreedCount || 1;

    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        appendSample({
          sampleCode: `M-${String(i + 1).padStart(3, '0')}`,
          sampleType: '',
          takenAt: null,
          notes: ''
        });
      }
    } else if (targetCount < currentCount) {
      for (let i = currentCount - 1; i >= targetCount; i--) {
        removeSample(i);
      }
    }
    form.setValue('samples.executedCount', targetCount);
  }, [agreedCount, appendSample, removeSample, sampleItems.length, form]);

  // Calculate totals
  useEffect(() => {
    if (type === 'work_order') return;

    const subtotal = analysesItemsWatch.reduce((acc, item) => {
      const price = item.unitPrice || 0;
      return acc + price * agreedCount;
    }, 0);

    const taxPercent = form.getValues('pricing.taxPercent') || 15;
    const total = subtotal + (subtotal * taxPercent) / 100;

    form.setValue('pricing.subtotal', subtotal);
    form.setValue('pricing.total', total);
  }, [analysesItemsWatch, agreedCount, type, form]);

  const handleAddPackage = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;

    const availableParams =
      matrix === 'water' ? waterParameters : soilParameters;

    pkg.parameterIds.forEach((paramId) => {
      // Check if already added
      if (analysesItemsWatch.some((item) => item.parameterId === paramId))
        return;

      const param = availableParams.find((p) => p.id === paramId);
      if (param) {
        appendAnalysis({
          parameterId: param.id,
          parameterLabelEs: param.labelEs,
          unit: param.defaultUnit,
          method: param.defaultMethod,
          rangeOffered: param.defaultRange || '',
          isAccredited: param.accreditedDefault || false,
          turnaround: 'standard',
          unitPrice: 0,
          appliesToSampleCodes: null
        });
      }
    });
  };

  const handleAddParameter = (paramId: string) => {
    if (analysesItemsWatch.some((item) => item.parameterId === paramId)) return;

    const availableParams =
      matrix === 'water' ? waterParameters : soilParameters;
    const param = availableParams.find((p) => p.id === paramId);

    if (param) {
      appendAnalysis({
        parameterId: param.id,
        parameterLabelEs: param.labelEs,
        unit: param.defaultUnit,
        method: param.defaultMethod,
        rangeOffered: param.defaultRange || '',
        isAccredited: param.accreditedDefault || false,
        turnaround: 'standard',
        unitPrice: 0,
        appliesToSampleCodes: null
      });
    }
  };

  const onSubmit = async (values: FormValues, status: 'draft' | 'final') => {
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
          items: values.samples.items.map((item) => ({
            ...item,
            takenAt: item.takenAt || null,
            notes: item.notes || ''
          }))
        },
        analyses: values.analyses,
        pricing: values.pricing
      };

      const requestId = await createConfiguration(docData);

      if (
        status === 'final' &&
        (values.type === 'work_order' || values.type === 'both')
      ) {
        await createWorkOrderFromRequest(requestId);
        toast.success(
          `Solicitud ejecutada y Orden de Trabajo emitida (${values.reference})`
        );
      } else {
        if (status === 'draft') {
          toast.success('Solicitud guardada como borrador');
        } else {
          toast.success('Proforma emitida correctamente');
        }
      }
      removeCachedDraft();
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('No se pudo guardar la solicitud');
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
          items: values.samples.items.map((item) => ({
            ...item,
            takenAt: item.takenAt || null,
            notes: item.notes || ''
          }))
        },
        analyses: values.analyses,
        pricing: values.pricing
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

  const availablePackages = packages.filter((p) => p.matrix === matrix);
  const availableParameters =
    matrix === 'water' ? waterParameters : soilParameters;

  return (
    <Form form={form} onSubmit={(e) => e.preventDefault()}>
      <div className='space-y-8'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full grid-cols-5'>
            <TabsTrigger
              value='type'
              className='flex cursor-pointer items-center justify-center gap-2'
            >
              <span>1. Tipo</span>
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
              <span>3. Muestras</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tabStatus.samples === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </TabsTrigger>
            <TabsTrigger
              value='analyses'
              className='flex cursor-pointer items-center justify-center gap-2'
            >
              <span>4. Análisis</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tabStatus.analyses === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </TabsTrigger>
            <TabsTrigger value='summary' className='cursor-pointer'>
              5. Resumen
            </TabsTrigger>
          </TabsList>

          {/* PASO A: TIPO Y METADATOS */}
          <TabsContent value='type' className='mt-4 space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Documento y Metadatos</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control as any}
                  name='type'
                  render={({ field }) => (
                    <FormItem className='space-y-3'>
                      <FormLabel>Tipo de documento</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className='flex flex-col space-y-1'
                        >
                          <FormItem className='flex items-center space-y-0 space-x-3'>
                            <FormControl>
                              <RadioGroupItem
                                value='proforma'
                                className='cursor-pointer'
                              />
                            </FormControl>
                            <FormLabel className='font-normal'>
                              Proforma
                            </FormLabel>
                          </FormItem>
                          <FormItem className='flex items-center space-y-0 space-x-3'>
                            <FormControl>
                              <RadioGroupItem
                                value='work_order'
                                className='cursor-pointer'
                              />
                            </FormControl>
                            <FormLabel className='font-normal'>
                              Orden de Trabajo (OT)
                            </FormLabel>
                          </FormItem>
                          <FormItem className='flex items-center space-y-0 space-x-3'>
                            <FormControl>
                              <RadioGroupItem
                                value='both'
                                className='cursor-pointer'
                              />
                            </FormControl>
                            <FormLabel className='font-normal'>
                              Proforma + OT
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                            // Reset samples and analyses when matrix changes
                            replaceSamples([
                              {
                                sampleCode: 'M-001',
                                sampleType: '',
                                takenAt: null,
                                notes: ''
                              }
                            ]);
                            form.setValue('analyses.items', []);
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

                  {(type === 'proforma' || type === 'both') && (
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
                  )}
                </div>

                <FormField
                  control={form.control as any}
                  name='notes'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='flex justify-end gap-2'>
                  {clearCurrentDataButton}
                  <Button type='button' onClick={() => setActiveTab('client')}>
                    Siguiente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PASO B: CLIENTE */}
          <TabsContent value='client' className='mt-4 space-y-4'>
            <Card>
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
                    {clearCurrentDataButton}
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

          {/* PASO C: MUESTRAS */}
          <TabsContent value='samples' className='mt-4 space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Muestras / Fuentes</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-3 gap-4'>
                  <FormField
                    control={form.control as any}
                    name='samples.agreedCount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Muestras Acordadas</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={1}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 1)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='samples.additionalCount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Muestras Adicionales</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='samples.executedCount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ejecutadas</FormLabel>
                        <FormControl>
                          <Input type='number' disabled {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='mt-6 space-y-4'>
                  <h3 className='text-lg font-medium'>Detalle de Muestras</h3>
                  {sampleItems.map((item, index) => (
                    <div
                      key={item.id}
                      className='grid grid-cols-4 items-end gap-4 rounded-md border p-4'
                    >
                      <FormField
                        control={form.control as any}
                        name={`samples.items.${index}.sampleCode`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control as any}
                        name={`samples.items.${index}.sampleType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Muestra</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder='Seleccione tipo' />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {matrix === 'water' ? (
                                  <>
                                    <SelectItem value='pozo'>Pozo</SelectItem>
                                    <SelectItem value='red'>Red</SelectItem>
                                    <SelectItem value='superficial'>
                                      Superficial
                                    </SelectItem>
                                    <SelectItem value='residual'>
                                      Residual
                                    </SelectItem>
                                    <SelectItem value='otra'>Otra</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value='puntual'>
                                      Puntual
                                    </SelectItem>
                                    <SelectItem value='compuesta'>
                                      Compuesta
                                    </SelectItem>
                                    <SelectItem value='otra'>Otra</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control as any}
                        name={`samples.items.${index}.notes`}
                        render={({ field }) => (
                          <FormItem className='col-span-2'>
                            <FormLabel>Observaciones</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
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
                    {clearCurrentDataButton}
                    <Button
                      type='button'
                      onClick={() => setActiveTab('analyses')}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PASO D: ANÁLISIS */}
          <TabsContent value='analyses' className='mt-4 space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Análisis Solicitados</CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='space-y-4'>
                  <h3 className='text-lg font-medium'>1. Paquetes</h3>
                  <div className='flex flex-wrap gap-2'>
                    {availablePackages.map((pkg) => (
                      <Button
                        key={pkg.id}
                        type='button'
                        variant='secondary'
                        onClick={() => handleAddPackage(pkg.id)}
                      >
                        + {pkg.labelEs}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className='space-y-4'>
                  <h3 className='text-lg font-medium'>
                    2. Parámetros Individuales
                  </h3>
                  <Select onValueChange={handleAddParameter}>
                    <SelectTrigger className='w-[300px]'>
                      <SelectValue placeholder='Agregar parámetro...' />
                    </SelectTrigger>
                    <SelectContent>
                      {availableParameters.map((param) => (
                        <SelectItem key={param.id} value={param.id}>
                          {param.labelEs}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-4'>
                  <h3 className='text-lg font-medium'>
                    Parámetros Seleccionados
                  </h3>
                  {analysisItems.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>
                      No hay parámetros seleccionados.
                    </p>
                  ) : (
                    <div className='overflow-x-auto rounded-md border'>
                      <table className='w-full text-left text-sm'>
                        <thead className='bg-muted text-muted-foreground'>
                          <tr>
                            <th className='p-3'>Parámetro</th>
                            <th className='p-3'>Unidades</th>
                            <th className='p-3'>Método</th>
                            <th className='p-3'>Acreditado</th>
                            <th className='p-3'>Tiempo</th>
                            {(type === 'proforma' || type === 'both') && (
                              <th className='p-3'>Costo Unit.</th>
                            )}
                            <th className='p-3'></th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisItems.map((item, index) => (
                            <tr key={item.id} className='border-t'>
                              <td className='p-3 font-medium'>
                                {item.parameterLabelEs}
                              </td>
                              <td className='p-3'>
                                <FormField
                                  control={form.control as any}
                                  name={`analyses.items.${index}.unit`}
                                  render={({ field }) => (
                                    <Input {...field} className='h-8 w-24' />
                                  )}
                                />
                              </td>
                              <td className='p-3'>
                                <FormField
                                  control={form.control as any}
                                  name={`analyses.items.${index}.method`}
                                  render={({ field }) => (
                                    <Input {...field} className='h-8 w-32' />
                                  )}
                                />
                              </td>
                              <td className='p-3 text-center'>
                                <FormField
                                  control={form.control as any}
                                  name={`analyses.items.${index}.isAccredited`}
                                  render={({ field }) => (
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  )}
                                />
                              </td>
                              <td className='p-3'>
                                <FormField
                                  control={form.control as any}
                                  name={`analyses.items.${index}.turnaround`}
                                  render={({ field }) => (
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                    >
                                      <SelectTrigger className='h-8 w-28'>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value='standard'>
                                          Estándar
                                        </SelectItem>
                                        <SelectItem value='urgent'>
                                          Urgente
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </td>
                              {(type === 'proforma' || type === 'both') && (
                                <td className='p-3'>
                                  <FormField
                                    control={form.control as any}
                                    name={`analyses.items.${index}.unitPrice`}
                                    render={({ field }) => (
                                      <Input
                                        type='number'
                                        step='0.01'
                                        className='h-8 w-24'
                                        value={field.value || ''}
                                        onChange={(e) =>
                                          field.onChange(
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                      />
                                    )}
                                  />
                                </td>
                              )}
                              <td className='p-3'>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => removeAnalysis(index)}
                                  className='text-destructive'
                                >
                                  X
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {form.formState.errors.analyses?.items && (
                    <p className='text-destructive text-sm font-medium'>
                      {form.formState.errors.analyses.items.message}
                    </p>
                  )}
                </div>

                <div className='mt-6 flex justify-between'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setActiveTab('samples')}
                  >
                    Anterior
                  </Button>
                  <div className='flex items-center gap-2'>
                    {clearCurrentDataButton}
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
            <Card className='p-0'>
              <CardHeader className='border-b px-6 py-4'>
                <CardTitle>Resumen de solicitud</CardTitle>
                <p className='text-muted-foreground text-sm'>
                  Vista consolidada de cliente, muestras, análisis y costos.
                </p>
              </CardHeader>
              <CardContent className='space-y-5 px-6 py-5'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Datos Generales
                    </h4>
                    <p>
                      <span className='font-medium'>Tipo:</span>{' '}
                      {type === 'both'
                        ? 'Proforma + OT'
                        : type === 'proforma'
                          ? 'Proforma'
                          : 'Orden de Trabajo'}
                    </p>
                    <p>
                      <span className='font-medium'>Matriz:</span>{' '}
                      {matrix === 'water' ? 'Agua' : 'Suelo'}
                    </p>
                    <p>
                      <span className='font-medium'>Referencia:</span>{' '}
                      {form.getValues('reference')}
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
                  <h4 className='text-muted-foreground font-semibold'>
                    Muestras ({agreedCount})
                  </h4>
                  <div className='flex flex-wrap gap-2'>
                    {sampleItems.map((s) => (
                      <span
                        key={s.id}
                        className='bg-muted rounded border px-2 py-1 text-sm'
                      >
                        {s.sampleCode} ({s.sampleType || 'Sin tipo'})
                      </span>
                    ))}
                  </div>
                </div>

                <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                  <h4 className='text-muted-foreground font-semibold'>
                    Análisis ({analysisItems.length})
                  </h4>
                  <div className='flex flex-wrap gap-2'>
                    {analysisItems.map((a) => (
                      <span
                        key={a.id}
                        className='bg-muted rounded border px-2 py-1 text-sm'
                      >
                        {a.parameterLabelEs}
                      </span>
                    ))}
                  </div>
                </div>

                {(type === 'proforma' || type === 'both') && (
                  <div className='space-y-4 rounded-md border p-4'>
                    {analysesItemsWatch && analysesItemsWatch.length > 0 && (
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
                                <th className='p-2 text-right'>
                                  Costo unitario
                                </th>
                                <th className='p-2 text-right'>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysesItemsWatch.map((item, index) => {
                                const unitPrice = item?.unitPrice || 0;
                                const samplesCount = agreedCount || 0;
                                const lineTotal = unitPrice * samplesCount;
                                return (
                                  <tr key={index} className='border-t'>
                                    <td className='p-2'>
                                      {item?.parameterLabelEs}
                                    </td>
                                    <td className='p-2 text-right'>
                                      {samplesCount}
                                    </td>
                                    <td className='p-2 text-right'>
                                      ${unitPrice.toFixed(2)}
                                    </td>
                                    <td className='p-2 text-right'>
                                      ${lineTotal.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    <h4 className='text-muted-foreground font-semibold'>
                      Costos Estimados
                    </h4>
                    <div className='w-full max-w-xs space-y-1'>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Subtotal:</span>{' '}
                        <span>
                          ${form.getValues('pricing.subtotal')?.toFixed(2)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                          IVA ({form.getValues('pricing.taxPercent')}%):
                        </span>{' '}
                        <span>
                          $
                          {(
                            ((form.getValues('pricing.subtotal') || 0) *
                              (form.getValues('pricing.taxPercent') || 15)) /
                            100
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className='mt-1 flex justify-between border-t pt-1 text-lg font-bold'>
                        <span>Total:</span>{' '}
                        <span>
                          ${form.getValues('pricing.total')?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className='mt-6 flex justify-between border-t pt-4'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setActiveTab('analyses')}
                  >
                    Anterior
                  </Button>
                  <div className='flex items-center gap-2'>
                    {clearCurrentDataButton}
                    {isEditMode ? (
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
                        <Button
                          type='button'
                          variant='secondary'
                          disabled={isSubmitting || isLoadingRequest}
                          onClick={() =>
                            form.handleSubmit((data) =>
                              onSubmit(data, 'draft')
                            )()
                          }
                        >
                          Guardar como Borrador
                        </Button>
                        <Button
                          type='button'
                          disabled={
                            isSubmitting || isLoadingRequest || !canSubmitFinal
                          }
                          onClick={() =>
                            form.handleSubmit((data) =>
                              onSubmit(data, 'final')
                            )()
                          }
                        >
                          {type === 'proforma'
                            ? 'Ejecutar Proforma'
                            : type === 'both'
                              ? 'Ejecutar Proforma + OT'
                              : 'Ejecutar Orden de Trabajo'}
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
