'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import {
  ArrowDown,
  ArrowUp,
  DatabaseZap,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Undo2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import {
  backfillClientsFromRequests,
  createClient,
  deleteClient,
  saveClientChanges
} from '@/features/clients/services/client-callables';
import {
  buildClientRowFromDoc,
  CLIENT_EDITABLE_COLUMNS,
  CLIENT_REQUIRED_FIELDS,
  getChangedClientPatch,
  getClientDraftFromRow,
  INITIAL_CLIENT_DRAFT,
  normalizeClientDraft,
  normalizeForCompare,
  normalizeForSearch,
  PAGE_SIZE,
  type ClientDraft,
  type ClientEditableFieldKey,
  type ClientRow,
  type ClientSortableFieldKey,
  type SortDirection
} from '@/features/clients/lib/client-panel-model';
import { getGenericCallableErrorMessage } from '@/lib/callable-errors';
import { showCallableErrorToast } from '@/lib/callable-toast';
import { db } from '@/lib/firebase';

const CLIENT_FORM_FIELDS: Array<{
  key: keyof ClientDraft;
  label: string;
  placeholder?: string;
  type?: string;
  className?: string;
}> = [
  {
    key: 'businessName',
    label: 'Razón social',
    placeholder: 'CHAVEZ SOLUTIONS S.A.',
    className: 'md:col-span-2'
  },
  { key: 'taxId', label: 'RUC', placeholder: '1790000000001' },
  {
    key: 'contactName',
    label: 'Contacto',
    placeholder: 'Nombre y apellido'
  },
  { key: 'contactRole', label: 'Cargo', placeholder: 'Compras' },
  {
    key: 'email',
    label: 'Email',
    placeholder: 'cliente@empresa.com',
    type: 'email'
  },
  { key: 'phone', label: 'Teléfono', placeholder: '+593...' },
  { key: 'city', label: 'Ciudad', placeholder: 'Quito' },
  {
    key: 'address',
    label: 'Dirección',
    placeholder: 'Dirección fiscal',
    className: 'md:col-span-2'
  }
];

const sortRows = (
  rows: ClientRow[],
  sortKey: ClientSortableFieldKey | null,
  sortDirection: SortDirection
) => {
  if (!sortKey || !sortDirection) return rows;

  const sorted = [...rows].sort((a, b) =>
    a[sortKey].localeCompare(b[sortKey], 'es', { sensitivity: 'base' })
  );

  return sortDirection === 'desc' ? sorted.toReversed() : sorted;
};

