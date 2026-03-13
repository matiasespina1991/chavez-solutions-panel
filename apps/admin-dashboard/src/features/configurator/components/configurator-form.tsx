'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        sampleCode: z.string().optional().default(''),
        sampleType: z.string().optional().default(''),
        takenAt: z.date().nullable().optional(),
        notes: z.string().default('')
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
    items: []
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
  const [loadedRequestStatus, setLoadedRequestStatus] = useState<
    'draft' | 'final' | 'paused' | null
  >(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [pendingExecutionData, setPendingExecutionData] =
    useState<FormValues | null>(null);
  const requestedTab = searchParams.get('tab');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: createDefaultFormValues()
  });

  useEffect(() => {
    if (
      requestedTab &&
      ['type', 'client', 'samples', 'summary'].includes(requestedTab)
    ) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const matrix = form.watch('matrix');
  const reference = form.watch('reference');
  const agreedCount = form.watch('samples.agreedCount');
  const type = form.watch('type');
  const clientWatch = form.watch('client');
  const samplesWatch = form.watch('samples');

  const tabStatus: Record<'type' | 'client' | 'samples', 'ok' | 'error'> = {
    type: (() => {
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
      return 'ok';
    })()
  };

  const canSubmitFinal =
    tabStatus.type === 'ok' &&
    tabStatus.client === 'ok' &&
    tabStatus.samples === 'ok';

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
            items: []
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

  // Keep executed count aligned with agreed count
  useEffect(() => {
    const targetCount = agreedCount || 1;
    form.setValue('samples.executedCount', targetCount);
    form.setValue('samples.items', []);
  }, [agreedCount, form]);

  // Calculate totals
  useEffect(() => {
    if (type === 'work_order') {
      form.setValue('pricing.subtotal', 0);
      form.setValue('pricing.total', 0);
      return;
    }

    const subtotal = 0;

    const taxPercent = form.getValues('pricing.taxPercent') || 15;
    const total = subtotal + (subtotal * taxPercent) / 100;

    form.setValue('pricing.subtotal', subtotal);
    form.setValue('pricing.total', total);
  }, [type, form]);

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
        analyses: {
          applyMode: 'all_samples',
          items: []
        },
        pricing: {
          ...values.pricing,
          subtotal: 0,
          total: 0
        }
      };

      const requestId = editRequestId ?? (await createConfiguration(docData));

      if (editRequestId) {
        await updateConfiguration(editRequestId, {
          ...docData,
          status
        });
      }

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
        analyses: {
          applyMode: 'all_samples',
          items: []
        },
        pricing: {
          ...values.pricing,
          subtotal: 0,
          total: 0
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
    form.handleSubmit((data) => {
      if (data.type === 'work_order' || data.type === 'both') {
        setPendingExecutionData(data);
        setIsExecuteDialogOpen(true);
        return;
      }

      onSubmit(data, 'final');
    })();
  };

  const handleConfirmExecute = () => {
    if (!pendingExecutionData) return;
    onSubmit(pendingExecutionData, 'final');
    setIsExecuteDialogOpen(false);
    setPendingExecutionData(null);
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
            <TabsTrigger value='summary' className='cursor-pointer'>
              4. Resumen
            </TabsTrigger>
          </TabsList>

          {/* PASO A: TIPO Y METADATOS */}
          <TabsContent value='type' className='mt-4 space-y-4'>
            <Card className='border-0 shadow-none'>
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

          {/* PASO C: MUESTRAS */}
          <TabsContent value='samples' className='mt-4 space-y-4'>
            <Card className='border-0 shadow-none'>
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

                <div className='mt-6 rounded-md border p-4'>
                  <p className='text-muted-foreground text-sm'>
                    El detalle operativo de muestras (códigos, tipo y
                    observaciones) se registra después de la emisión de OT,
                    durante logística/campo.
                  </p>
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
                    {(type === 'proforma' || type === 'both') && (
                      <>
                        <p>
                          <span className='font-medium'>Validez:</span>{' '}
                          {validDaysValue ? `${validDaysValue} días` : '—'}
                        </p>
                        <p>
                          <span className='font-medium'>Válida hasta:</span>{' '}
                          {validUntilLabel}
                        </p>
                      </>
                    )}
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
                  <p className='text-muted-foreground text-sm'>
                    Cantidad estimada para la proforma. El detalle de muestras
                    se completa en la etapa operativa.
                  </p>
                </div>

                <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                  <h4 className='text-muted-foreground font-semibold'>
                    Análisis de laboratorio
                  </h4>
                  <p className='text-muted-foreground text-sm'>
                    Los análisis se registran después de emitir la orden de
                    trabajo, en la etapa operativa/laboratorio.
                  </p>
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
                          {type === 'proforma'
                            ? 'Ejecutar Proforma'
                            : type === 'both'
                              ? 'Ejecutar Proforma + OT'
                              : 'Ejecutar Orden de Trabajo'}
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

      <AlertDialog
        open={isExecuteDialogOpen}
        onOpenChange={(open) => {
          if (isSubmitting) return;
          setIsExecuteDialogOpen(open);
          if (!open) setPendingExecutionData(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar emisión de orden de trabajo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Está por ejecutar una solicitud que emitirá una orden de trabajo.
              Esta acción iniciará el proceso operativo y actualizará el estado
              de la solicitud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isSubmitting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer'
              onClick={handleConfirmExecute}
              disabled={isSubmitting}
            >
              Confirmar y ejecutar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
