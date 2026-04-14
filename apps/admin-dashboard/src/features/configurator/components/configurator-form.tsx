'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownToLine,
  ChevronDown,
  Check,
  Loader2,
  Mail,
  FilterX,
  Filter,
  FilterIcon,
  LucideFilter,
  ListFilterPlus,
  ListPlus,
  Plus,
  Search,
  Send,
  Trash2,
  X
} from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import {
  createConfiguration,
  generateProformaPreviewPdf,
  getConfigurationById,
  sendProformaPreviewEmail,
  updateConfiguration,
  ConfigurationDocument,
  ConfigurationServiceItem,
  ImportedServiceDocument,
  listImportedServices
} from '../services/configurations';
import { ProformaSummaryPanel } from '@/features/proformas/components/proforma-summary-panel';
import { IconFilterPlus } from '@tabler/icons-react';

const formSchema = z.object({
  type: z.literal('proforma'),
  matrix: z
    .array(z.enum(['water', 'soil', 'noise', 'gases']))
    .min(1, 'Debe seleccionar al menos una matriz'),
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

type FormValues = z.infer<typeof formSchema>;
type MatrixOption = FormValues['matrix'][number];
type ConfiguratorTab = 'client' | 'samples' | 'type' | 'summary';
type DialogFilterKey = 'matEnsayo' | 'norma' | 'tabla' | 'tecnica';
type DialogFilters = Record<DialogFilterKey, string[]>;
type ServiceFilterOption = { value: string; count: number };

const DIALOG_FILTER_LABELS: Record<DialogFilterKey, string> = {
  matEnsayo: 'Material de ensayo',
  norma: 'Norma',
  tabla: 'Tabla',
  tecnica: 'Técnica'
};

const MATRIX_LABEL_MAP: Record<MatrixOption, string> = {
  water: 'Agua',
  soil: 'Suelo',
  noise: 'Ruido',
  gases: 'Gases'
};

const TAB_ORDER: ConfiguratorTab[] = ['client', 'samples', 'type', 'summary'];

type SelectedService = ImportedServiceDocument & {
  quantity: number;
  rangeMin: string;
  rangeMax: string;
  unitPrice: number | null;
  discountAmount: number | null;
};

type SelectedServiceGroup = {
  id: string;
  name: string;
  items: SelectedService[];
};

const createDefaultFormValues = (): FormValues => ({
  type: 'proforma',
  matrix: ['water'],
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
  const [isMatrixSelectorDialogOpen, setIsMatrixSelectorDialogOpen] =
    useState(false);
  const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
  const [activeComboMatrix, setActiveComboMatrix] = useState<string | null>(
    null
  );
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [availableServices, setAvailableServices] = useState<
    ImportedServiceDocument[]
  >([]);
  const [isLoadingAvailableServices, setIsLoadingAvailableServices] =
    useState(false);
  const [dialogFilters, setDialogFilters] = useState<DialogFilters>({
    matEnsayo: [],
    norma: [],
    tabla: [],
    tecnica: []
  });
  const [dialogSearchTerm, setDialogSearchTerm] = useState('');
  const [dialogSelectedServiceIds, setDialogSelectedServiceIds] = useState<
    string[]
  >([]);
  const [dialogLockedServiceIds, setDialogLockedServiceIds] = useState<
    string[]
  >([]);
  const [lockedServiceCursorHint, setLockedServiceCursorHint] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  const [isAddFilterDropdownOpen, setIsAddFilterDropdownOpen] = useState(false);
  const [isAppliedFiltersExpanded, setIsAppliedFiltersExpanded] =
    useState(true);
  const [groupToDelete, setGroupToDelete] =
    useState<SelectedServiceGroup | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<{
    groupId: string;
    serviceId: string;
  } | null>(null);
  const [serviceGroups, setServiceGroups] = useState<SelectedServiceGroup[]>(
    []
  );
  const selectedServices = useMemo(
    () => serviceGroups.flatMap((group) => group.items),
    [serviceGroups]
  );
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

  const matrix = form.watch('matrix');
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
      const matrixValue = Array.isArray(matrix) ? matrix : [];
      if (!matrixValue.length) return 'error';
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

  const getMatEnsayoLabel = (service: ImportedServiceDocument) => {
    const value = service.ID_MAT_ENSAYO?.trim();
    return value && value.length > 0 ? value : 'Sin material de ensayo';
  };

  const getMatrizLabel = (service: ImportedServiceDocument) => {
    const value = service.ID_MATRIZ?.trim();
    return value && value.length > 0 ? value : 'Sin matriz';
  };

  const getNormaLabel = (service: ImportedServiceDocument) => {
    const value = service.ID_NORMA?.trim();
    return value && value.length > 0 ? value : 'Sin norma';
  };

  const getTablaLabel = (service: ImportedServiceDocument) => {
    const value = service.ID_TABLA_NORMA?.trim();
    return value && value.length > 0 ? value : 'Sin tabla';
  };

  const getTecnicaLabel = (service: ImportedServiceDocument) => {
    const value = service.ID_TECNICA?.trim();
    return value && value.length > 0 ? value : 'Sin técnica';
  };

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

  const matrixScopedAvailableServices = useMemo(() => {
    if (!activeComboMatrix) return availableServices;
    return availableServices.filter(
      (service) => getMatrizLabel(service) === activeComboMatrix
    );
  }, [availableServices, activeComboMatrix]);

  const serviceMatchesDialogFilters = (
    service: ImportedServiceDocument,
    excludeKey?: DialogFilterKey
  ) => {
    const matEnsayoLabel = getMatEnsayoLabel(service);
    const normaLabel = getNormaLabel(service);
    const tablaLabel = getTablaLabel(service);
    const tecnicaLabel = getTecnicaLabel(service);

    if (
      excludeKey !== 'matEnsayo' &&
      dialogFilters.matEnsayo.length > 0 &&
      !dialogFilters.matEnsayo.includes(matEnsayoLabel)
    ) {
      return false;
    }

    if (
      excludeKey !== 'norma' &&
      dialogFilters.norma.length > 0 &&
      !dialogFilters.norma.includes(normaLabel)
    ) {
      return false;
    }

    if (
      excludeKey !== 'tabla' &&
      dialogFilters.tabla.length > 0 &&
      !dialogFilters.tabla.includes(tablaLabel)
    ) {
      return false;
    }

    if (
      excludeKey !== 'tecnica' &&
      dialogFilters.tecnica.length > 0 &&
      !dialogFilters.tecnica.includes(tecnicaLabel)
    ) {
      return false;
    }

    return true;
  };

  const filteredAvailableServices = useMemo(() => {
    const normalizedSearch = dialogSearchTerm.trim().toLowerCase();

    const filtered = matrixScopedAvailableServices.filter((service) => {
      const matEnsayoLabel = getMatEnsayoLabel(service);
      const normaLabel = getNormaLabel(service);
      const tablaLabel = getTablaLabel(service);
      const tecnicaLabel = getTecnicaLabel(service);

      if (
        dialogFilters.matEnsayo.length > 0 &&
        !dialogFilters.matEnsayo.includes(matEnsayoLabel)
      ) {
        return false;
      }

      if (
        dialogFilters.norma.length > 0 &&
        !dialogFilters.norma.includes(normaLabel)
      ) {
        return false;
      }

      if (
        dialogFilters.tabla.length > 0 &&
        !dialogFilters.tabla.includes(tablaLabel)
      ) {
        return false;
      }

      if (
        dialogFilters.tecnica.length > 0 &&
        !dialogFilters.tecnica.includes(tecnicaLabel)
      ) {
        return false;
      }

      if (!normalizedSearch) return true;

      const searchHaystack = [
        service.ID_PARAMETRO,
        service.ID_MATRIZ,
        service.ID_MAT_ENSAYO,
        service.ID_NORMA,
        service.ID_TABLA_NORMA,
        service.UNIDAD_NORMA,
        service.UNIDAD_INTERNO,
        service.ID_TECNICA,
        service.ID_MET_REFERENCIA,
        service.ID_MET_INTERNO,
        service.ID_CONFIG_PARAMETRO
      ]
        .filter((value): value is string => typeof value === 'string')
        .join(' ')
        .toLowerCase();

      return searchHaystack.includes(normalizedSearch);
    });

    return filtered.sort((a, b) => {
      const aLabel = (
        a.ID_PARAMETRO ||
        a.ID_CONFIG_PARAMETRO ||
        a.id ||
        ''
      ).trim();
      const bLabel = (
        b.ID_PARAMETRO ||
        b.ID_CONFIG_PARAMETRO ||
        b.id ||
        ''
      ).trim();
      const primary = aLabel.localeCompare(bLabel, 'es', {
        sensitivity: 'base',
        numeric: true
      });
      if (primary !== 0) return primary;
      const aId = (a.ID_CONFIG_PARAMETRO || a.id || '').trim();
      const bId = (b.ID_CONFIG_PARAMETRO || b.id || '').trim();
      return aId.localeCompare(bId, 'es', {
        sensitivity: 'base',
        numeric: true
      });
    });
  }, [matrixScopedAvailableServices, dialogFilters, dialogSearchTerm]);

  const matrixOptionsForCombo = useMemo(() => {
    const counts = new Map<string, number>();
    availableServices.forEach((service) => {
      const label = getMatrizLabel(service);
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, 'es'));
  }, [availableServices]);

  const activeDialogFiltersCount =
    dialogFilters.matEnsayo.length +
    dialogFilters.norma.length +
    dialogFilters.tabla.length +
    dialogFilters.tecnica.length;

  const dialogFilterOptionsByKey: Record<
    DialogFilterKey,
    ServiceFilterOption[]
  > = useMemo(() => {
    const readLabelByKey: Record<
      DialogFilterKey,
      (service: ImportedServiceDocument) => string
    > = {
      matEnsayo: getMatEnsayoLabel,
      norma: getNormaLabel,
      tabla: getTablaLabel,
      tecnica: getTecnicaLabel
    };

    const next = {} as Record<DialogFilterKey, ServiceFilterOption[]>;

    (Object.keys(DIALOG_FILTER_LABELS) as DialogFilterKey[]).forEach((key) => {
      const labelReader = readLabelByKey[key];
      const counts = new Map<string, number>();

      // Keep all options visible for this matrix scope, even if current count is 0.
      matrixScopedAvailableServices.forEach((service) => {
        const label = labelReader(service);
        if (!counts.has(label)) counts.set(label, 0);
      });

      // Count only options available with the currently applied filters (excluding this key).
      matrixScopedAvailableServices.forEach((service) => {
        if (!serviceMatchesDialogFilters(service, key)) return;
        const label = labelReader(service);
        counts.set(label, (counts.get(label) || 0) + 1);
      });

      next[key] = Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value, 'es'));
    });

    return next;
  }, [matrixScopedAvailableServices, dialogFilters]);

  const visibleServiceIds = useMemo(
    () => filteredAvailableServices.map((service) => getServiceId(service)),
    [filteredAvailableServices]
  );

  const selectedDialogServiceLabels = useMemo(() => {
    const catalogById = new Map(
      availableServices.map((service) => [
        getServiceId(service),
        `${service.ID_PARAMETRO || getServiceId(service)} (${getMatEnsayoLabel(service)})`
      ])
    );

    return dialogSelectedServiceIds.map(
      (serviceId) => catalogById.get(serviceId) || serviceId
    );
  }, [availableServices, dialogSelectedServiceIds]);

  const areAllVisibleSelected =
    visibleServiceIds.length > 0 &&
    visibleServiceIds.every((serviceId) =>
      dialogSelectedServiceIds.includes(serviceId)
    );

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

  const mapServiceGroupsToDocument = (groups: SelectedServiceGroup[]) => {
    return groups
      .map((group) => {
        return {
          name: group.name,
          items: mapSelectedServicesToDocument(group.items)
        };
      })
      .filter((group) => group.items.length > 0);
  };

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

  const mapStoredServiceGroups = (
    grouped:
      | {
          name?: string;
          items?: ConfigurationServiceItem[];
        }[]
      | undefined
  ): SelectedServiceGroup[] => {
    if (!Array.isArray(grouped)) return [];

    return grouped
      .map((group, index) => {
        const items = Array.isArray(group.items)
          ? mapStoredServicesToSelected(group.items)
          : [];

        return {
          id: `group-${Date.now()}-${index}`,
          name:
            typeof group.name === 'string' && group.name.trim().length > 0
              ? group.name.trim()
              : `Combo ${index + 1}`,
          items
        };
      })
      .filter((group) => group.items.length > 0);
  };

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
    setServiceGroups([]);
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
    if (!availableServices.length || !serviceGroups.length) return;

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
    if (typeof window === 'undefined' || editRequestId) return;

    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (!cached) return;

      const parsed = JSON.parse(cached) as unknown;
      const merged = mergeWithCachedValues(createDefaultFormValues(), parsed);
      form.reset(merged);
      const restoredServices = merged.services?.items?.length
        ? mapStoredServicesToSelected(merged.services.items)
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
        merged.services.grouped.length
      ) {
        setServiceGroups(mapStoredServiceGroups(merged.services.grouped));
      } else if (restoredServices.length) {
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
              const restoredServices = merged.services?.items?.length
                ? mapStoredServicesToSelected(merged.services.items)
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
                merged.services.grouped.length
              ) {
                setServiceGroups(
                  mapStoredServiceGroups(merged.services.grouped)
                );
              } else if (restoredServices.length) {
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
          ? mapStoredServicesToSelected(loadedValues.services.items)
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
          loadedValues.services.grouped.length
        ) {
          setServiceGroups(
            mapStoredServiceGroups(loadedValues.services.grouped)
          );
        } else if (restoredServices.length) {
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
    if (typeof window === 'undefined' || isLoadingRequest) return;

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
            items: mapSelectedServicesToDocument(selectedServices),
            grouped: mapServiceGroupsToDocument(serviceGroups)
          }
        };
        window.localStorage.setItem(cacheKey, JSON.stringify(nextCachedValues));
      } catch (error) {
        console.error(
          'Error persisting configurator cache from service groups:',
          error
        );
      }
    }, 250);
  }, [cacheKey, form, isLoadingRequest, selectedServices, serviceGroups]);

  useEffect(() => {
    const mappedAnalyses = mapServicesToAnalyses(selectedServices);
    const mappedServiceItems = mapSelectedServicesToDocument(selectedServices);
    form.setValue('services', {
      items: mappedServiceItems,
      grouped: mapServiceGroupsToDocument(serviceGroups)
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
        services: {
          items: mapSelectedServicesToDocument(selectedServices),
          grouped: mapServiceGroupsToDocument(serviceGroups)
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
        services: {
          items: mapSelectedServicesToDocument(selectedServices),
          grouped: mapServiceGroupsToDocument(serviceGroups)
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
    form.handleSubmit((data) => onSubmit(data, 'final'))();
  };

  const handleOpenMatrixSelectorDialog = () => {
    setIsMatrixSelectorDialogOpen(true);
  };

  const handleSelectComboMatrix = (matrixLabel: string) => {
    setEditingGroupId(null);
    setActiveComboMatrix(matrixLabel);
    setDialogSelectedServiceIds([]);
    setDialogLockedServiceIds([]);
    setDialogFilters({
      matEnsayo: [],
      norma: [],
      tabla: [],
      tecnica: []
    });
    setDialogSearchTerm('');
    setIsMatrixSelectorDialogOpen(false);
    setIsServicesDialogOpen(true);
  };

  const handleEditGroupServices = (
    group: SelectedServiceGroup,
    matrixLabel: string | null
  ) => {
    const currentServiceIds = group.items.map((service) =>
      getServiceId(service)
    );
    setEditingGroupId(group.id);
    setActiveComboMatrix(matrixLabel);
    setDialogSelectedServiceIds(currentServiceIds);
    setDialogLockedServiceIds(currentServiceIds);
    setDialogFilters({
      matEnsayo: [],
      norma: [],
      tabla: [],
      tecnica: []
    });
    setDialogSearchTerm('');
    setIsServicesDialogOpen(true);
  };

  const handleToggleDialogFilterValue = (
    key: DialogFilterKey,
    value: string
  ) => {
    setDialogFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? [] : [value]
    }));
    setIsAddFilterDropdownOpen(false);
    setIsAppliedFiltersExpanded(false);
  };

  const handleSelectAllVisibleToggle = (checked: boolean) => {
    if (visibleServiceIds.length === 0) return;
    const lockedSet = new Set(dialogLockedServiceIds);

    if (checked) {
      setDialogSelectedServiceIds((prev) =>
        Array.from(new Set([...prev, ...visibleServiceIds]))
      );
      return;
    }

    const visibleSet = new Set(visibleServiceIds);
    setDialogSelectedServiceIds((prev) =>
      prev.filter(
        (serviceId) => !visibleSet.has(serviceId) || lockedSet.has(serviceId)
      )
    );
  };

  const handleClearDialogFilters = () => {
    setDialogFilters({
      matEnsayo: [],
      norma: [],
      tabla: [],
      tecnica: []
    });
    setDialogSearchTerm('');
  };

  const handleRemoveDialogFilterValue = (
    key: DialogFilterKey,
    value: string
  ) => {
    setDialogFilters((prev) => ({
      ...prev,
      [key]: prev[key].filter((entry) => entry !== value)
    }));
  };

  const handleToggleServiceSelection = (serviceId: string) => {
    if (dialogLockedServiceIds.includes(serviceId)) return;
    setDialogSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleAddServicesToForm = () => {
    if (dialogSelectedServiceIds.length === 0) return;

    const selectedSet = new Set(dialogSelectedServiceIds);
    const nextGroupServicesFromCatalog = availableServices
      .filter((service) => selectedSet.has(getServiceId(service)))
      .map((service) => toSelectedService(service));

    if (nextGroupServicesFromCatalog.length === 0) {
      setIsServicesDialogOpen(false);
      return;
    }

    if (editingGroupId) {
      setServiceGroups((prev) =>
        prev.map((group) => {
          if (group.id !== editingGroupId) return group;

          const currentById = new Map(
            group.items.map((service) => [getServiceId(service), service])
          );
          const nextItems = nextGroupServicesFromCatalog.map((service) => {
            const serviceId = getServiceId(service);
            const currentItem = currentById.get(serviceId);
            return currentItem ? { ...currentItem } : service;
          });

          return { ...group, items: nextItems };
        })
      );
      setEditingGroupId(null);
      setDialogLockedServiceIds([]);
    } else {
      const newGroupId = `combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      setServiceGroups((prev) => [
        ...prev,
        {
          id: newGroupId,
          name:
            typeof activeComboMatrix === 'string' && activeComboMatrix.trim()
              ? activeComboMatrix
              : `Combo ${prev.length + 1}`,
          items: nextGroupServicesFromCatalog
        }
      ]);
    }
    setActiveComboMatrix(null);
    setIsServicesDialogOpen(false);
  };

  const handleUpdateGroupName = (groupId: string, value: string) => {
    setServiceGroups((prev) =>
      prev.map((group) =>
        group.id === groupId ? { ...group, name: value } : group
      )
    );
  };

  const handleOpenRemoveGroupDialog = (group: SelectedServiceGroup) => {
    setGroupToDelete(group);
  };

  const handleConfirmRemoveGroup = () => {
    if (!groupToDelete) return;
    setServiceGroups((prev) =>
      prev.filter((group) => group.id !== groupToDelete.id)
    );
    setGroupToDelete(null);
  };

  const handleRemoveService = (groupId: string, serviceId: string) => {
    setServiceGroups((prev) =>
      prev
        .map((group) => {
          if (group.id !== groupId) return group;
          return {
            ...group,
            items: group.items.filter(
              (service) => getServiceId(service) !== serviceId
            )
          };
        })
        .filter((group) => group.items.length > 0)
    );
  };

  const handleOpenRemoveService = (
    groupId: string,
    service: SelectedService
  ) => {
    const rangeMin = (service.rangeMin ?? '').trim();
    const rangeMax = (service.rangeMax ?? '').trim();
    const discountIsFilled =
      typeof service.discountAmount === 'number' &&
      Number.isFinite(service.discountAmount);

    if (!rangeMin && !rangeMax && !discountIsFilled) {
      handleRemoveService(groupId, getServiceId(service));
      return;
    }

    setServiceToDelete({
      groupId,
      serviceId: getServiceId(service)
    });
  };

  const handleConfirmRemoveService = () => {
    if (!serviceToDelete) return;
    handleRemoveService(serviceToDelete.groupId, serviceToDelete.serviceId);
    setServiceToDelete(null);
  };

  const handleUpdateServiceField = (
    groupId: string,
    serviceId: string,
    field:
      | 'quantity'
      | 'rangeMin'
      | 'rangeMax'
      | 'unitPrice'
      | 'discountAmount',
    value: string
  ) => {
    setServiceGroups((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;

        const updatedItems = group.items.map((service) => {
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
        });

        return { ...group, items: updatedItems };
      })
    );
  };

  const summaryNotes = (form.getValues('notes') || '').trim();
  const referenceLabel = reference?.trim() || '—';
  const groupedServicesForRender = useMemo(() => {
    return serviceGroups.filter((group) => group.items.length > 0);
  }, [serviceGroups]);
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
    if (activeTab !== 'samples') {
      setIsEstimatedCostsInView(false);
      return;
    }

    let frameId: number | null = null;
    let scrollContainer: Element | Window = window;

    const resolveScrollContainer = (start: HTMLElement): Element | Window => {
      let node: HTMLElement | null = start.parentElement;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        const isScrollableY =
          (overflowY === 'auto' || overflowY === 'scroll') &&
          node.scrollHeight > node.clientHeight;
        if (isScrollableY) return node;
        node = node.parentElement;
      }
      return window;
    };

    const updateVisibility = (reason: string) => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const target = estimatedCostsSectionRef.current;
        if (!target) {
          setIsEstimatedCostsInView(false);
          return;
        }
        const targetTop = target.getBoundingClientRect().top + 130;
        const viewportBottom =
          scrollContainer === window
            ? window.innerHeight
            : (scrollContainer as Element).getBoundingClientRect().bottom;
        const nextIsInView = targetTop <= viewportBottom;
        setIsEstimatedCostsInView(nextIsInView);
      });
    };

    const updateVisibilityImmediate = () => {
      const target = estimatedCostsSectionRef.current;
      if (!target) {
        setIsEstimatedCostsInView(false);
        return;
      }
      scrollContainer = resolveScrollContainer(target);
      const targetTop = target.getBoundingClientRect().top;
      const viewportBottom =
        scrollContainer === window
          ? window.innerHeight
          : (scrollContainer as Element).getBoundingClientRect().bottom;
      const nextIsInView = targetTop <= viewportBottom;
      setIsEstimatedCostsInView(nextIsInView);
    };

    updateVisibilityImmediate();
    const handleWindowScroll = () => updateVisibility('window-scroll');
    const handleWindowResize = () => updateVisibility('window-resize');
    const handleContainerScroll = () => updateVisibility('container-scroll');
    const handleDocumentScroll = () =>
      updateVisibility('document-capture-scroll');

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('scroll', handleDocumentScroll, true);
    if (scrollContainer !== window) {
      scrollContainer.addEventListener('scroll', handleContainerScroll);
    }
    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('scroll', handleDocumentScroll, true);
      if (scrollContainer !== window) {
        scrollContainer.removeEventListener('scroll', handleContainerScroll);
      }
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [activeTab, groupedServicesForRender.length]);

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

  const buildProformaPreviewPayload = () => {
    return {
      reference: referenceLabel,
      matrixLabels:
        Array.isArray(matrix) && matrix.length
          ? matrix.map((entry) => MATRIX_LABEL_MAP[entry] ?? entry)
          : [],
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
      services: selectedServices.map((service) => {
        const quantity = service.quantity ?? 0;
        const unitPrice = service.unitPrice ?? null;
        const discountAmount = service.discountAmount ?? null;
        const lineSubtotal =
          typeof unitPrice === 'number'
            ? Math.max(0, quantity * unitPrice - (discountAmount ?? 0))
            : null;
        return {
          table: service.ID_TABLA_NORMA || 'Sin tabla',
          label:
            service.ID_PARAMETRO ||
            service.ID_CONFIG_PARAMETRO ||
            service.id ||
            'Servicio',
          unit: service.UNIDAD_NORMA || service.UNIDAD_INTERNO || 'Sin unidad',
          method:
            service.ID_TECNICA ||
            service.ID_MET_REFERENCIA ||
            service.ID_MET_INTERNO ||
            'Sin método',
          rangeOffered: `${service.LIM_INF_INTERNO || '—'} a ${
            service.LIM_SUP_INTERNO || '—'
          }`,
          quantity,
          unitPrice,
          discountAmount,
          subtotal: lineSubtotal
        };
      }),
      serviceGroups: summaryServiceGroups.map((group, groupIndex) => ({
        name: group.name || `Combo ${groupIndex + 1}`,
        items: group.items.map((service) => {
          const quantity = service.quantity ?? 0;
          const unitPrice = service.unitPrice ?? null;
          const discountAmount = service.discountAmount ?? null;
          const lineSubtotal =
            unitPrice !== null
              ? Math.max(0, quantity * unitPrice - (discountAmount ?? 0))
              : null;

          return {
            table: service.ID_TABLA_NORMA || 'Sin tabla',
            label:
              service.ID_PARAMETRO ||
              service.ID_CONFIG_PARAMETRO ||
              service.id ||
              'Servicio',
            unit:
              service.UNIDAD_NORMA || service.UNIDAD_INTERNO || 'Sin unidad',
            method:
              service.ID_TECNICA ||
              service.ID_MET_REFERENCIA ||
              service.ID_MET_INTERNO ||
              'Sin método',
            rangeOffered: `${service.LIM_INF_INTERNO || '—'} a ${
              service.LIM_SUP_INTERNO || '—'
            }`,
            quantity,
            unitPrice,
            discountAmount,
            subtotal: lineSubtotal
          };
        })
      })),
      pricing: {
        subtotal: summarySubtotal,
        taxPercent: summaryTaxPercent,
        total: summaryTotal
      }
    };
  };

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
      document.body.appendChild(link);
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
        Ejecutar Proforma
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
          onClick={() => form.handleSubmit((data) => onUpdateRequest(data))()}
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
          <Button
            type='button'
            variant='secondary'
            className='border-border dark:border-border border'
            disabled={isDraftSaveDisabled}
            onClick={() => onSubmit(form.getValues(), 'draft')}
          >
            Guardar como Borrador
          </Button>
        ) : null}
        <Button
          type='button'
          variant='outline'
          size='icon'
          disabled={isGeneratingPreviewPdf || isLoadingRequest}
          onClick={handleDownloadPreviewPdf}
          aria-label='Descargar PDF'
          title='Descargar PDF'
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
        <Button
          type='button'
          variant='outline'
          size='icon'
          disabled={isSendingPreviewEmail || isLoadingRequest}
          onClick={handleOpenSendEmailDialog}
          aria-label='Enviar proforma por email'
          title='Enviar proforma por email'
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
    'rounded-none border-0 border-b !border-b-[#969696]  px-0 shadow-none dark:!border-b-[#666666] focus-visible:ring-0 focus-visible:border-b focus-visible:!border-b-[#5A5A5A] dark:focus-visible:!border-b-[#B0B0B0]';
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
          onValueChange={(value) => setActiveTab(value as ConfiguratorTab)}
          className='w-full'
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
          <TabsContent value='type' className='mt-4 space-y-4'>
            <Card className='border-0 shadow-none'>
              <CardHeader>
                <CardTitle>Datos de la proforma</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
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
                          onValueChange={(val) => field.onChange(parseInt(val))}
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

                {renderTabActions()}
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
                {renderTabActions()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PASO C: SERVICIOS */}
          <TabsContent value='samples' className='mt-4 space-y-4'>
            <Card className='border-0 shadow-none'>
              <CardHeader>
                <CardTitle>Servicios</CardTitle>
              </CardHeader>
              <CardContent className='relative space-y-4 overflow-visible'>
                <div>
                  <div className='space-y-4'>
                    <div className='space-y-3 rounded-md border p-4'>
                      <div className='border-border flex items-center justify-between gap-2 border-b pb-4'>
                        <div>
                          <h4 className='text-sm font-semibold'>
                            Combos de servicios
                          </h4>
                          <p className='text-muted-foreground text-xs'>
                            Agregá uno o varios combos de servicios.
                          </p>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          className='cursor-pointer'
                          onClick={handleOpenMatrixSelectorDialog}
                          disabled={isLoadingAvailableServices}
                        >
                          <Plus className='h-4 w-4' />
                          Agregar combo
                        </Button>
                      </div>

                      {groupedServicesForRender.length === 0 ? (
                        <p className='text-muted-foreground text-sm'>
                          No hay combos de servicios agregados.
                        </p>
                      ) : (
                        <div className='space-y-4'>
                          {groupedServicesForRender.map((group) => {
                            return (
                              <div
                                key={group.id}
                                className='bg-primary/15 border-primary/30 relative space-y-3 overflow-hidden rounded-xl border p-3'
                              >
                                <span
                                  aria-hidden='true'
                                  className='text-primary/35 absolute top-0 left-0 h-4 w-4 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:3px_3px] [clip-path:polygon(0_0,100%_0,0_100%)]'
                                />
                                <div className='flex items-center justify-between gap-3'>
                                  <div className='flex w-full items-center justify-between gap-1'>
                                    <div className='relative pt-2'>
                                      <span className='text-foreground/90 pointer-events-none absolute -top-0.5 left-2 z-10 rounded-sm bg-transparent px-1.5 text-[10px] leading-none font-semibold'>
                                        Título del combo
                                      </span>
                                      <Input
                                        value={group.name}
                                        onChange={(event) =>
                                          handleUpdateGroupName(
                                            group.id,
                                            event.target.value
                                          )
                                        }
                                        className='bg-background w-[25rem] max-w-[85vw]'
                                        placeholder='Nombre del combo'
                                      />
                                    </div>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type='button'
                                          variant='outline'
                                          size='sm'
                                          className={`mt-2 ml-1 h-8 cursor-pointer border ${comboEditServicesButtonClass}`}
                                          onClick={() =>
                                            handleEditGroupServices(
                                              group,
                                              group.items[0]
                                                ? getMatrizLabel(group.items[0])
                                                : null
                                            )
                                          }
                                          aria-label='Editar combo de servicios'
                                        >
                                          <Plus className='h-4 w-4' />
                                          Agregar Servicios
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Editar combo de servicios
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <div className='mx-1 mt-2 flex items-center gap-1'>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type='button'
                                          variant='ghost'
                                          size='icon'
                                          className='text-destructive hover:text-destructive h-7 w-7 cursor-pointer'
                                          onClick={() =>
                                            handleOpenRemoveGroupDialog(group)
                                          }
                                          aria-label='Eliminar combo'
                                        >
                                          <Trash2 className='h-4 w-4' />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Eliminar combo
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>

                                <div className='space-y-2'>
                                  {group.items.map((service) => {
                                    const serviceId =
                                      service.ID_CONFIG_PARAMETRO || service.id;
                                    const scopedServiceId = `${group.id}-${serviceId}`;
                                    return (
                                      <div
                                        key={`${group.id}-${serviceId}`}
                                        className='bg-background rounded-xl border p-3'
                                      >
                                        <div className='flex items-start justify-between gap-2'>
                                          <div className='flex-1 space-y-3'>
                                            <p className='text-sm font-medium'>
                                              {service.ID_PARAMETRO ||
                                                serviceId}
                                            </p>
                                            <p className='text-muted-foreground text-xs'>
                                              {service.ID_MAT_ENSAYO?.trim() ||
                                                'Sin material de ensayo'}
                                            </p>
                                            <p className='text-muted-foreground text-xs'>
                                              {service.ID_TABLA_NORMA ||
                                                'Sin tabla'}{' '}
                                              •{' '}
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
                                            <div className='grid grid-cols-1 gap-5 md:grid-cols-5 md:gap-6'>
                                              <div className='space-y-1'>
                                                <label
                                                  htmlFor={`quantity-${scopedServiceId}`}
                                                  className='text-muted-foreground text-xs'
                                                >
                                                  Cantidad
                                                </label>
                                                <Input
                                                  id={`quantity-${scopedServiceId}`}
                                                  type='number'
                                                  min={1}
                                                  value={service.quantity ?? 1}
                                                  className={`${serviceUnderlineInputClass} pl-2`}
                                                  onChange={(event) =>
                                                    handleUpdateServiceField(
                                                      group.id,
                                                      serviceId,
                                                      'quantity',
                                                      event.target.value
                                                    )
                                                  }
                                                />
                                              </div>
                                              <div className='space-y-1'>
                                                <label
                                                  htmlFor={`range-min-${scopedServiceId}`}
                                                  className='text-muted-foreground text-xs'
                                                >
                                                  Rango mín. (
                                                  {service.UNIDAD_NORMA?.trim() ||
                                                    service.UNIDAD_INTERNO?.trim() ||
                                                    '_'}
                                                  )
                                                </label>
                                                <Input
                                                  id={`range-min-${scopedServiceId}`}
                                                  value={service.rangeMin ?? ''}
                                                  className={`${serviceUnderlineInputClass} pl-2`}
                                                  onChange={(event) =>
                                                    handleUpdateServiceField(
                                                      group.id,
                                                      serviceId,
                                                      'rangeMin',
                                                      event.target.value
                                                    )
                                                  }
                                                  placeholder='0.00'
                                                />
                                              </div>
                                              <div className='space-y-1'>
                                                <label
                                                  htmlFor={`range-max-${scopedServiceId}`}
                                                  className='text-muted-foreground text-xs'
                                                >
                                                  Rango máx. (
                                                  {service.UNIDAD_NORMA?.trim() ||
                                                    service.UNIDAD_INTERNO?.trim() ||
                                                    '_'}
                                                  )
                                                </label>
                                                <Input
                                                  id={`range-max-${scopedServiceId}`}
                                                  value={service.rangeMax ?? ''}
                                                  className={`${serviceUnderlineInputClass} pl-2`}
                                                  onChange={(event) =>
                                                    handleUpdateServiceField(
                                                      group.id,
                                                      serviceId,
                                                      'rangeMax',
                                                      event.target.value
                                                    )
                                                  }
                                                  placeholder='0.00'
                                                />
                                              </div>
                                              <div className='space-y-1'>
                                                <label
                                                  htmlFor={`price-${scopedServiceId}`}
                                                  className='text-muted-foreground text-xs'
                                                >
                                                  Precio (USD)
                                                </label>
                                                <div className='relative'>
                                                  <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
                                                    $
                                                  </span>
                                                  <Input
                                                    id={`price-${scopedServiceId}`}
                                                    type='number'
                                                    min={0}
                                                    step='0.01'
                                                    value={
                                                      typeof service.unitPrice ===
                                                      'number'
                                                        ? service.unitPrice
                                                        : ''
                                                    }
                                                    onChange={(event) =>
                                                      handleUpdateServiceField(
                                                        group.id,
                                                        serviceId,
                                                        'unitPrice',
                                                        event.target.value
                                                      )
                                                    }
                                                    placeholder='0.00'
                                                    className={`${serviceUnderlineInputClass} pl-7`}
                                                  />
                                                </div>
                                              </div>
                                              <div className='space-y-1'>
                                                <label
                                                  htmlFor={`discount-${scopedServiceId}`}
                                                  className='text-muted-foreground text-xs'
                                                >
                                                  Descuento (USD)
                                                </label>
                                                <div className='relative'>
                                                  <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
                                                    $
                                                  </span>
                                                  <Input
                                                    id={`discount-${scopedServiceId}`}
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
                                                        group.id,
                                                        serviceId,
                                                        'discountAmount',
                                                        event.target.value
                                                      )
                                                    }
                                                    placeholder='0.00'
                                                    className={`${serviceUnderlineInputClass} pl-7`}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                type='button'
                                                variant='ghost'
                                                size='icon'
                                                className='h-7 w-7 cursor-pointer'
                                                onClick={() =>
                                                  handleOpenRemoveService(
                                                    group.id,
                                                    service
                                                  )
                                                }
                                                aria-label='Eliminar servicio'
                                              >
                                                <Trash2 className='h-4 w-4' />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Eliminar servicio
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div ref={estimatedCostsSectionRef}>
                      {renderEstimatedCostsPanel()}
                    </div>

                    {renderTabActions()}
                  </div>
                </div>
                <div className='pointer-events-none absolute top-38 bottom-0 left-[calc(100%+1rem)] hidden w-[320px] min-[1400px]:block'>
                  <AnimatePresence initial={false}>
                    {!isEstimatedCostsInView ? (
                      <motion.div
                        key='estimated-costs-floating'
                        className='pointer-events-auto sticky top-16'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
                      >
                        {renderEstimatedCostsPanel()}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PASO E: RESUMEN */}
          <TabsContent value='summary' className='mt-4'>
            <Card className='border-0 p-0 shadow-none'>
              <CardContent className='space-y-5 px-6 py-5'>
                <ProformaSummaryPanel
                  typeLabel='Proforma'
                  matrixLabel={
                    Array.isArray(matrix) && matrix.length
                      ? matrix
                          .map((entry) => MATRIX_LABEL_MAP[entry] ?? entry)
                          .join(', ')
                      : '—'
                  }
                  reference={form.getValues('reference') || '—'}
                  validDaysLabel={
                    validDaysValue ? `${validDaysValue} días` : '—'
                  }
                  validUntilLabel={validUntilLabel}
                  client={{
                    businessName: form.getValues('client.businessName') || '—',
                    taxId: form.getValues('client.taxId') || '—',
                    contactName: form.getValues('client.contactName') || '—'
                  }}
                  groups={summaryServiceGroups.map((group) => ({
                    id: group.id,
                    name: group.name,
                    items: group.items.map((service, index) => ({
                      id:
                        service.ID_CONFIG_PARAMETRO ||
                        service.id ||
                        `${group.id}-service-${index}`,
                      label:
                        service.ID_PARAMETRO ||
                        service.ID_CONFIG_PARAMETRO ||
                        service.id ||
                        'Servicio',
                      quantity: service.quantity ?? 1,
                      unitPrice: service.unitPrice ?? null,
                      discountAmount: service.discountAmount ?? null
                    }))
                  }))}
                  pricing={{
                    subtotal: summarySubtotal,
                    taxPercent: summaryTaxPercent,
                    total: summaryTotal
                  }}
                  notes={summaryNotes}
                  showTotalUsdSuffix
                />

                {renderTabActions(true)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog
        open={isMatrixSelectorDialogOpen}
        onOpenChange={setIsMatrixSelectorDialogOpen}
      >
        <AlertDialogContent className='w-[92vw] max-w-[520px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Seleccionar matriz del nuevo combo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Elegí una matriz para crear el nuevo combo de servicios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='max-h-[52vh] space-y-2 overflow-y-auto'>
            {matrixOptionsForCombo.map((option) => (
              <Button
                key={option.value}
                type='button'
                variant='outline'
                className='w-full justify-between'
                onClick={() => handleSelectComboMatrix(option.value)}
              >
                <span className='truncate text-left'>{option.value}</span>
                <span className='text-muted-foreground ml-3 text-xs'>
                  {option.count}
                </span>
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(groupToDelete)}
        onOpenChange={(open) => {
          if (!open) setGroupToDelete(null);
        }}
      >
        <AlertDialogContent className='w-[92vw] max-w-[460px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar combo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas eliminar el combo "{groupToDelete?.name || 'Combo'}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90'
              onClick={handleConfirmRemoveGroup}
            >
              Eliminar combo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(serviceToDelete)}
        onOpenChange={(open) => {
          if (!open) setServiceToDelete(null);
        }}
      >
        <AlertDialogContent className='w-[92vw] max-w-[460px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
            <AlertDialogDescription>
              Este servicio tiene datos cargados. ¿Estás seguro de que deseas
              eliminarlo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90'
              onClick={handleConfirmRemoveService}
            >
              Eliminar servicio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isServicesDialogOpen}
        onOpenChange={(open) => {
          setIsServicesDialogOpen(open);
          if (!open) {
            setActiveComboMatrix(null);
            setEditingGroupId(null);
            setDialogLockedServiceIds([]);
          }
        }}
      >
        <AlertDialogContent className='flex h-[88vh] max-h-[88vh] w-[96vw] max-w-[1100px] flex-col overflow-x-hidden sm:max-w-[1100px]'>
          <AlertDialogHeader>
            <div className='flex items-center gap-2'>
              <AlertDialogTitle className='shrink-0'>
                Combo de servicios
              </AlertDialogTitle>
              {activeComboMatrix ? (
                <span className='bg-muted text-muted-foreground inline-flex max-w-[70%] items-center rounded-full border px-2.5 py-1 text-sm'>
                  <span className='mr-1 font-medium'>Matriz:</span>
                  <span className='truncate' title={activeComboMatrix}>
                    {activeComboMatrix}
                  </span>
                </span>
              ) : null}
              {dialogSelectedServiceIds.length > 0 ? (
                <HoverCard openDelay={80} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <span className='inline-flex cursor-default items-center rounded-full border border-black bg-black px-2.5 py-1 text-sm text-white dark:border-white dark:bg-white dark:text-black'>
                      {dialogSelectedServiceIds.length} seleccionados
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent
                    align='start'
                    side='bottom'
                    sideOffset={8}
                    className='max-h-[19.2rem] w-[25.4rem] max-w-[25.4rem] overflow-y-auto p-3'
                    onWheel={(event) => event.stopPropagation()}
                  >
                    <div className='space-y-1'>
                      <p className='text-xs font-medium'>
                        Servicios seleccionados
                      </p>
                      <ul className='list-disc space-y-0.5 pl-4 text-xs'>
                        {selectedDialogServiceLabels.map((label, index) => (
                          <li key={`${label}-${index}`}>{label}</li>
                        ))}
                      </ul>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ) : (
                <span className='bg-muted text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-1 text-sm'>
                  {dialogSelectedServiceIds.length} seleccionados
                </span>
              )}
            </div>
            <AlertDialogDescription className='m-0'>
              Selecciona uno o varios servicios para incluir en el combo "
              {dialogComboTitle}".
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='min-w-0 space-y-3'>
            <div className='flex min-w-0 flex-wrap items-center gap-2'>
              <DropdownMenu
                open={isAddFilterDropdownOpen}
                onOpenChange={setIsAddFilterDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='bg-muted/35 text-foreground hover:bg-muted/55 h-9 gap-1.5 text-xs shadow-none'
                  >
                    <IconFilterPlus className='h-3.7 w-3.7' />
                    Agregar filtro
                    <ChevronDown className='h-3.5 w-3.5' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='w-60'>
                  {(Object.keys(DIALOG_FILTER_LABELS) as DialogFilterKey[]).map(
                    (filterKey) => (
                      <DropdownMenuSub key={filterKey}>
                        <DropdownMenuSubTrigger className='text-sm'>
                          <span>{DIALOG_FILTER_LABELS[filterKey]}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent
                          className={`max-h-[27rem] max-w-[84vw] overflow-y-auto ${
                            filterKey === 'tabla' ? 'w-[41rem]' : 'w-[36rem]'
                          }`}
                        >
                          {dialogFilterOptionsByKey[filterKey].map((option) => {
                            const isChecked = dialogFilters[filterKey].includes(
                              option.value
                            );
                            const isUnavailable = option.count === 0;
                            const isDisabled = isUnavailable && !isChecked;

                            const item = (
                              <DropdownMenuCheckboxItem
                                key={`${filterKey}-${option.value}`}
                                checked={isChecked}
                                onCheckedChange={() =>
                                  handleToggleDialogFilterValue(
                                    filterKey,
                                    option.value
                                  )
                                }
                                className={`w-full pr-2 ${
                                  isUnavailable ? 'text-muted-foreground' : ''
                                }`}
                                disabled={isDisabled}
                              >
                                <span
                                  className='min-w-0 flex-1 truncate'
                                  title={option.value}
                                >
                                  {option.value}
                                </span>
                                <span className='text-muted-foreground ml-2 shrink-0 text-xs'>
                                  {option.count}
                                </span>
                              </DropdownMenuCheckboxItem>
                            );

                            if (!isUnavailable) return item;

                            return (
                              <Tooltip key={`${filterKey}-${option.value}`}>
                                <TooltipTrigger asChild>
                                  <span className='block'>{item}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  No disponible con los filtros actuales
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {activeDialogFiltersCount > 0 ||
              dialogSearchTerm.trim().length > 0 ? (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='border-border bg-muted/40 text-foreground hover:bg-muted/55 h-9 gap-1.5 text-xs'
                  onClick={handleClearDialogFilters}
                >
                  <X className='h-2.5 w-2.5' />
                  Limpiar filtros
                </Button>
              ) : null}
            </div>

            {activeDialogFiltersCount > 0 ? (
              <div className='space-y-2'>
                <button
                  type='button'
                  className='inline-flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left'
                  onClick={() =>
                    setIsAppliedFiltersExpanded((previous) => !previous)
                  }
                >
                  <span className='text-foreground/85 text-sm font-medium'>
                    Filtros ({activeDialogFiltersCount})
                  </span>
                  <span className='bg-border mx-1 h-px flex-1' />
                  <ChevronDown
                    className={`text-muted-foreground h-4 w-4 transition-transform ${
                      isAppliedFiltersExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isAppliedFiltersExpanded ? (
                  <div className='bg-muted/20 space-y-2 rounded-md border p-3'>
                    {(
                      Object.keys(DIALOG_FILTER_LABELS) as DialogFilterKey[]
                    ).map((filterKey) => {
                      const selectedValues = dialogFilters[filterKey];
                      if (selectedValues.length === 0) return null;

                      return (
                        <div key={filterKey} className='space-y-1'>
                          <p className='text-muted-foreground text-xs font-medium'>
                            {DIALOG_FILTER_LABELS[filterKey]}
                          </p>
                          <div className='flex flex-wrap gap-1.5'>
                            {selectedValues.map((value) => (
                              <span
                                key={`${filterKey}-${value}`}
                                title={value}
                                className='bg-background inline-flex max-w-[24rem] items-center gap-1 rounded-md border px-2 py-1 text-[11px]'
                              >
                                <span className='truncate'>{value}</span>
                                <button
                                  type='button'
                                  aria-label={`Quitar filtro ${value}`}
                                  className='text-muted-foreground hover:text-foreground inline-flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded-sm'
                                  onClick={() =>
                                    handleRemoveDialogFilterValue(
                                      filterKey,
                                      value
                                    )
                                  }
                                >
                                  <X className='h-3 w-3' />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className='mt-1 flex items-center gap-3'>
            <div className='relative min-w-0 flex-1'>
              <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                value={dialogSearchTerm}
                onChange={(event) => setDialogSearchTerm(event.target.value)}
                placeholder='Buscar por parámetro, método, norma, tabla, unidad o material...'
                className='w-full pl-9'
              />
            </div>
            {filteredAvailableServices.length > 1 &&
            filteredAvailableServices.length <= 30 ? (
              <div className='flex shrink-0 items-center gap-2'>
                <label className='text-muted-foreground flex shrink-0 cursor-pointer items-center gap-2 text-xs sm:text-sm'>
                  <Checkbox
                    checked={areAllVisibleSelected}
                    onCheckedChange={(checked) =>
                      handleSelectAllVisibleToggle(checked === true)
                    }
                    disabled={filteredAvailableServices.length === 0}
                    className='cursor-pointer'
                  />
                  Seleccionar todos
                </label>
              </div>
            ) : null}
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
            {isLoadingAvailableServices ? (
              <p className='text-muted-foreground text-sm'>
                Cargando servicios...
              </p>
            ) : availableServices.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                No hay servicios disponibles. Importalos desde Administración.
              </p>
            ) : filteredAvailableServices.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                No hay servicios para los filtros aplicados.
              </p>
            ) : (
              <div className='grid grid-cols-2 gap-2 max-[900px]:grid-cols-1'>
                {filteredAvailableServices.map((service) => {
                  const serviceId = service.ID_CONFIG_PARAMETRO || service.id;
                  const isSelected =
                    dialogSelectedServiceIds.includes(serviceId);
                  const isLockedSelection =
                    isSelected && dialogLockedServiceIds.includes(serviceId);
                  const cardButton = (
                    <button
                      key={serviceId}
                      type='button'
                      className={`w-full rounded-md border p-3 text-left transition-colors ${
                        isLockedSelection
                          ? 'border-border bg-muted/35 cursor-not-allowed'
                          : isSelected
                            ? 'border-black bg-black/5'
                            : 'hover:bg-muted/50 border-border'
                      }`}
                      onClick={() => handleToggleServiceSelection(serviceId)}
                      disabled={isLockedSelection}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='space-y-1'>
                          <p className='text-sm font-medium'>
                            {service.ID_PARAMETRO || serviceId}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            {getMatEnsayoLabel(service)}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            {service.ID_TABLA_NORMA || 'Sin tabla'} •{' '}
                            {service.UNIDAD_NORMA ||
                              service.UNIDAD_INTERNO ||
                              'Sin unidad'}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            Límite interno: {service.LIM_INF_INTERNO || '—'} a{' '}
                            {service.LIM_SUP_INTERNO || '—'}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            {service.ID_TECNICA ||
                              service.ID_MET_REFERENCIA ||
                              service.ID_MET_INTERNO ||
                              'Sin método'}
                          </p>
                        </div>
                        {isSelected ? (
                          <span
                            className={`inline-flex aspect-square size-[1.125rem] shrink-0 items-center justify-center self-start rounded-full leading-none ${
                              isLockedSelection
                                ? 'bg-muted-foreground/60 text-white'
                                : 'bg-black text-white'
                            }`}
                          >
                            <Check className='h-2.5 w-2.5' strokeWidth={3} />
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );

                  if (isLockedSelection) {
                    return (
                      <span
                        key={serviceId}
                        className='block'
                        onMouseEnter={(event) =>
                          setLockedServiceCursorHint({
                            visible: true,
                            x: event.clientX,
                            y: event.clientY
                          })
                        }
                        onMouseMove={(event) =>
                          setLockedServiceCursorHint({
                            visible: true,
                            x: event.clientX,
                            y: event.clientY
                          })
                        }
                        onMouseLeave={() =>
                          setLockedServiceCursorHint((prev) => ({
                            ...prev,
                            visible: false
                          }))
                        }
                      >
                        {cardButton}
                      </span>
                    );
                  }

                  return <div key={serviceId}>{cardButton}</div>;
                })}
              </div>
            )}
          </div>

          {lockedServiceCursorHint.visible ? (
            <div
              className='bg-popover text-popover-foreground pointer-events-none fixed z-[120] rounded-md border px-2 py-1 text-xs shadow-md'
              style={{
                left: `${lockedServiceCursorHint.x + -230}px`,
                top: `${lockedServiceCursorHint.y + 10}px`
              }}
            >
              Servicio ya agregado al combo
            </div>
          ) : null}

          <AlertDialogFooter>
            <div className='text-muted-foreground mr-auto text-xs sm:text-sm'>
              {filteredAvailableServices.length} resultados
            </div>
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

      <AlertDialog
        open={isSendEmailDialogOpen}
        onOpenChange={setIsSendEmailDialogOpen}
      >
        <AlertDialogContent className='max-w-[34rem]'>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar proforma por email</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará la proforma en PDF con el resumen actual.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='space-y-3'>
            <div className='space-y-1'>
              <label
                htmlFor='send-proforma-email'
                className='text-sm font-medium'
              >
                Email de destino
              </label>
              <Input
                id='send-proforma-email'
                type='email'
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder='Email de destino'
              />
            </div>
            <div className='space-y-1 rounded-md border p-3 text-sm'>
              <p>
                <span className='font-medium'>Referencia:</span>{' '}
                {referenceLabel}
              </p>
              <p>
                <span className='font-medium'>Cliente:</span>{' '}
                {form.getValues('client.businessName') || '—'}
              </p>
              <p>
                <span className='font-medium'>Total estimado:</span> $
                {summaryTotal.toFixed(2)}
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isSendingPreviewEmail}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90'
              onClick={handleSendPreviewEmail}
              disabled={isSendingPreviewEmail}
            >
              <span className='inline-flex items-center gap-2'>
                <Send className='h-4 w-4' />
                {isSendingPreviewEmail ? 'Enviando...' : 'Enviar'}
              </span>
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