export function ClientsPanel() {
  const { state, isMobile } = useSidebar();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [originalById, setOriginalById] = useState<Record<string, ClientRow>>(
    {}
  );
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMutatingClient, setIsMutatingClient] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<ClientSortableFieldKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowToDelete, setRowToDelete] = useState<ClientRow | null>(null);
  const [draft, setDraft] = useState<ClientDraft>(INITIAL_CLIENT_DRAFT);
  const [draftBaseline, setDraftBaseline] =
    useState<ClientDraft>(INITIAL_CLIENT_DRAFT);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const loadRows = async () => {
    setIsLoading(true);

    try {
      const snapshot = await getDocs(
        collection(db, FIRESTORE_COLLECTIONS.CLIENTS)
      );
      const loadedRows = snapshot.docs
        .map((docSnap) => buildClientRowFromDoc(docSnap.id, docSnap.data()))
        .sort((a, b) =>
          a.businessName.localeCompare(b.businessName, 'es', {
            sensitivity: 'base'
          })
        );
      const originalMap = loadedRows.reduce<Record<string, ClientRow>>(
        (acc, row) => {
          acc[row.id] = { ...row };
          return acc;
        },
        {}
      );

      setRows(loadedRows);
      setOriginalById(originalMap);
    } catch (error) {
      console.error('[ClientsPanel] load error', error);
      toast.error('No se pudo cargar el maestro de clientes.');
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
    const normalizedQuery = normalizeForSearch(query);
    if (!normalizedQuery) return rows;

    return rows.filter((row) => {
      const original = originalById[row.id];
      const searchable = CLIENT_EDITABLE_COLUMNS.map(({ key }) => {
        if (!original) return row[key];

        const currentValue = normalizeForCompare(row[key]);
        const originalValue = normalizeForCompare(original[key]);
        return currentValue === originalValue ? row[key] : original[key];
      }).join(' ');

      return normalizeForSearch(searchable).includes(normalizedQuery);
    });
  }, [rows, query, originalById]);

  const dirtyIds = useMemo(
    () =>
      rows
        .filter((row) => {
          const original = originalById[row.id];
          return Object.keys(getChangedClientPatch(row, original)).length > 0;
        })
        .map((row) => row.id),
    [rows, originalById]
  );

  const dirtySet = useMemo(() => new Set(dirtyIds), [dirtyIds]);
  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortKey, sortDirection),
    [filteredRows, sortKey, sortDirection]
  );
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, currentPage]);

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

  const hasDraftChanges = useMemo(
    () =>
      Object.entries(draft).some(([key, value]) => {
        const baselineValue = draftBaseline[key as keyof ClientDraft];
        return value.trim() !== baselineValue.trim();
      }),
    [draft, draftBaseline]
  );

  const handleSortBy = (key: ClientSortableFieldKey) => {
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

  const renderSortIcon = (key: ClientSortableFieldKey) => {
    if (sortKey !== key || !sortDirection) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp className='h-3.5 w-3.5 opacity-80' />
    ) : (
      <ArrowDown className='h-3.5 w-3.5 opacity-80' />
    );
  };

  const handleCellChange = (
    rowId: string,
    field: ClientEditableFieldKey,
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
      if (checked) return [...new Set([...prev, ...pageRowIds])];

      const pageSet = new Set(pageRowIds);
      return prev.filter((id) => !pageSet.has(id));
    });
  };

  const openCreateDialog = () => {
    setEditingRowId(null);
    setDraft(INITIAL_CLIENT_DRAFT);
    setDraftBaseline(INITIAL_CLIENT_DRAFT);
    setSubmitAttempted(false);
    setIsClientDialogOpen(true);
  };

  const openEditDialog = (row: ClientRow) => {
    const nextDraft = getClientDraftFromRow(row);
    setEditingRowId(row.id);
    setDraft(nextDraft);
    setDraftBaseline(nextDraft);
    setSubmitAttempted(false);
    setIsClientDialogOpen(true);
  };

  const closeClientDialog = () => {
    if (hasDraftChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }

    setIsClientDialogOpen(false);
    setEditingRowId(null);
    setDraft(INITIAL_CLIENT_DRAFT);
    setDraftBaseline(INITIAL_CLIENT_DRAFT);
    setSubmitAttempted(false);
  };

  const discardDraft = () => {
    setIsDiscardDialogOpen(false);
    setIsClientDialogOpen(false);
    setEditingRowId(null);
    setDraft(INITIAL_CLIENT_DRAFT);
    setDraftBaseline(INITIAL_CLIENT_DRAFT);
    setSubmitAttempted(false);
  };

  const isFieldInvalid = (key: keyof ClientDraft) =>
    submitAttempted &&
    CLIENT_REQUIRED_FIELDS.includes(key) &&
    !draft[key].trim();

  const saveDialog = async () => {
    setSubmitAttempted(true);
    const payload = normalizeClientDraft(draft);
    const missingFields = CLIENT_REQUIRED_FIELDS.filter(
      (field) => !payload[field]
    );
    if (missingFields.length > 0) {
      toast.error('Completa los campos obligatorios antes de guardar.');
      return;
    }

    setIsMutatingClient(true);
    try {
      if (editingRowId) {
        const row = rows.find((entry) => entry.id === editingRowId);
        if (!row) {
          toast.error('No se encontró el cliente para editar.');
          return;
        }

        await saveClientChanges(
          [
            {
              id: editingRowId,
              patch: payload,
              lastKnownUpdatedAt: row.updatedAtISO
            }
          ],
          'Edición desde diálogo de cliente'
        );
        toast.success('Cliente actualizado correctamente.');
      } else {
        await createClient(payload);
        toast.success('Cliente creado correctamente.');
      }

      setIsClientDialogOpen(false);
      setEditingRowId(null);
      setDraft(INITIAL_CLIENT_DRAFT);
      setDraftBaseline(INITIAL_CLIENT_DRAFT);
      setSubmitAttempted(false);
      await loadRows();
    } catch (error) {
      console.error('[ClientsPanel] save dialog error', error);
      const message =
        getGenericCallableErrorMessage(error) ??
        'No se pudo guardar el cliente.';
      showCallableErrorToast(message);
    } finally {
      setIsMutatingClient(false);
    }
  };

  const saveInlineChanges = async () => {
    const changes = rows
      .map((row) => {
        const original = originalById[row.id];
        const patch = getChangedClientPatch(row, original);
        if (Object.keys(patch).length === 0) return null;

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
      const result = await saveClientChanges(
        changes,
        'Edición inline desde Admin. Clientes'
      );
      if (result.updated > 0) {
        toast.success(
          `Cambios guardados: ${result.updated} cliente${result.updated === 1 ? '' : 's'}.`
        );
      } else {
        toast.info('No se aplicaron cambios.');
      }

      if (result.conflicts.length > 0) {
        toast.warning(
          `${result.conflicts.length} conflicto(s): recarga clientes y reintenta.`
        );
      }

      if (result.notFound.length > 0 || result.invalid.length > 0) {
        toast.warning('Algunos cambios no se pudieron aplicar.');
      }

      await loadRows();
    } catch (error) {
      console.error('[ClientsPanel] save inline error', error);
      const message =
        getGenericCallableErrorMessage(error) ??
        'No se pudieron guardar los cambios.';
      showCallableErrorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteRow = async () => {
    if (!rowToDelete) return;

    setIsMutatingClient(true);
    try {
      await deleteClient(rowToDelete.id);
      toast.success(`Cliente ${rowToDelete.businessName} eliminado.`);
      setRowToDelete(null);
      await loadRows();
    } catch (error) {
      console.error('[ClientsPanel] delete error', error);
      const message =
        getGenericCallableErrorMessage(error) ??
        'No se pudo eliminar el cliente.';
      showCallableErrorToast(message);
    } finally {
      setIsMutatingClient(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;

    setIsMutatingClient(true);
    try {
      const results = await Promise.allSettled(
        selectedRowIds.map(async (id) => deleteClient(id))
      );
      const deleted = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const failed = results.length - deleted;

      if (deleted > 0) {
        toast.success(
          `${deleted} cliente${deleted === 1 ? '' : 's'} eliminado${deleted === 1 ? '' : 's'}.`
        );
      }

      if (failed > 0) {
        toast.error(
          `No se pudieron eliminar ${failed} cliente${failed === 1 ? '' : 's'}.`
        );
      }

      setIsBulkDeleteDialogOpen(false);
      setSelectedRowIds([]);
      await loadRows();
    } catch (error) {
      console.error('[ClientsPanel] bulk delete error', error);
      toast.error('No se pudieron eliminar los clientes seleccionados.');
    } finally {
      setIsMutatingClient(false);
    }
  };

  const handleBackfill = async () => {
    setIsBackfilling(true);
    try {
      const result = await backfillClientsFromRequests();
      toast.success(
        `Backfill completo: ${result.importedCount} importados, ${result.skippedExisting} existentes, ${result.skippedInvalid} omitidos.`
      );
      await loadRows();
    } catch (error) {
      console.error('[ClientsPanel] backfill error', error);
      const message =
        getGenericCallableErrorMessage(error) ??
        'No se pudo importar clientes desde solicitudes.';
      showCallableErrorToast(message);
    } finally {
      setIsBackfilling(false);
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
              <CardTitle>Lista de Clientes</CardTitle>
              <p className='text-muted-foreground mt-1 text-sm'>
                Consulta y edita la información de los clientes.
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='cursor-pointer'
                disabled={isSaving || isMutatingClient || isBackfilling}
                onClick={() => {
                  if (selectedRowIds.length > 1) {
                    setSelectedRowIds([]);
                    return;
                  }

                  if (selectedRowIds.length === 1 && selectedRows[0]) {
                    openEditDialog(selectedRows[0]);
                    return;
                  }

                  if (dirtyIds.length > 0) {
                    handleResetAllChanges();
                    return;
                  }

                  openCreateDialog();
                }}
              >
                {selectedRowIds.length === 1 ? (
                  <Pencil className='h-4 w-4' />
                ) : dirtyIds.length > 0 ? (
                  <Undo2 className='h-4 w-4' />
                ) : (
                  <Plus className='h-4 w-4' />
                )}
                {selectedRowIds.length > 1
                  ? 'Deseleccionar todos'
                  : selectedRowIds.length === 1
                    ? 'Editar cliente'
                    : dirtyIds.length > 0
                      ? 'Deshacer cambios'
                      : 'Agregar cliente'}
              </Button>
              {selectedRowIds.length > 0 ? (
                <Button
                  type='button'
                  size='sm'
                  className='cursor-pointer bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white dark:hover:bg-black/90'
                  disabled={isSaving || isMutatingClient || isBackfilling}
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className='h-4 w-4' />
                  Eliminar cliente(s)
                </Button>
              ) : (
                <Button
                  type='button'
                  size='sm'
                  disabled={
                    isSaving ||
                    isMutatingClient ||
                    isBackfilling ||
                    dirtyIds.length === 0
                  }
                  onClick={saveInlineChanges}
                >
                  {isSaving ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Save className='h-4 w-4' />
                  )}
                  Guardar cambios ({dirtyIds.length})
                </Button>
              )}
            </div>
          </div>

          <div className='mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
            <div className='relative w-full max-w-xl'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                value={query}
                placeholder='Buscar por razón social, contacto o email...'
                className='pr-9 pl-9'
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
              {query.trim().length > 0 ? (
                <button
                  type='button'
                  aria-label='Limpiar búsqueda'
                  className='text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer transition-colors'
                  onClick={() => setQuery('')}
                >
                  <X className='h-4 w-4' />
                </button>
              ) : null}
            </div>
            <p className='text-muted-foreground text-sm md:shrink-0'>
              {filteredRows.length} resultados · {dirtyIds.length} con cambios
            </p>
          </div>
        </CardHeader>

        <CardContent className='min-w-0 space-y-3 overflow-x-hidden'>
          <div className='w-full max-w-full min-w-0 overflow-visible rounded-md border'>
            <Table className='min-w-[118rem]'>
              <TableHeader>
                <TableRow>
                  <TableHead className='min-w-[2.75rem]'>
                    <div className='flex items-center justify-center'>
                      <Checkbox
                        className='bg-background cursor-pointer !border-[#9a9a9a] shadow-none dark:!border-[#5f5f5f]'
                        checked={
                          allPageSelected
                            ? true
                            : hasSomePageSelected
                              ? 'indeterminate'
                              : false
                        }
                        aria-label='Seleccionar clientes visibles'
                        onCheckedChange={(checked) =>
                          togglePageSelection(checked === true)
                        }
                      />
                    </div>
                  </TableHead>
                  {CLIENT_EDITABLE_COLUMNS.map((column) => (
                    <TableHead key={column.key} className={column.minWidth}>
                      <button
                        type='button'
                        className='inline-flex cursor-pointer items-center gap-1.5'
                        onClick={() => handleSortBy(column.key)}
                      >
                        {column.label}
                        {renderSortIcon(column.key)}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className='min-w-[5rem] text-right font-bold'>
                    Deshacer
                  </TableHead>
                  <TableHead className='w-[3.5rem] min-w-[3.5rem] text-right'>
                    <span className='sr-only'>Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <TableRow key={`client-skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className='mx-auto h-4 w-4 rounded-sm' />
                      </TableCell>
                      {CLIENT_EDITABLE_COLUMNS.map((column) => (
                        <TableCell
                          key={`client-skeleton-${index}-${column.key}`}
                        >
                          <Skeleton className='h-8 w-full' />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Skeleton className='ml-auto h-8 w-8 rounded-md' />
                      </TableCell>
                      <TableCell>
                        <Skeleton className='ml-auto h-8 w-8 rounded-md' />
                      </TableCell>
                    </TableRow>
                  ))
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={CLIENT_EDITABLE_COLUMNS.length + 3}
                      className='text-muted-foreground py-6 pl-7 text-left text-sm'
                    >
                      No se encontraron clientes con ese criterio.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => {
                    const isDirty = dirtySet.has(row.id);

                    return (
                      <TableRow
                        key={row.id}
                        className={
                          isDirty ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                        }
                      >
                        <TableCell>
                          <div className='flex items-center justify-center'>
                            <Checkbox
                              className='bg-background cursor-pointer !border-[#9a9a9a] shadow-none dark:!border-[#5f5f5f]'
                              checked={selectedRowIdsSet.has(row.id)}
                              aria-label={`Seleccionar cliente ${row.businessName || row.id}`}
                              onCheckedChange={(checked) =>
                                toggleRowSelection(row.id, checked === true)
                              }
                            />
                          </div>
                        </TableCell>
                        {CLIENT_EDITABLE_COLUMNS.map((column) => (
                          <TableCell key={`${row.id}-${column.key}`}>
                            <Input
                              value={row[column.key]}
                              className='h-8'
                              type={column.key === 'email' ? 'email' : 'text'}
                              onChange={(event) =>
                                handleCellChange(
                                  row.id,
                                  column.key,
                                  event.target.value
                                )
                              }
                            />
                          </TableCell>
                        ))}
                        <TableCell className='text-right'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 cursor-pointer'
                            disabled={!isDirty || isSaving || isMutatingClient}
                            onClick={() => handleResetRow(row.id)}
                          >
                            <Undo2 className='h-4 w-4' />
                            <span className='sr-only'>Deshacer fila</span>
                          </Button>
                        </TableCell>
                        <TableCell className='text-right'>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 cursor-pointer'
                              >
                                <MoreVertical className='h-4 w-4' />
                                <span className='sr-only'>
                                  Acciones del cliente
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem
                                className='cursor-pointer'
                                onClick={() => openEditDialog(row)}
                              >
                                <Pencil className='h-4 w-4' />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className='cursor-pointer text-red-600 focus:text-red-600'
                                onClick={() => setRowToDelete(row)}
                              >
                                <Trash2 className='h-4 w-4' />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className='flex items-center justify-between gap-3'>
            <p className='text-muted-foreground text-sm'>
              Página {currentPage} de {totalPages}
            </p>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='cursor-pointer'
                disabled={currentPage <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='cursor-pointer'
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isClientDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsClientDialogOpen(true);
            return;
          }

          closeClientDialog();
        }}
      >
        <DialogContent
          className='w-[min(96vw,760px)] !max-w-[760px] overflow-hidden p-0 sm:!max-w-[760px]'
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <div className='flex max-h-[90vh] flex-col'>
            <DialogHeader className='border-b px-6 py-5'>
              <DialogTitle className='flex items-center gap-2'>
                {editingRowId ? (
                  <Pencil className='text-muted-foreground h-4 w-4' />
                ) : (
                  <Plus className='h-4 w-4' />
                )}
                <span>
                  {editingRowId ? 'Editar cliente' : 'Agregar cliente'}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className='grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-6 py-5 md:grid-cols-2'>
              {CLIENT_FORM_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className={`space-y-1.5 ${field.className ?? ''}`}
                >
                  <Label
                    htmlFor={`client-${field.key}`}
                    className='text-foreground/90 text-[11px] font-semibold tracking-[0.02em] uppercase'
                  >
                    {field.label}
                  </Label>
                  <Input
                    id={`client-${field.key}`}
                    value={draft[field.key]}
                    type={field.type ?? 'text'}
                    placeholder={field.placeholder}
                    className={`bg-background/90 h-9 ${
                      isFieldInvalid(field.key)
                        ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                        : ''
                    }`}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        [field.key]: event.target.value
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <DialogFooter className='border-t px-6 py-4 sm:justify-between'>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='cursor-pointer'
                  disabled={isMutatingClient}
                  onClick={closeClientDialog}
                >
                  Cancelar
                </Button>
                <Button
                  type='button'
                  className='cursor-pointer'
                  disabled={isMutatingClient}
                  onClick={saveDialog}
                >
                  {isMutatingClient ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : null}
                  {editingRowId ? 'Actualizar cliente' : 'Guardar cliente'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDiscardDialogOpen}
        onOpenChange={setIsDiscardDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar cambios</AlertDialogTitle>
            <AlertDialogDescription>
              Hay información escrita en el formulario. ¿Desea cerrar y perder
              los cambios?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90 dark:bg-red-800 dark:text-white dark:hover:bg-red-700'
              onClick={discardDraft}
            >
              Descartar y cerrar
            </AlertDialogAction>
            <AlertDialogCancel className='cursor-pointer'>
              Seguir editando
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isMutatingClient) setIsBulkDeleteDialogOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar clientes seleccionados</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar {selectedRowIds.length} cliente
              {selectedRowIds.length === 1 ? '' : 's'}? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isMutatingClient}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white dark:hover:bg-black/90'
              disabled={isMutatingClient || selectedRowIds.length === 0}
              onClick={confirmBulkDelete}
            >
              {isMutatingClient ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(rowToDelete)}
        onOpenChange={(open) => {
          if (!open && !isMutatingClient) setRowToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar este cliente del maestro comercial? Las
              proformas y OT históricas conservarán su snapshot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isMutatingClient}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white dark:hover:bg-black/90'
              disabled={isMutatingClient}
              onClick={confirmDeleteRow}
            >
              {isMutatingClient ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
