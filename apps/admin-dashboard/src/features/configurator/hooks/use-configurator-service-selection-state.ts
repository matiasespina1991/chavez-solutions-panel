import { useMemo, useState } from 'react';

import { type ImportedServiceDocument } from '@/features/configurator/services/configurations';
import {
  type DialogFilterKey,
  type DialogFilters,
  type SelectedService,
  type SelectedServiceGroup
} from '@/features/configurator/lib/configurator-form-model';

type LockedServiceCursorHint = {
  visible: boolean;
  x: number;
  y: number;
};

interface UseConfiguratorServiceSelectionStateParams {
  availableServices: ImportedServiceDocument[];
  getServiceId: (service: ImportedServiceDocument) => string;
  getMatrizLabel: (service: ImportedServiceDocument) => string;
  toSelectedService: (
    service: ImportedServiceDocument,
    overrides?: Partial<SelectedService>
  ) => SelectedService;
}

const EMPTY_DIALOG_FILTERS: DialogFilters = {
  matEnsayo: [],
  norma: [],
  tabla: [],
  tecnica: []
};

export function useConfiguratorServiceSelectionState({
  availableServices,
  getServiceId,
  getMatrizLabel,
  toSelectedService
}: UseConfiguratorServiceSelectionStateParams) {
  const sortServicesAlphabetically = (services: SelectedService[]) => [...services].sort((a, b) => {
    const aLabel = (a.ID_PARAMETRO || getServiceId(a)).trim();
    const bLabel = (b.ID_PARAMETRO || getServiceId(b)).trim();

    const byLabel = aLabel.localeCompare(bLabel, 'es', {
      sensitivity: 'base',
      numeric: true
    });
    if (byLabel !== 0) return byLabel;

    return getServiceId(a).localeCompare(getServiceId(b), 'es', {
      sensitivity: 'base',
      numeric: true
    });
  });

  const [isMatrixSelectorDialogOpen, setIsMatrixSelectorDialogOpen] =
    useState(false);
  const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
  const [activeComboMatrix, setActiveComboMatrix] = useState<string | null>(
    null
  );
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [dialogFilters, setDialogFilters] = useState<DialogFilters>(
    EMPTY_DIALOG_FILTERS
  );
  const [dialogSearchTerm, setDialogSearchTerm] = useState('');
  const [dialogSelectedServiceIds, setDialogSelectedServiceIds] = useState<
    string[]
  >([]);
  const [dialogLockedServiceIds, setDialogLockedServiceIds] = useState<
    string[]
  >([]);
  const [lockedServiceCursorHint, setLockedServiceCursorHint] =
    useState<LockedServiceCursorHint>({
      visible: false,
      x: 0,
      y: 0
    });
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

  const handleOpenMatrixSelectorDialog = () => {
    setIsMatrixSelectorDialogOpen(true);
  };

  const handleSelectComboMatrix = (matrixLabel: string) => {
    setEditingGroupId(null);
    setActiveComboMatrix(matrixLabel);
    setDialogSelectedServiceIds([]);
    setDialogLockedServiceIds([]);
    setDialogFilters(EMPTY_DIALOG_FILTERS);
    setDialogSearchTerm('');
    setIsMatrixSelectorDialogOpen(false);
    setIsServicesDialogOpen(true);
  };

  const handleEditGroupServices = (
    group: SelectedServiceGroup,
    matrixLabel: string | null
  ) => {
    const currentServiceIds = group.items.map((service) => getServiceId(service));
    setEditingGroupId(group.id);
    setActiveComboMatrix(matrixLabel);
    setDialogSelectedServiceIds(currentServiceIds);
    setDialogLockedServiceIds(currentServiceIds);
    setDialogFilters(EMPTY_DIALOG_FILTERS);
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

  const handleSelectAllVisibleToggle = (
    checked: boolean,
    visibleServiceIds: string[]
  ) => {
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
    setDialogFilters(EMPTY_DIALOG_FILTERS);
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

          return { ...group, items: sortServicesAlphabetically(nextItems) };
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
          items: sortServicesAlphabetically(nextGroupServicesFromCatalog)
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

  const handleServicesDialogOpenChange = (open: boolean) => {
    setIsServicesDialogOpen(open);
    if (!open) {
      setActiveComboMatrix(null);
      setEditingGroupId(null);
      setDialogLockedServiceIds([]);
    }
  };

  return {
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
  };
}
