'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import {
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getGenericCallableErrorMessage,
} from '@/lib/callable-errors';
import { showCallableErrorToast } from '@/lib/callable-toast';

import { db } from '@/lib/firebase';
import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSidebar } from '@/components/ui/sidebar';
import {
  createTechnicalService,
  CreateTechnicalServicePayload,
  deleteTechnicalService,
  saveServicesTechnicalChanges
} from '@/features/admin/services/import-services';
import { ServicesCatalogConfirmDialogs } from '@/features/services-catalog/components/services-catalog-confirm-dialogs';
import { ServicesCatalogCreateDialog } from '@/features/services-catalog/components/services-catalog-create-dialog';
import { ServicesCatalogFiltersBar } from '@/features/services-catalog/components/services-catalog-filters-bar';
import { ServicesCatalogTable } from '@/features/services-catalog/components/services-catalog-table';
import { ServicesCatalogToolbarActions } from '@/features/services-catalog/components/services-catalog-toolbar-actions';
import {
  AUTOCOMPLETE_FIELD_KEYS,
  buildRowFromDoc,
  CREATE_SERVICE_REQUIRED_FIELDS,
  EDITABLE_COLUMNS,
  getChangedPatch,
  INITIAL_CREATE_SERVICE_DRAFT,
  normalizeForAutocomplete,
  normalizeForCompare,
  PAGE_SIZE,
  type CreateServiceDraft,
  type EditableFieldKey,
  type ServiceCatalogRow,
  type SortableCatalogFieldKey,
  type SortDirection
} from '@/features/services-catalog/lib/services-catalog-panel-model';

