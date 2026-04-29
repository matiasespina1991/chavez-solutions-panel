'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownToLine,
  Loader2,
  Mail,
  Send,
  Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

import {
  createConfiguration,
  getConfigurationById,
  updateConfiguration,
  type ConfigurationDocument,
  type ImportedServiceDocument,
  listImportedServices
} from '../services/configurations';
import {
  generateProformaPreviewPdf,
  sendProformaPreviewEmail,
  toProformaPreviewServiceLine
} from '@/features/requests/services/request-preview';
import { ConfiguratorCommonDialogs } from '@/features/configurator/components/configurator-common-dialogs';
import { ConfiguratorClientTab } from '@/features/configurator/components/configurator-client-tab';
import { ConfiguratorServicesDialog } from '@/features/configurator/components/configurator-services-dialog';
import { ConfiguratorServicesTab } from '@/features/configurator/components/configurator-services-tab';
import { ConfiguratorSummaryTab } from '@/features/configurator/components/configurator-summary-tab';
import { ConfiguratorTypeTab } from '@/features/configurator/components/configurator-type-tab';
import { cn } from '@/lib/utils';
import {
  createDefaultFormValues,
  formSchema,
  TAB_ORDER,
  type ConfiguratorTab,
  type FormValues,
  type SelectedService
} from '@/features/configurator/lib/configurator-form-model';
import {
  mapServiceGroupsToDocument,
  mapSelectedServicesToDocument,
  mapServicesToAnalyses,
  mapStoredServiceGroups,
  mapStoredServicesToSelected,
  normalizeRangeValue,
  parseRangeOffered
} from '@/features/configurator/lib/configurator-service-mappers';
import { useConfiguratorServiceDialog } from '@/features/configurator/hooks/use-configurator-service-dialog';
import { useConfiguratorServiceSelectionState } from '@/features/configurator/hooks/use-configurator-service-selection-state';

