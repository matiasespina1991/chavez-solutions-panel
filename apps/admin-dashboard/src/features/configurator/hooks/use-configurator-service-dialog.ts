import { useMemo } from 'react';

import { type ImportedServiceDocument } from '@/features/configurator/services/configurations';
import {
  type DialogFilterKey,
  type DialogFilters,
  type ServiceFilterOption,
  DIALOG_FILTER_LABELS
} from '@/features/configurator/lib/configurator-form-model';

interface UseConfiguratorServiceDialogParams {
  availableServices: ImportedServiceDocument[];
  activeComboMatrix: string | null;
  dialogFilters: DialogFilters;
  dialogSearchTerm: string;
  dialogSelectedServiceIds: string[];
}

export function useConfiguratorServiceDialog({
  availableServices,
  activeComboMatrix,
  dialogFilters,
  dialogSearchTerm,
  dialogSelectedServiceIds
}: UseConfiguratorServiceDialogParams) {
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
    for (const service of availableServices) {
      const label = getMatrizLabel(service);
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, 'es'));
  }, [availableServices]);

  const activeDialogFiltersCount =
    dialogFilters.matEnsayo.length +
    dialogFilters.norma.length +
    dialogFilters.tabla.length +
    dialogFilters.tecnica.length;

  const dialogFilterOptionsByKey: Record<DialogFilterKey, ServiceFilterOption[]> =
    useMemo(() => {
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

      for (const key of (Object.keys(DIALOG_FILTER_LABELS) as DialogFilterKey[])) {
        const labelReader = readLabelByKey[key];
        const counts = new Map<string, number>();

        for (const service of matrixScopedAvailableServices) {
          const label = labelReader(service);
          if (!counts.has(label)) counts.set(label, 0);
        }

        for (const service of matrixScopedAvailableServices) {
          if (!serviceMatchesDialogFilters(service, key)) continue;
          const label = labelReader(service);
          counts.set(label, (counts.get(label) || 0) + 1);
        }

        next[key] = Array.from(counts.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value, 'es'));
      }

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

  return {
    getServiceId,
    getMatEnsayoLabel,
    getMatrizLabel,
    filteredAvailableServices,
    matrixOptionsForCombo,
    activeDialogFiltersCount,
    dialogFilterOptionsByKey,
    visibleServiceIds,
    selectedDialogServiceLabels,
    areAllVisibleSelected
  };
}