export function ServicesCatalogPanel() {
  const { state, isMobile } = useSidebar();
  const [rows, setRows] = useState<ServiceCatalogRow[]>([]);
  const [originalById, setOriginalById] = useState<
    Record<string, ServiceCatalogRow>
  >({});
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [rowToDelete, setRowToDelete] = useState<ServiceCatalogRow | null>(
    null
  );
  const [isCreateServiceDialogOpen, setIsCreateServiceDialogOpen] =
    useState(false);
  const [isDiscardCreateDialogOpen, setIsDiscardCreateDialogOpen] =
    useState(false);
  const [activeAutocompleteField, setActiveAutocompleteField] = useState<
    keyof CreateServiceDraft | null
  >(null);
  const autocompleteBlurTimeoutRef = useRef<number | null>(null);
  const [activeTableAutocomplete, setActiveTableAutocomplete] = useState<{
    rowId: string;
    field: keyof CreateServiceDraft;
  } | null>(null);
  const tableAutocompleteBlurTimeoutRef = useRef<number | null>(null);
  const [sortKey, setSortKey] = useState<SortableCatalogFieldKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [hideColumnsFromTechnique, setHideColumnsFromTechnique] =
    useState(false);
  const [createServiceDraft, setCreateServiceDraft] =
    useState<CreateServiceDraft>(INITIAL_CREATE_SERVICE_DRAFT);
  const [createServiceDraftBaseline, setCreateServiceDraftBaseline] =
    useState<CreateServiceDraft>(INITIAL_CREATE_SERVICE_DRAFT);
  const [createServiceTouchedFields, setCreateServiceTouchedFields] = useState<
    Partial<Record<keyof CreateServiceDraft, boolean>>
  >({});
  const [createServiceSubmitAttempted, setCreateServiceSubmitAttempted] =
    useState(false);

  const loadRows = async () => {
    setIsLoading(true);

    try {
      const snapshot = await getDocs(
        collection(db, FIRESTORE_COLLECTIONS.SERVICES)
      );

      const loadedRows = snapshot.docs
        .map((docSnap) =>
          buildRowFromDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
        )
        .sort((a, b) =>
          a.ID_PARAMETRO.localeCompare(b.ID_PARAMETRO, 'es', {
            sensitivity: 'base'
          })
        );

      const originalMap = loadedRows.reduce<Record<string, ServiceCatalogRow>>(
        (acc, row) => {
          acc[row.id] = { ...row };
          return acc;
        },
        {}
      );

      setRows(loadedRows);
      setOriginalById(originalMap);
    } catch (error) {
      console.error('[ServicesCatalog] load error', error);
      toast.error('No se pudo cargar el catálogo de servicios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  useEffect(() => {
    setSelectedRowIds((prev) =>
      prev.filter((id) => rows.some((row) => row.id === id))
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;

    const searchableKeys = [
      'ID_CONFIG_PARAMETRO',
      'ID_CONDICION_PARAMETRO',
      'ID_PARAMETRO',
      'ID_MAT_ENSAYO',
      'ID_MATRIZ',
      'ID_UBICACION',
      'ID_NORMA',
      'ID_TABLA_NORMA',
      'ID_TECNICA',
      'ID_MET_INTERNO',
      'ID_MET_REFERENCIA',
      'UNIDAD_INTERNO',
      'UNIDAD_NORMA'
    ] as const;

    return rows.filter((row) => {
      const original = originalById[row.id];

      const searchable = searchableKeys
        .map((key) => {
          if (!original) return row[key];

          const currentValue = normalizeForCompare(row[key]);
          const originalValue = normalizeForCompare(original[key]);

          return currentValue === originalValue ? row[key] : original[key];
        })
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [rows, query, originalById]);

  const dirtyIds = useMemo(() => {
    return rows
      .filter((row) => {
        const original = originalById[row.id];
        return Object.keys(getChangedPatch(row, original)).length > 0;
      })
      .map((row) => row.id);
  }, [rows, originalById]);

  const dirtySet = useMemo(() => new Set(dirtyIds), [dirtyIds]);

  const sortedFilteredRows = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return filteredRows;
    }

    const getSortComparableValue = (row: ServiceCatalogRow) => {
      if (!dirtySet.has(row.id)) {
        return row[sortKey];
      }

      const original = originalById[row.id];
      if (!original) {
        return row[sortKey];
      }

      const currentValue = normalizeForCompare(row[sortKey]);
      const originalValue = normalizeForCompare(original[sortKey]);

      return currentValue === originalValue ? row[sortKey] : original[sortKey];
    };

    const sorted = [...filteredRows];
    sorted.sort((a, b) =>
      getSortComparableValue(a).localeCompare(getSortComparableValue(b), 'es', {
        sensitivity: 'base'
      })
    );
    if (sortDirection === 'desc') sorted.reverse();

    return sorted;
  }, [filteredRows, sortKey, sortDirection, dirtySet, originalById]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedFilteredRows.length / PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedFilteredRows.slice(start, start + PAGE_SIZE);
  }, [sortedFilteredRows, currentPage]);

  const visibleEditableColumns = useMemo(() => {
    if (!hideColumnsFromTechnique) {
      return EDITABLE_COLUMNS;
    }

    const hiddenKeys: EditableFieldKey[] = [
      'ID_TECNICA',
      'ID_MET_INTERNO',
      'ID_MET_REFERENCIA',
      'ID_CONDICION_PARAMETRO',
      'UNIDAD_INTERNO',
      'LIM_INF_INTERNO',
      'LIM_SUP_INTERNO'
    ];

    return EDITABLE_COLUMNS.filter(
      (column) => !hiddenKeys.includes(column.key)
    );
  }, [hideColumnsFromTechnique]);

  const selectedRowIdsSet = useMemo(
    () => new Set(selectedRowIds),
    [selectedRowIds]
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowIdsSet.has(row.id)),
    [rows, selectedRowIdsSet]
  );

  const pageRowIds = useMemo(() => pageRows.map((row) => row.id), [pageRows]);
  const allPageSelected =
    pageRowIds.length > 0 &&
    pageRowIds.every((id) => selectedRowIdsSet.has(id));
  const hasSomePageSelected =
    pageRowIds.some((id) => selectedRowIdsSet.has(id)) && !allPageSelected;

  const handleSortBy = (key: SortableCatalogFieldKey) => {
    setPage(1);
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection('asc');
      return;
    }

    if (sortDirection === 'asc') {
      setSortDirection('desc');
      return;
    }

    if (sortDirection === 'desc') {
      setSortKey(null);
      setSortDirection(null);
      return;
    }

    setSortDirection('asc');
  };

  const renderSortIcon = (key: SortableCatalogFieldKey) => {
    if (sortKey !== key || !sortDirection) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp className='h-3.5 w-3.5 opacity-80' />
    ) : (
      <ArrowDown className='h-3.5 w-3.5 opacity-80' />
    );
  };

  const handleCellChange = (
    rowId: string,
    field: EditableFieldKey,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const handleResetRow = (rowId: string) => {
    const original = originalById[rowId];
    if (!original) return;

    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...original } : row))
    );
  };

  const handleResetAllChanges = () => {
    if (dirtyIds.length === 0) return;

    setRows((prev) =>
      prev.map((row) => {
        const original = originalById[row.id];
        return original ? { ...original } : row;
      })
    );
  };

  const toggleRowSelection = (rowId: string, checked: boolean) => {
    setSelectedRowIds((prev) => {
      if (checked) {
        if (prev.includes(rowId)) return prev;
        return [...prev, rowId];
      }
      return prev.filter((id) => id !== rowId);
    });
  };

  const togglePageSelection = (checked: boolean) => {
    setSelectedRowIds((prev) => {
      if (checked) {
        const merged = new Set([...prev, ...pageRowIds]);
        return Array.from(merged);
      }
      const pageSet = new Set(pageRowIds);
      return prev.filter((id) => !pageSet.has(id));
    });
  };

  const handleEditRow = (row: ServiceCatalogRow) => {
    const nextDraft: CreateServiceDraft = {
      ID_CONFIG_PARAMETRO: row.ID_CONFIG_PARAMETRO || row.id,
      ID_PARAMETRO: row.ID_PARAMETRO,
      ID_CONDICION_PARAMETRO: row.ID_CONDICION_PARAMETRO || 'ACREDITADO',
      ID_UBICACION: row.ID_UBICACION,
      ID_MATRIZ: row.ID_MATRIZ,
      ID_MAT_ENSAYO: row.ID_MAT_ENSAYO,
      ID_NORMA: row.ID_NORMA,
      ID_TABLA_NORMA: row.ID_TABLA_NORMA,
      ID_TECNICA: row.ID_TECNICA,
      ID_MET_INTERNO: row.ID_MET_INTERNO,
      ID_MET_REFERENCIA: row.ID_MET_REFERENCIA,
      UNIDAD_INTERNO: row.UNIDAD_INTERNO,
      UNIDAD_NORMA: row.UNIDAD_NORMA,
      LIM_INF_INTERNO: row.LIM_INF_INTERNO,
      LIM_SUP_INTERNO: row.LIM_SUP_INTERNO,
      LIM_INF_NORMA: row.LIM_INF_NORMA,
      LIM_SUP_NORMA: row.LIM_SUP_NORMA
    };
    setEditingRowId(row.id);
    setCreateServiceDraft(nextDraft);
    setCreateServiceDraftBaseline(nextDraft);
    setCreateServiceTouchedFields({});
    setCreateServiceSubmitAttempted(false);
    setIsCreateServiceDialogOpen(true);
  };

  const handleConfirmDeleteRow = async () => {
    if (!rowToDelete) return;

    setIsDeletingService(true);
    try {
      await deleteTechnicalService(rowToDelete.id);
      toast.success(
        `Servicio ${rowToDelete.ID_CONFIG_PARAMETRO || rowToDelete.id} eliminado.`
      );
      setRowToDelete(null);
      await loadRows();
    } catch (error) {
      console.error('[ServicesCatalog] delete service error', error);
      const message =
        getGenericCallableErrorMessage(error) ??
        'No se pudo eliminar el servicio.';
      showCallableErrorToast(message);
    } finally {
      setIsDeletingService(false);
    }
  };

  const handleConfirmBulkDeleteRows = async () => {
    if (selectedRowIds.length === 0) return;

    setIsDeletingService(true);
    try {
      const results = await Promise.allSettled(
        selectedRowIds.map((id) => deleteTechnicalService(id))
      );
      const deleted = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const failed = results.length - deleted;

      if (deleted > 0) {
        toast.success(
          `${deleted} servicio${deleted === 1 ? '' : 's'} eliminado${deleted === 1 ? '' : 's'}.`
        );
      }
      if (failed > 0) {
        toast.error(
          `No se pudieron eliminar ${failed} servicio${failed === 1 ? '' : 's'}.`
        );
      }

      setIsBulkDeleteDialogOpen(false);
      setSelectedRowIds([]);
      await loadRows();
    } catch (error) {
      console.error('[ServicesCatalog] bulk delete service error', error);
      toast.error('No se pudieron eliminar los servicios seleccionados.');
    } finally {
      setIsDeletingService(false);
    }
  };

  const handleSaveChanges = async () => {
    const changes = rows
      .map((row) => {
        const original = originalById[row.id];
        const patch = getChangedPatch(row, original);
        if (!Object.keys(patch).length) return null;

        return {
          id: row.id,
          patch,
          lastKnownUpdatedAt: row.updatedAtISO
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (changes.length === 0) {
      toast.info('No hay cambios para guardar.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveServicesTechnicalChanges(
        changes,
        'Edición técnica desde panel de catálogo'
      );

      if (result.updated > 0) {
        toast.success(
          `Cambios guardados: ${result.updated} servicio${result.updated === 1 ? '' : 's'}.`
        );
      } else {
        toast.info('No se aplicaron cambios.');
      }

      if (result.conflicts.length > 0) {
        toast.warning(
          `${result.conflicts.length} conflicto(s): recarga el catálogo y reintenta.`
        );
      }

      if (result.notFound.length > 0) {
        toast.warning(
          `${result.notFound.length} servicio(s) no encontrado(s).`
        );
      }

      await loadRows();
    } catch (error) {
      console.error('[ServicesCatalog] save error', error);
      const message =
        getGenericCallableErrorMessage(error) ??
        'No se pudieron guardar los cambios.';
      showCallableErrorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateServiceFieldChange = (
    key: keyof CreateServiceDraft,
    value: string
  ) => {
    setCreateServiceDraft((prev) => ({ ...prev, [key]: value }));
  };

  const createServiceAutocompleteOptions = useMemo(() => {
    const uniqueFromRows = <K extends keyof ServiceCatalogRow>(key: K) =>
      Array.from(
        new Set(
          rows
            .map((row) => row[key])
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter((value) => value.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    return {
      ID_PARAMETRO: uniqueFromRows('ID_PARAMETRO'),
      ID_TABLA_NORMA: uniqueFromRows('ID_TABLA_NORMA'),
      ID_NORMA: uniqueFromRows('ID_NORMA'),
      ID_MAT_ENSAYO: uniqueFromRows('ID_MAT_ENSAYO'),
      ID_MET_INTERNO: uniqueFromRows('ID_MET_INTERNO'),
      UNIDAD_INTERNO: uniqueFromRows('UNIDAD_INTERNO'),
      UNIDAD_NORMA: uniqueFromRows('UNIDAD_NORMA'),
      ID_MATRIZ: uniqueFromRows('ID_MATRIZ'),
      ID_TECNICA: uniqueFromRows('ID_TECNICA'),
      ID_UBICACION: uniqueFromRows('ID_UBICACION')
    } as const;
  }, [rows]);

  const getAutocompleteMatches = (
    key: keyof CreateServiceDraft,
    query: string
  ): string[] => {
    if (!AUTOCOMPLETE_FIELD_KEYS.includes(key)) return [];

    const queryValue = normalizeForAutocomplete(query);
    if (!queryValue.length) return [];

    const options =
      createServiceAutocompleteOptions[
        key as keyof typeof createServiceAutocompleteOptions
      ] ?? [];

    const matches = options.filter((option) =>
      normalizeForAutocomplete(option).startsWith(queryValue)
    );

    if (
      matches.length === 1 &&
      normalizeForAutocomplete(matches[0]) === queryValue
    ) {
      return [];
    }

    return matches;
  };

  const getCreateServiceAutocompleteMatches = (
    key: keyof CreateServiceDraft
  ): string[] => getAutocompleteMatches(key, createServiceDraft[key]);

  const handleTableCellFocus = (
    rowId: string,
    field: keyof CreateServiceDraft
  ) => {
    if (tableAutocompleteBlurTimeoutRef.current !== null) {
      window.clearTimeout(tableAutocompleteBlurTimeoutRef.current);
      tableAutocompleteBlurTimeoutRef.current = null;
    }
    setActiveTableAutocomplete({
      rowId,
      field
    });
  };

  const handleTableCellBlur = (_field: keyof CreateServiceDraft) => {
    if (tableAutocompleteBlurTimeoutRef.current !== null) {
      window.clearTimeout(tableAutocompleteBlurTimeoutRef.current);
    }
    tableAutocompleteBlurTimeoutRef.current = window.setTimeout(() => {
      setActiveTableAutocomplete(null);
      tableAutocompleteBlurTimeoutRef.current = null;
    }, 120);
  };

  const handleCloseTableAutocomplete = () => {
    setActiveTableAutocomplete(null);
  };

  const handleOpenCreateServiceDialog = () => {
    const nextDraft = { ...INITIAL_CREATE_SERVICE_DRAFT };
    setEditingRowId(null);
    setCreateServiceDraft(nextDraft);
    setCreateServiceDraftBaseline(nextDraft);
    setCreateServiceTouchedFields({});
    setCreateServiceSubmitAttempted(false);
    if (autocompleteBlurTimeoutRef.current !== null) {
      window.clearTimeout(autocompleteBlurTimeoutRef.current);
      autocompleteBlurTimeoutRef.current = null;
    }
    setActiveAutocompleteField(null);
    setIsCreateServiceDialogOpen(true);
  };

  const hasCreateServiceDraftChanges = useMemo(
    () =>
      Object.entries(createServiceDraft).some(([key, value]) => {
        const baselineValue =
          createServiceDraftBaseline[key as keyof CreateServiceDraft];
        return value.trim() !== baselineValue.trim();
      }),
    [createServiceDraft, createServiceDraftBaseline]
  );

  useEffect(() => {
    return () => {
      if (autocompleteBlurTimeoutRef.current !== null) {
        window.clearTimeout(autocompleteBlurTimeoutRef.current);
      }
      if (tableAutocompleteBlurTimeoutRef.current !== null) {
        window.clearTimeout(tableAutocompleteBlurTimeoutRef.current);
      }
    };
  }, []);

  const handleRequestCloseCreateServiceDialog = () => {
    if (hasCreateServiceDraftChanges) {
      setIsDiscardCreateDialogOpen(true);
      return;
    }

    setIsCreateServiceDialogOpen(false);
    setEditingRowId(null);
    setCreateServiceDraft(INITIAL_CREATE_SERVICE_DRAFT);
    setCreateServiceDraftBaseline(INITIAL_CREATE_SERVICE_DRAFT);
    setCreateServiceTouchedFields({});
    setCreateServiceSubmitAttempted(false);
  };

  const handleConfirmDiscardCreateServiceDraft = () => {
    setIsDiscardCreateDialogOpen(false);
    setIsCreateServiceDialogOpen(false);
    setEditingRowId(null);
    if (autocompleteBlurTimeoutRef.current !== null) {
      window.clearTimeout(autocompleteBlurTimeoutRef.current);
      autocompleteBlurTimeoutRef.current = null;
    }
    setActiveAutocompleteField(null);
    setCreateServiceDraft(INITIAL_CREATE_SERVICE_DRAFT);
    setCreateServiceDraftBaseline(INITIAL_CREATE_SERVICE_DRAFT);
    setCreateServiceTouchedFields({});
    setCreateServiceSubmitAttempted(false);
  };

  const isCreateServiceFieldInvalid = (key: keyof CreateServiceDraft) => {
    if (!CREATE_SERVICE_REQUIRED_FIELDS.includes(key)) return false;
    if (!createServiceSubmitAttempted) return false;
    return !createServiceDraft[key].trim();
  };

  const handleCreateFieldFocus = (key: keyof CreateServiceDraft) => {
    if (!AUTOCOMPLETE_FIELD_KEYS.includes(key)) return;
    if (autocompleteBlurTimeoutRef.current !== null) {
      window.clearTimeout(autocompleteBlurTimeoutRef.current);
      autocompleteBlurTimeoutRef.current = null;
    }
    setActiveAutocompleteField(key);
  };

  const handleCreateFieldBlur = (key: keyof CreateServiceDraft) => {
    setCreateServiceTouchedFields((prev) => ({
      ...prev,
      [key]: true
    }));

    if (!AUTOCOMPLETE_FIELD_KEYS.includes(key)) return;
    if (autocompleteBlurTimeoutRef.current !== null) {
      window.clearTimeout(autocompleteBlurTimeoutRef.current);
    }
    autocompleteBlurTimeoutRef.current = window.setTimeout(() => {
      setActiveAutocompleteField(null);
      autocompleteBlurTimeoutRef.current = null;
    }, 120);
  };

  const handleSelectCreateAutocomplete = (
    key: keyof CreateServiceDraft,
    value: string
  ) => {
    handleCreateServiceFieldChange(key, value);
    setActiveAutocompleteField(null);
  };
  const handleDuplicateRow = (row: ServiceCatalogRow) => {
    const nextDraft: CreateServiceDraft = {
      ID_CONFIG_PARAMETRO: '',
      ID_PARAMETRO: row.ID_PARAMETRO,
      ID_CONDICION_PARAMETRO: row.ID_CONDICION_PARAMETRO || 'ACREDITADO',
      ID_UBICACION: row.ID_UBICACION,
      ID_MATRIZ: row.ID_MATRIZ,
      ID_MAT_ENSAYO: row.ID_MAT_ENSAYO,
      ID_NORMA: row.ID_NORMA,
      ID_TABLA_NORMA: row.ID_TABLA_NORMA,
      ID_TECNICA: row.ID_TECNICA,
      ID_MET_INTERNO: row.ID_MET_INTERNO,
      ID_MET_REFERENCIA: row.ID_MET_REFERENCIA,
      UNIDAD_INTERNO: row.UNIDAD_INTERNO,
      UNIDAD_NORMA: row.UNIDAD_NORMA,
      LIM_INF_INTERNO: row.LIM_INF_INTERNO,
      LIM_SUP_INTERNO: row.LIM_SUP_INTERNO,
      LIM_INF_NORMA: row.LIM_INF_NORMA,
      LIM_SUP_NORMA: row.LIM_SUP_NORMA
    };
    setEditingRowId(null);
    setCreateServiceDraft(nextDraft);
    setCreateServiceDraftBaseline(nextDraft);
    setCreateServiceTouchedFields({});
    setCreateServiceSubmitAttempted(false);
    if (autocompleteBlurTimeoutRef.current !== null) {
      window.clearTimeout(autocompleteBlurTimeoutRef.current);
      autocompleteBlurTimeoutRef.current = null;
    }
    setActiveAutocompleteField(null);
    setIsCreateServiceDialogOpen(true);
  };

  const handleSaveServiceDialog = async () => {
    setCreateServiceSubmitAttempted(true);
    const payload: CreateTechnicalServicePayload = {
      ...createServiceDraft,
      ID_CONFIG_PARAMETRO: createServiceDraft.ID_CONFIG_PARAMETRO.trim(),
      ID_PARAMETRO: createServiceDraft.ID_PARAMETRO.trim(),
      ID_CONDICION_PARAMETRO:
        createServiceDraft.ID_CONDICION_PARAMETRO.trim() || 'ACREDITADO',
      ID_UBICACION: createServiceDraft.ID_UBICACION.trim(),
      ID_MATRIZ: createServiceDraft.ID_MATRIZ.trim(),
      ID_MAT_ENSAYO: createServiceDraft.ID_MAT_ENSAYO.trim(),
      ID_NORMA: createServiceDraft.ID_NORMA.trim(),
      ID_TABLA_NORMA: createServiceDraft.ID_TABLA_NORMA.trim(),
      ID_TECNICA: createServiceDraft.ID_TECNICA.trim(),
      ID_MET_INTERNO: createServiceDraft.ID_MET_INTERNO.trim(),
      ID_MET_REFERENCIA: createServiceDraft.ID_MET_REFERENCIA.trim(),
      UNIDAD_INTERNO: createServiceDraft.UNIDAD_INTERNO.trim(),
      UNIDAD_NORMA: createServiceDraft.UNIDAD_NORMA.trim(),
      LIM_INF_INTERNO: createServiceDraft.LIM_INF_INTERNO.trim(),
      LIM_SUP_INTERNO: createServiceDraft.LIM_SUP_INTERNO.trim(),
      LIM_INF_NORMA: createServiceDraft.LIM_INF_NORMA.trim(),
      LIM_SUP_NORMA: createServiceDraft.LIM_SUP_NORMA.trim()
    };

    const missingFields = CREATE_SERVICE_REQUIRED_FIELDS.filter(
      (field) => !payload[field]
    );
    if (missingFields.length > 0) {
      toast.error('Completa los campos obligatorios antes de guardar.');
      return;
    }

    if (editingRowId) {
      const row = rows.find((entry) => entry.id === editingRowId);
      if (!row) {
        toast.error('No se encontró el servicio para editar.');
        return;
      }

      const patch = {
        ID_CONDICION_PARAMETRO: payload.ID_CONDICION_PARAMETRO,
        ID_UBICACION: payload.ID_UBICACION,
        ID_PARAMETRO: payload.ID_PARAMETRO,
        ID_MATRIZ: payload.ID_MATRIZ,
        ID_MAT_ENSAYO: payload.ID_MAT_ENSAYO,
        ID_NORMA: payload.ID_NORMA,
        ID_TABLA_NORMA: payload.ID_TABLA_NORMA,
        ID_TECNICA: payload.ID_TECNICA,
        ID_MET_INTERNO: payload.ID_MET_INTERNO,
        ID_MET_REFERENCIA: payload.ID_MET_REFERENCIA,
        UNIDAD_INTERNO: payload.UNIDAD_INTERNO,
        UNIDAD_NORMA: payload.UNIDAD_NORMA,
        LIM_INF_INTERNO: payload.LIM_INF_INTERNO,
        LIM_SUP_INTERNO: payload.LIM_SUP_INTERNO,
        LIM_INF_NORMA: payload.LIM_INF_NORMA,
        LIM_SUP_NORMA: payload.LIM_SUP_NORMA
      };

      setIsCreatingService(true);
      try {
        await saveServicesTechnicalChanges(
          [
            {
              id: editingRowId,
              patch,
              lastKnownUpdatedAt: row.updatedAtISO
            }
          ],
          'Edición técnica desde diálogo de servicio'
        );
        toast.success('Servicio técnico actualizado correctamente.');
        setIsCreateServiceDialogOpen(false);
        setEditingRowId(null);
        setCreateServiceDraft(INITIAL_CREATE_SERVICE_DRAFT);
        setCreateServiceDraftBaseline(INITIAL_CREATE_SERVICE_DRAFT);
        setCreateServiceTouchedFields({});
        setCreateServiceSubmitAttempted(false);
        setActiveAutocompleteField(null);
        if (autocompleteBlurTimeoutRef.current !== null) {
          window.clearTimeout(autocompleteBlurTimeoutRef.current);
          autocompleteBlurTimeoutRef.current = null;
        }
        await loadRows();
      } catch (error) {
        console.error('[ServicesCatalog] update service error', error);
        const message =
          getGenericCallableErrorMessage(error) ??
          'No se pudo actualizar el servicio técnico.';
        showCallableErrorToast(message);
      } finally {
        setIsCreatingService(false);
      }
      return;
    }

    setIsCreatingService(true);
    try {
      await createTechnicalService(payload);
      toast.success('Servicio técnico creado correctamente.');
      setIsCreateServiceDialogOpen(false);
      setEditingRowId(null);
      setCreateServiceDraft(INITIAL_CREATE_SERVICE_DRAFT);
      setCreateServiceDraftBaseline(INITIAL_CREATE_SERVICE_DRAFT);
      setCreateServiceTouchedFields({});
      setCreateServiceSubmitAttempted(false);
      setActiveAutocompleteField(null);
      if (autocompleteBlurTimeoutRef.current !== null) {
        window.clearTimeout(autocompleteBlurTimeoutRef.current);
        autocompleteBlurTimeoutRef.current = null;
      }
      await loadRows();
    } catch (error) {
      console.error('[ServicesCatalog] create service error', error);
      const message =
        getGenericCallableErrorMessage(error) ??
        'No se pudo crear el servicio técnico.';
      showCallableErrorToast(message);
    } finally {
      setIsCreatingService(false);
    }
  };

  const panelMaxWidth = isMobile
    ? 'calc(100dvw - 1rem)'
    : state === 'collapsed'
      ? 'calc(100dvw - var(--sidebar-width-icon) - 2rem)'
      : 'calc(100dvw - var(--sidebar-width) - 2rem)';

  return (
    <div
      style={{ width: '100%', maxWidth: panelMaxWidth }}
      className='w-full min-w-0'
    >
      <Card className='w-full max-w-full min-w-0 overflow-hidden border'>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <CardTitle>Tabla técnica de servicios</CardTitle>
              <p className='text-muted-foreground mt-1 text-sm'>
                Edita campos técnicos y guarda cambios en lote vía Cloud
                Functions.
              </p>
            </div>

            <ServicesCatalogToolbarActions
              selectedRowsCount={selectedRowIds.length}
              dirtyRowsCount={dirtyIds.length}
              hasSingleSelectedRow={selectedRowIds.length === 1}
              isSaving={isSaving}
              isCreatingService={isCreatingService}
              isDeletingService={isDeletingService}
              onPrimaryAction={() => {
                if (selectedRowIds.length > 1) {
                  setSelectedRowIds([]);
                  return;
                }
                if (selectedRowIds.length === 0 && dirtyIds.length > 0) {
                  handleResetAllChanges();
                  return;
                }
                if (selectedRowIds.length === 1 && selectedRows[0]) {
                  handleEditRow(selectedRows[0]);
                  return;
                }
                handleOpenCreateServiceDialog();
              }}
              onRequestBulkDelete={() => setIsBulkDeleteDialogOpen(true)}
              onSaveChanges={handleSaveChanges}
            />
          </div>

          <ServicesCatalogFiltersBar
            query={query}
            onQueryChange={setQuery}
            hideColumnsFromTechnique={hideColumnsFromTechnique}
            onHideColumnsFromTechniqueChange={setHideColumnsFromTechnique}
            filteredRowsCount={filteredRows.length}
            dirtyRowsCount={dirtyIds.length}
          />
        </CardHeader>

        <CardContent className='min-w-0 space-y-3 overflow-x-hidden'>
          <ServicesCatalogTable
            hideColumnsFromTechnique={hideColumnsFromTechnique}
            visibleEditableColumns={visibleEditableColumns}
            allPageSelected={allPageSelected}
            hasSomePageSelected={hasSomePageSelected}
            onTogglePageSelection={togglePageSelection}
            onSortBy={handleSortBy}
            renderSortIcon={renderSortIcon}
            isLoading={isLoading}
            pageRows={pageRows}
            dirtySet={dirtySet}
            selectedRowIdsSet={selectedRowIdsSet}
            onToggleRowSelection={toggleRowSelection}
            onCellChange={handleCellChange}
            activeTableAutocomplete={activeTableAutocomplete}
            onCellFocus={handleTableCellFocus}
            onCellBlur={handleTableCellBlur}
            onCloseAutocomplete={handleCloseTableAutocomplete}
            getAutocompleteMatches={getAutocompleteMatches}
            onResetRow={handleResetRow}
            isSaving={isSaving}
            isCreatingService={isCreatingService}
            onEditRow={handleEditRow}
            onDuplicateRow={handleDuplicateRow}
            onRequestDeleteRow={setRowToDelete}
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />
        </CardContent>
      </Card>

      <ServicesCatalogCreateDialog
        open={isCreateServiceDialogOpen}
        onOpenChange={setIsCreateServiceDialogOpen}
        editingRowId={editingRowId}
        isCreatingService={isCreatingService}
        createServiceDraft={createServiceDraft}
        activeAutocompleteField={activeAutocompleteField}
        onFieldChange={handleCreateServiceFieldChange}
        onFieldFocus={handleCreateFieldFocus}
        onFieldBlur={handleCreateFieldBlur}
        onSelectAutocomplete={handleSelectCreateAutocomplete}
        getAutocompleteMatches={getCreateServiceAutocompleteMatches}
        isFieldInvalid={isCreateServiceFieldInvalid}
        onRequestClose={handleRequestCloseCreateServiceDialog}
        onSave={handleSaveServiceDialog}
      />

      <ServicesCatalogConfirmDialogs
        isDiscardCreateDialogOpen={isDiscardCreateDialogOpen}
        onSetDiscardCreateDialogOpen={setIsDiscardCreateDialogOpen}
        onConfirmDiscardCreateServiceDraft={handleConfirmDiscardCreateServiceDraft}
        isBulkDeleteDialogOpen={isBulkDeleteDialogOpen}
        onSetBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
        isRowDeleteDialogOpen={!!rowToDelete}
        onSetRowDeleteDialogOpen={(open) => {
          if (!open) {
            setRowToDelete(null);
          }
        }}
        isDeletingService={isDeletingService}
        selectedRowsCount={selectedRowIds.length}
        onConfirmBulkDeleteRows={handleConfirmBulkDeleteRows}
        onConfirmDeleteRow={handleConfirmDeleteRow}
      />
    </div>
  );
}