export default function ConfiguratorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRequestId = searchParams.get('requestId');
  const isEditMode = Boolean(editRequestId);
  const cacheKey = `configurator:cache:${editRequestId ?? 'new'}`;
  const [activeTab, setActiveTab] = useState<ConfiguratorTab>('client');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPreviewPdf, setIsGeneratingPreviewPdf] = useState(false);
  const [isSendEmailDialogOpen, setIsSendEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingPreviewEmail, setIsSendingPreviewEmail] = useState(false);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [loadedRequestStatus, setLoadedRequestStatus] = useState<
    'draft' | 'final' | 'paused' | null
  >(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState<
    ImportedServiceDocument[]
  >([]);
  const [isLoadingAvailableServices, setIsLoadingAvailableServices] =
    useState(false);

  const getServiceId = (service: ImportedServiceDocument) =>
    service.ID_CONFIG_PARAMETRO || service.id;

  const getMatEnsayoLabel = (service: ImportedServiceDocument) => {
    const value = service.ID_MAT_ENSAYO?.trim();
    return value && value.length > 0 ? value : 'Sin material de ensayo';
  };

  const getMatrizLabel = (service: ImportedServiceDocument) => {
    const value = service.ID_MATRIZ?.trim();
    return value && value.length > 0 ? value : 'Sin matriz';
  };

  const toSelectedService = (
    service: ImportedServiceDocument,
    overrides?: Partial<SelectedService>
  ): SelectedService => ({
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
  });

  const {
    isMatrixSelectorDialogOpen,
    setIsMatrixSelectorDialogOpen,
    isServicesDialogOpen,
    activeComboMatrix,
    editingGroupId,
    dialogFilters,
    dialogSearchTerm,
    setDialogSearchTerm,
    dialogSelectedServiceIds,
    dialogLockedServiceIds,
    lockedServiceCursorHint,
    setLockedServiceCursorHint,
    isAddFilterDropdownOpen,
    setIsAddFilterDropdownOpen,
    isAppliedFiltersExpanded,
    setIsAppliedFiltersExpanded,
    groupToDelete,
    setGroupToDelete,
    serviceToDelete,
    setServiceToDelete,
    serviceGroups,
    setServiceGroups,
    selectedServices,
    handleOpenMatrixSelectorDialog,
    handleSelectComboMatrix,
    handleEditGroupServices,
    handleToggleDialogFilterValue,
    handleSelectAllVisibleToggle,
    handleClearDialogFilters,
    handleRemoveDialogFilterValue,
    handleToggleServiceSelection,
    handleAddServicesToForm,
    handleUpdateGroupName,
    handleOpenRemoveGroupDialog,
    handleConfirmRemoveGroup,
    handleOpenRemoveService,
    handleConfirmRemoveService,
    handleUpdateServiceField,
    handleServicesDialogOpenChange
  } = useConfiguratorServiceSelectionState({
    availableServices,
    getServiceId,
    getMatrizLabel,
    toSelectedService
  });

  const dialogComboTitle = useMemo(() => {
    if (editingGroupId) {
      const editingGroup = serviceGroups.find(
        (group) => group.id === editingGroupId
      );
      if (editingGroup?.name?.trim()) return editingGroup.name.trim();
    }

    if (activeComboMatrix?.trim()) return activeComboMatrix.trim();
    return 'Combo';
  }, [editingGroupId, serviceGroups, activeComboMatrix]);
  const requestedTab = searchParams.get('tab');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estimatedCostsSectionRef = useRef<HTMLDivElement | null>(null);
  const [isEstimatedCostsInView, setIsEstimatedCostsInView] = useState(false);

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
      const normalizedTab: ConfiguratorTab =
        requestedTab === 'services'
          ? 'samples'
          : (requestedTab as ConfiguratorTab);
      setActiveTab(normalizedTab);
    }
  }, [requestedTab]);

  const reference = form.watch('reference');
  const agreedCount = form.watch('samples.agreedCount');
  const clientWatch = form.watch('client');
  const samplesWatch = form.watch('samples');

  const tabStatus: Record<'type' | 'client' | 'samples', 'ok' | 'error'> = {
    type: (() => {
      const validDays = form.watch('validDays');

      if (!reference) return 'error';
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
      if (selectedServices.length === 0) return 'error';
      const hasInvalidServiceInput = selectedServices.some((service) => {
        const quantity = service.quantity ?? 0;
        const rangeMin = (service.rangeMin ?? '').trim();
        const rangeMax = (service.rangeMax ?? '').trim();
        const {unitPrice} = service;

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

  const {
    filteredAvailableServices,
    matrixOptionsForCombo,
    activeDialogFiltersCount,
    dialogFilterOptionsByKey,
    visibleServiceIds,
    selectedDialogServiceLabels,
    areAllVisibleSelected
  } = useConfiguratorServiceDialog({
    availableServices,
    activeComboMatrix,
    dialogFilters,
    dialogSearchTerm,
    dialogSelectedServiceIds
  });

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
      services?:
        | (Partial<FormValues['services']> & {
          items?: FormValues['services']['items'];
          grouped?: FormValues['services']['grouped'];
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
        ...cached.client
      },
      samples: {
        ...baseValues.samples,
        ...cached.samples,
        items: mergedSampleItems
      },
      services: {
        ...baseValues.services,
        ...(cached.services && !Array.isArray(cached.services)
          ? cached.services
          : {}),
        items:
          cached.services &&
          !Array.isArray(cached.services) &&
          Array.isArray(cached.services.items)
            ? cached.services.items
            : baseValues.services.items,
        grouped:
          cached.services &&
          !Array.isArray(cached.services) &&
          Array.isArray(cached.services.grouped)
            ? cached.services.grouped
            : baseValues.services.grouped
      },
      analyses: {
        ...baseValues.analyses,
        ...cached.analyses,
        items: Array.isArray(cached.analyses?.items)
          ? cached.analyses.items
          : baseValues.analyses.items
      },
      pricing: {
        ...baseValues.pricing,
        ...cached.pricing
      }
    };
  };

  const removeCachedDraft = () => {
    if (globalThis.window === undefined) return;
    globalThis.localStorage.removeItem(cacheKey);
  };

  const handleConfirmClearCurrentData = () => {
    form.reset(createDefaultFormValues());
    setServiceGroups([]);
    setActiveTab('type');
    removeCachedDraft();
    setIsClearDialogOpen(false);
    toast.success('Los datos en curso fueron vaciados correctamente.');
  };

  const clearCurrentDataButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className='inline-flex'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='cursor-pointer'
            disabled={isSubmitting || isLoadingRequest}
            aria-label='Vaciar datos en curso'
            onClick={() => setIsClearDialogOpen(true)}
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Vaciar datos en curso</TooltipContent>
    </Tooltip>
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
    if (availableServices.length === 0 || serviceGroups.length === 0) return;

    setServiceGroups((prev) => {
      let hasChanges = false;

      const next = prev.map((group) => {
        const nextItems = group.items.map((service) => {
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

        return { ...group, items: nextItems };
      });

      return hasChanges ? next : prev;
    });
  }, [availableServices, serviceGroups]);

  useEffect(() => {
    if (globalThis.window === undefined || editRequestId) return;

    try {
      const cached = globalThis.localStorage.getItem(cacheKey);
      if (!cached) return;

      const parsed = JSON.parse(cached) as unknown;
      const merged = mergeWithCachedValues(createDefaultFormValues(), parsed);
      form.reset(merged);
      const restoredServices = merged.services?.items?.length
        ? mapStoredServicesToSelected(merged.services.items, toSelectedService)
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
        );
      if (
        Array.isArray(merged.services?.grouped) &&
        merged.services.grouped.length > 0
      ) {
        setServiceGroups(
          mapStoredServiceGroups(merged.services.grouped, toSelectedService)
        );
      } else if (restoredServices.length > 0) {
        setServiceGroups([
          {
            id: `group-${Date.now()}-0`,
            name: 'Combo 1',
            items: restoredServices
          }
        ]);
      } else {
        setServiceGroups([]);
      }
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
          router.push('/dashboard/requests-list');
          return;
        }

        const loadedValues: FormValues = {
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
          services:
            existing.services &&
            typeof existing.services === 'object' &&
            !Array.isArray(existing.services)
              ? existing.services
              : {
                items: Array.isArray(existing.services)
                  ? existing.services
                  : [],
                grouped: []
              },
          analyses: {
            applyMode: existing.analyses?.applyMode ?? 'all_samples',
            items: existing.analyses?.items ?? []
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
          existing.requestStatus === 'work_order_paused'
            ? 'paused'
            : existing.status
        );

        if (globalThis.window !== undefined) {
          try {
            const cached = globalThis.localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached) as unknown;
              const merged = mergeWithCachedValues(loadedValues, parsed);
              form.reset(merged);
              const restoredServices = merged.services?.items?.length
                ? mapStoredServicesToSelected(
                  merged.services.items,
                  toSelectedService
                )
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
                );
              if (
                Array.isArray(merged.services?.grouped) &&
                merged.services.grouped.length > 0
              ) {
                setServiceGroups(
                  mapStoredServiceGroups(
                    merged.services.grouped,
                    toSelectedService
                  )
                );
              } else if (restoredServices.length > 0) {
                setServiceGroups([
                  {
                    id: `group-${Date.now()}-0`,
                    name: 'Combo 1',
                    items: restoredServices
                  }
                ]);
              } else {
                setServiceGroups([]);
              }

              return;
            }
          } catch (error) {
            console.error('Error restoring edit cache:', error);
          }
        }

        form.reset(loadedValues);
        const restoredServices = loadedValues.services?.items?.length
          ? mapStoredServicesToSelected(
            loadedValues.services.items,
            toSelectedService
          )
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
          );
        if (
          Array.isArray(loadedValues.services?.grouped) &&
          loadedValues.services.grouped.length > 0
        ) {
          setServiceGroups(
            mapStoredServiceGroups(
              loadedValues.services.grouped,
              toSelectedService
            )
          );
        } else if (restoredServices.length > 0) {
          setServiceGroups([
            {
              id: `group-${Date.now()}-0`,
              name: 'Combo 1',
              items: restoredServices
            }
          ]);
        } else {
          setServiceGroups([]);
        }
      } catch (error) {
        console.error('Error loading request for edit:', error);
        toast.error('No se pudo cargar la solicitud para editar');
      } finally {
        setIsLoadingRequest(false);
      }
    };

    void loadRequest();
  }, [cacheKey, editRequestId, form, router]);

  const isDraftEditMode = isEditMode && loadedRequestStatus === 'draft';
  const isPausedEditMode = isEditMode && loadedRequestStatus === 'paused';
  const showDraftActions = !isEditMode;
  const isDraftSaveDisabled =
    isSubmitting || isLoadingRequest || isPausedEditMode;

  useEffect(() => {
    if (globalThis.window === undefined) return;

    const subscription = form.watch((values) => {
      if (isLoadingRequest) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          globalThis.localStorage.setItem(cacheKey, JSON.stringify(values));
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
    if (globalThis.window === undefined || isLoadingRequest) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const currentValues = form.getValues();
        const nextCachedValues: FormValues = {
          ...currentValues,
          services: {
            ...currentValues.services,
            items: mapSelectedServicesToDocument(selectedServices, getServiceId),
            grouped: mapServiceGroupsToDocument(serviceGroups, getServiceId)
          }
        };
        globalThis.localStorage.setItem(cacheKey, JSON.stringify(nextCachedValues));
      } catch (error) {
        console.error(
          'Error persisting configurator cache from service groups:',
          error
        );
      }
    }, 250);
  }, [cacheKey, form, isLoadingRequest, selectedServices, serviceGroups]);

  useEffect(() => {
    const mappedAnalyses = mapServicesToAnalyses(selectedServices, getServiceId);
    const mappedServiceItems = mapSelectedServicesToDocument(
      selectedServices,
      getServiceId
    );
    form.setValue('services', {
      items: mappedServiceItems,
      grouped: mapServiceGroupsToDocument(serviceGroups, getServiceId)
    });
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
  }, [form, selectedServices, serviceGroups]);

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
        isWorkOrder: loadedRequestStatus === 'paused',
        matrix: values.matrix,
        reference: status === 'draft' ? '' : values.reference,
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
        services: {
          items: mapSelectedServicesToDocument(selectedServices, getServiceId),
          grouped: mapServiceGroupsToDocument(serviceGroups, getServiceId)
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
            ? 'Solicitud actualizada y proforma guardada correctamente'
            : 'Proforma guardada correctamente'
        );
      }

      removeCachedDraft();
      router.push('/dashboard/requests-list');
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
        isWorkOrder: loadedRequestStatus === 'paused',
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
        services: {
          items: mapSelectedServicesToDocument(selectedServices, getServiceId),
          grouped: mapServiceGroupsToDocument(serviceGroups, getServiceId)
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
      router.push('/dashboard/requests-list');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Error al actualizar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteClick = () => {
    void form.handleSubmit(async (data) => onSubmit(data, 'final'))();
  };

  const summaryNotes = (form.getValues('notes') || '').trim();
  const referenceLabel = reference?.trim() || '—';
  const groupedServicesForRender = useMemo(() => serviceGroups.filter((group) => group.items.length > 0), [serviceGroups]);
  const totalServicesCount = useMemo(
    () => serviceGroups.reduce((acc, group) => acc + group.items.length, 0),
    [serviceGroups]
  );
  const shouldShowFloatingEstimatedCosts =
    activeTab === 'samples' &&
    totalServicesCount >= 4 &&
    !isEstimatedCostsInView;
  const validDaysValue = form.watch('validDays');
  const createdAtValue = form.watch('createdAt');
  const validUntilLabel = (() => {
    if (!validDaysValue || validDaysValue <= 0) return '—';
    const baseDate = toDateOrNull(createdAtValue) || new Date();
    const validUntil = new Date(baseDate);
    validUntil.setDate(validUntil.getDate() + validDaysValue);
    return validUntil.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  })();
  const issuedAtLabel = (() => {
    const baseDate = toDateOrNull(createdAtValue) || new Date();
    return baseDate.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  })();

  const summarySubtotal = form.watch('pricing.subtotal') ?? 0;
  const summaryTaxPercent = form.watch('pricing.taxPercent') ?? 15;
  const summaryTaxAmount = (summarySubtotal * summaryTaxPercent) / 100;
  const summaryTotal =
    form.watch('pricing.total') ?? summarySubtotal + summaryTaxAmount;

  useEffect(() => {
    if (activeTab !== 'samples' || totalServicesCount < 4) {
      setIsEstimatedCostsInView(false);
      return;
    }

    let frameId: number | null = null;

    const updateVisibility = () => {
      if (frameId !== null) return;
      frameId = globalThis.requestAnimationFrame(() => {
        frameId = null;
        const target = estimatedCostsSectionRef.current;
        if (!target) {
          setIsEstimatedCostsInView(false);
          return;
        }

        const rect = target.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

        setIsEstimatedCostsInView(isVisible);
      });
    };

    updateVisibility();

    const handleWindowScroll = () => updateVisibility();
    const handleWindowResize = () => updateVisibility();
    const handleDocumentScroll = () => updateVisibility();

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('scroll', handleDocumentScroll, true);

    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('scroll', handleDocumentScroll, true);
      if (frameId !== null) {
        globalThis.cancelAnimationFrame(frameId);
      }
    };
  }, [activeTab, totalServicesCount]);

  const renderEstimatedCostsPanel = () => (
    <div className='space-y-2 rounded-md border p-4'>
      <h4 className='text-muted-foreground font-semibold'>Costos estimados</h4>
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
          <span>${summaryTotal.toFixed(2)} USD</span>
        </div>
      </div>
    </div>
  );

  const summaryServiceGroups = useMemo(() => {
    if (groupedServicesForRender.length > 0) {
      return groupedServicesForRender;
    }

    if (selectedServices.length === 0) return [];

    return [
      {
        id: 'fallback-services-group',
        name: 'Servicios',
        items: selectedServices
      }
    ];
  }, [groupedServicesForRender, selectedServices]);

  const buildProformaPreviewPayload = () => ({
    reference: referenceLabel,
    matrixLabels: [],
    validDays:
        typeof validDaysValue === 'number' && Number.isFinite(validDaysValue)
          ? validDaysValue
          : null,
    issuedAtLabel,
    validUntilLabel,
    client: {
      businessName: form.getValues('client.businessName') || '',
      taxId: form.getValues('client.taxId') || '',
      contactName: form.getValues('client.contactName') || '',
      address: form.getValues('client.address') || '',
      city: form.getValues('client.city') || '',
      email: form.getValues('client.email') || '',
      phone: form.getValues('client.phone') || '',
      mobile: ''
    },
    services: selectedServices.map((service) =>
      toProformaPreviewServiceLine({
        tableLabel: service.ID_TABLA_NORMA,
        label:
            service.ID_PARAMETRO || service.ID_CONFIG_PARAMETRO || service.id,
        parameterId: service.ID_CONFIG_PARAMETRO || service.id,
        unit: service.UNIDAD_NORMA || service.UNIDAD_INTERNO,
        method:
            service.ID_TECNICA ||
            service.ID_MET_REFERENCIA ||
            service.ID_MET_INTERNO,
        rangeMin: service.LIM_INF_INTERNO,
        rangeMax: service.LIM_SUP_INTERNO,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
        discountAmount: service.discountAmount
      })
    ),
    serviceGroups: summaryServiceGroups.map((group, groupIndex) => ({
      name: group.name || `Combo ${groupIndex + 1}`,
      items: group.items.map((service) =>
        toProformaPreviewServiceLine({
          tableLabel: service.ID_TABLA_NORMA,
          label:
              service.ID_PARAMETRO ||
              service.ID_CONFIG_PARAMETRO ||
              service.id,
          parameterId: service.ID_CONFIG_PARAMETRO || service.id,
          unit: service.UNIDAD_NORMA || service.UNIDAD_INTERNO,
          method:
              service.ID_TECNICA ||
              service.ID_MET_REFERENCIA ||
              service.ID_MET_INTERNO,
          rangeMin: service.LIM_INF_INTERNO,
          rangeMax: service.LIM_SUP_INTERNO,
          quantity: service.quantity,
          unitPrice: service.unitPrice,
          discountAmount: service.discountAmount
        })
      )
    })),
    pricing: {
      subtotal: summarySubtotal,
      taxPercent: summaryTaxPercent,
      total: summaryTotal
    }
  });

  const handleDownloadPreviewPdf = async () => {
    try {
      setIsGeneratingPreviewPdf(true);
      toast('Descargando PDF de proforma');
      const result = await generateProformaPreviewPdf(
        buildProformaPreviewPayload()
      );
      const link = document.createElement('a');
      link.href = result.downloadURL;
      link.download = result.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      toast.success('PDF de vista previa generado.');
    } catch (error) {
      console.error('Error generating preview PDF:', error);
      toast.error('Error al intentar descargar proforma.');
    } finally {
      setIsGeneratingPreviewPdf(false);
    }
  };

  const handleOpenSendEmailDialog = () => {
    setRecipientEmail((form.getValues('client.email') || '').trim());
    setIsSendEmailDialogOpen(true);
  };

  const handleSendPreviewEmail = async () => {
    const email = recipientEmail.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      toast.error('Ingresá un email válido.');
      return;
    }

    try {
      setIsSendingPreviewEmail(true);
      await sendProformaPreviewEmail({
        to: email,
        subject: `Proforma ${referenceLabel}`,
        payload: buildProformaPreviewPayload()
      });
      toast.success(`Proforma enviada a ${email}.`);
      setIsSendEmailDialogOpen(false);
    } catch (error) {
      console.error('Error sending preview email:', error);
      toast.error('No se pudo enviar la proforma por email.');
    } finally {
      setIsSendingPreviewEmail(false);
    }
  };

  const activeTabIndex = TAB_ORDER.indexOf(activeTab);
  const isFirstTab = activeTabIndex <= 0;
  const isLastTab = activeTabIndex === TAB_ORDER.length - 1;

  const goToPreviousTab = () => {
    if (isFirstTab) return;
    setActiveTab(TAB_ORDER[activeTabIndex - 1]);
  };

  const goToNextTab = () => {
    if (isLastTab) return;
    setActiveTab(TAB_ORDER[activeTabIndex + 1]);
  };

  const renderPrimarySubmitAction = () => {
    const executeButtonDisabled =
      isSubmitting || isLoadingRequest || !canSubmitFinal;

    const executeButton = (
      <Button
        type='button'
        className='border border-black bg-black text-white hover:bg-black/90 disabled:border-black disabled:bg-black disabled:text-white dark:border-white'
        disabled={executeButtonDisabled}
        onClick={handleExecuteClick}
      >
        Guardar Proforma
      </Button>
    );

    const executeButtonWithValidationTooltip =
      !canSubmitFinal && !isSubmitting && !isLoadingRequest ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className='inline-flex cursor-not-allowed'>
              {executeButton}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Faltan completar casilleros del configurador.
          </TooltipContent>
        </Tooltip>
      ) : (
        executeButton
      );

    if (isDraftEditMode) {
      return executeButtonWithValidationTooltip;
    }

    if (isEditMode) {
      return (
        <Button
          type='button'
          className='border-primary dark:border-primary border'
          disabled={isSubmitting || isLoadingRequest || !canSubmitFinal}
          onClick={async () => form.handleSubmit(async (data) => onUpdateRequest(data))()}
        >
          Actualizar solicitud
        </Button>
      );
    }

    return executeButtonWithValidationTooltip;
  };

  const renderTabActions = (withTopBorder = false) => (
    <div
      className={`mt-6 flex items-center justify-between ${withTopBorder ? 'border-t pt-4' : ''}`}
    >
      <div>
        {!isFirstTab ? (
          <Button type='button' variant='outline' onClick={goToPreviousTab}>
            Anterior
          </Button>
        ) : null}
      </div>
      <div className='flex items-center gap-2'>
        {showDraftActions ? clearCurrentDataButton : null}
        {showDraftActions ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='inline-flex'>
                <Button
                  type='button'
                  variant='secondary'
                  className='border-border dark:border-border border'
                  disabled={isDraftSaveDisabled}
                  onClick={async () => onSubmit(form.getValues(), 'draft')}
                >
                  Guardar como Borrador
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Guardar con datos faltantes para completar luego.
            </TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className='inline-flex'>
              <Button
                type='button'
                variant='outline'
                size='icon'
                disabled={
                  isGeneratingPreviewPdf || isLoadingRequest || !canSubmitFinal
                }
                aria-label='Descargar PDF'
                onClick={handleDownloadPreviewPdf}
              >
                <span className='relative inline-flex h-4 w-5 items-center justify-center'>
                  <ArrowDownToLine
                    className={`h-4 w-5 ${
                      isGeneratingPreviewPdf ? 'text-muted-foreground' : ''
                    }`}
                  />
                  {isGeneratingPreviewPdf ? (
                    <Loader2 className='text-primary absolute h-3.5 w-3.5 animate-spin' />
                  ) : null}
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Descargar PDF</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className='inline-flex'>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className={cn(
                  'border-border dark:border-border border',
                  isSendingPreviewEmail || isLoadingRequest || !canSubmitFinal
                    ? 'cursor-not-allowed'
                    : ''
                )}
                disabled={
                  isSendingPreviewEmail || isLoadingRequest || !canSubmitFinal
                }
                aria-label='Enviar proforma por email'
                onClick={handleOpenSendEmailDialog}
              >
                <span className='relative inline-flex h-4 w-5 items-center justify-center'>
                  <Mail
                    className={`h-4 w-5 ${
                      isSendingPreviewEmail ? 'text-muted-foreground' : ''
                    }`}
                  />
                  {isSendingPreviewEmail ? (
                    <Loader2 className='text-primary absolute h-3.5 w-3.5 animate-spin' />
                  ) : null}
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Enviar proforma por email</TooltipContent>
        </Tooltip>
        {renderPrimarySubmitAction()}
        {!isLastTab ? (
          <Button
            type='button'
            className='border border-emerald-600 dark:border-emerald-400'
            onClick={goToNextTab}
          >
            Siguiente
          </Button>
        ) : null}
      </div>
    </div>
  );

  const serviceUnderlineInputClass =
    'rounded-none border-0 border-b !border-b-[#969696] bg-white px-0 shadow-none dark:!border-b-[#666666] focus-visible:ring-0 focus-visible:border-b focus-visible:!border-b-[#5A5A5A] dark:focus-visible:!border-b-[#B0B0B0]';
  const comboEditServicesButtonClass =
    '!bg-[#f7f7f7] dark:!bg-[#303030] dark:hover:!bg-[#3A3A3A] !border-[#C8C8C8] dark:!border-[#4D4D4D]';

  return (
    <Form form={form} onSubmit={(e) => e.preventDefault()}>
      <div className='space-y-2'>
        <p className='text-base text-black'>
          <span className='font-medium'>Referencia:</span> {referenceLabel}
          {isEditMode && loadedRequestStatus === 'draft' ? (
            <span className='text-muted-foreground'> (borrador)</span>
          ) : isEditMode && loadedRequestStatus === 'paused' ? (
            <span className='text-muted-foreground'> (pausada)</span>
          ) : null}
        </p>

        <Tabs
          value={activeTab}
          className='w-full'
          onValueChange={(value) => setActiveTab(value as ConfiguratorTab)}
        >
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger
              value='client'
              className='flex cursor-pointer items-center justify-center gap-2'
            >
              <span>1. Cliente</span>
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
              <span>2. Servicios</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tabStatus.samples === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </TabsTrigger>
            <TabsTrigger
              value='type'
              className='flex cursor-pointer items-center justify-center gap-2'
            >
              <span>3. Datos</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tabStatus.type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </TabsTrigger>
            <TabsTrigger value='summary' className='cursor-pointer'>
              4. Resumen
            </TabsTrigger>
          </TabsList>

          {/* PASO A: DATOS Y METADATOS */}
          <ConfiguratorTypeTab
            form={form}
            renderTabActions={() => renderTabActions()}
          />

          {/* PASO B: CLIENTE */}
          <ConfiguratorClientTab
            form={form}
            renderTabActions={() => renderTabActions()}
          />

          {/* PASO C: SERVICIOS */}
          <ConfiguratorServicesTab
            groupedServicesForRender={groupedServicesForRender}
            isLoadingAvailableServices={isLoadingAvailableServices}
            handleOpenMatrixSelectorDialog={handleOpenMatrixSelectorDialog}
            comboEditServicesButtonClass={comboEditServicesButtonClass}
            getMatrizLabel={getMatrizLabel}
            handleEditGroupServices={handleEditGroupServices}
            handleUpdateGroupName={handleUpdateGroupName}
            handleOpenRemoveGroupDialog={handleOpenRemoveGroupDialog}
            serviceUnderlineInputClass={serviceUnderlineInputClass}
            handleUpdateServiceField={handleUpdateServiceField}
            handleOpenRemoveService={handleOpenRemoveService}
            estimatedCostsSectionRef={estimatedCostsSectionRef}
            renderEstimatedCostsPanel={renderEstimatedCostsPanel}
            renderTabActions={() => renderTabActions()}
            shouldShowFloatingEstimatedCosts={shouldShowFloatingEstimatedCosts}
          />

          {/* PASO E: RESUMEN */}
          <ConfiguratorSummaryTab
            form={form}
            validDaysValue={validDaysValue}
            validUntilLabel={validUntilLabel}
            summaryServiceGroups={summaryServiceGroups}
            summarySubtotal={summarySubtotal}
            summaryTaxPercent={summaryTaxPercent}
            summaryTotal={summaryTotal}
            summaryNotes={summaryNotes}
            renderTabActions={() => renderTabActions(true)}
          />
        </Tabs>
      </div>

      <ConfiguratorCommonDialogs
        isMatrixSelectorDialogOpen={isMatrixSelectorDialogOpen}
        setIsMatrixSelectorDialogOpen={setIsMatrixSelectorDialogOpen}
        matrixOptionsForCombo={matrixOptionsForCombo}
        activeComboMatrix={activeComboMatrix}
        handleSelectComboMatrix={handleSelectComboMatrix}
        isLoadingAvailableServices={isLoadingAvailableServices}
        groupToDelete={groupToDelete}
        setGroupToDelete={setGroupToDelete}
        handleConfirmRemoveGroup={handleConfirmRemoveGroup}
        serviceToDelete={serviceToDelete}
        setServiceToDelete={setServiceToDelete}
        handleConfirmRemoveService={handleConfirmRemoveService}
        isSendEmailDialogOpen={isSendEmailDialogOpen}
        setIsSendEmailDialogOpen={setIsSendEmailDialogOpen}
        recipientEmail={recipientEmail}
        setRecipientEmail={setRecipientEmail}
        referenceLabel={referenceLabel}
        clientBusinessName={form.getValues('client.businessName') || ''}
        summaryTotal={summaryTotal}
        isSendingPreviewEmail={isSendingPreviewEmail}
        handleSendPreviewEmail={handleSendPreviewEmail}
        isClearDialogOpen={isClearDialogOpen}
        setIsClearDialogOpen={setIsClearDialogOpen}
        handleConfirmClearCurrentData={handleConfirmClearCurrentData}
      />

      <ConfiguratorServicesDialog
        open={isServicesDialogOpen}
        activeComboMatrix={activeComboMatrix}
        dialogSelectedServiceIds={dialogSelectedServiceIds}
        selectedDialogServiceLabels={selectedDialogServiceLabels}
        dialogComboTitle={dialogComboTitle}
        isAddFilterDropdownOpen={isAddFilterDropdownOpen}
        setIsAddFilterDropdownOpen={setIsAddFilterDropdownOpen}
        dialogFilterOptionsByKey={dialogFilterOptionsByKey}
        dialogFilters={dialogFilters}
        handleToggleDialogFilterValue={handleToggleDialogFilterValue}
        activeDialogFiltersCount={activeDialogFiltersCount}
        dialogSearchTerm={dialogSearchTerm}
        setDialogSearchTerm={setDialogSearchTerm}
        handleClearDialogFilters={handleClearDialogFilters}
        isAppliedFiltersExpanded={isAppliedFiltersExpanded}
        setIsAppliedFiltersExpanded={setIsAppliedFiltersExpanded}
        handleRemoveDialogFilterValue={handleRemoveDialogFilterValue}
        filteredAvailableServices={filteredAvailableServices}
        areAllVisibleSelected={areAllVisibleSelected}
        visibleServiceIds={visibleServiceIds}
        handleSelectAllVisibleToggle={handleSelectAllVisibleToggle}
        isLoadingAvailableServices={isLoadingAvailableServices}
        availableServices={availableServices}
        getMatEnsayoLabel={getMatEnsayoLabel}
        dialogLockedServiceIds={dialogLockedServiceIds}
        handleToggleServiceSelection={handleToggleServiceSelection}
        lockedServiceCursorHint={lockedServiceCursorHint}
        setLockedServiceCursorHint={setLockedServiceCursorHint}
        handleAddServicesToForm={handleAddServicesToForm}
        onOpenChange={handleServicesDialogOpenChange}
      />

    </Form>
  );
}
