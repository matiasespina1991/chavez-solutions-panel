'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { Loader2, Plus, Save, Search, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { db } from '@/lib/firebase';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { saveServicesTechnicalChanges } from '@/features/admin/services/import-services';

type EditableFieldKey =
  | 'ID_PARAMETRO'
  | 'ID_MAT_ENSAYO'
  | 'ID_MATRIZ'
  | 'ID_NORMA'
  | 'ID_TABLA_NORMA'
  | 'ID_TECNICA'
  | 'ID_MET_INTERNO'
  | 'ID_MET_REFERENCIA'
  | 'UNIDAD_INTERNO'
  | 'LIM_INF_INTERNO'
  | 'LIM_SUP_INTERNO'
  | 'PRECIO';

type ServiceCatalogRow = {
  id: string;
  updatedAtISO: string | null;
  ID_CONFIG_PARAMETRO: string;
  ID_PARAMETRO: string;
  ID_MAT_ENSAYO: string;
  ID_MATRIZ: string;
  ID_NORMA: string;
  ID_TABLA_NORMA: string;
  ID_TECNICA: string;
  ID_MET_INTERNO: string;
  ID_MET_REFERENCIA: string;
  UNIDAD_INTERNO: string;
  LIM_INF_INTERNO: string;
  LIM_SUP_INTERNO: string;
  PRECIO: string;
};

type CreateServiceDraft = {
  ID_CONFIG_PARAMETRO: string;
  ID_PARAMETRO: string;
  ID_CONDICION_PARAMETRO: string;
  ID_UBICACION: string;
  ID_MATRIZ: string;
  ID_MAT_ENSAYO: string;
  ID_NORMA: string;
  ID_TABLA_NORMA: string;
  ID_TECNICA: string;
  ID_MET_INTERNO: string;
  ID_MET_REFERENCIA: string;
  UNIDAD_INTERNO: string;
  UNIDAD_NORMA: string;
  LIM_INF_INTERNO: string;
  LIM_SUP_INTERNO: string;
  LIM_INF_NORMA: string;
  LIM_SUP_NORMA: string;
  PRECIO: string;
};

const INITIAL_CREATE_SERVICE_DRAFT: CreateServiceDraft = {
  ID_CONFIG_PARAMETRO: '',
  ID_PARAMETRO: '',
  ID_CONDICION_PARAMETRO: 'ACREDITADO',
  ID_UBICACION: '',
  ID_MATRIZ: '',
  ID_MAT_ENSAYO: '',
  ID_NORMA: '',
  ID_TABLA_NORMA: '',
  ID_TECNICA: '',
  ID_MET_INTERNO: '',
  ID_MET_REFERENCIA: '',
  UNIDAD_INTERNO: '',
  UNIDAD_NORMA: '',
  LIM_INF_INTERNO: '',
  LIM_SUP_INTERNO: '',
  LIM_INF_NORMA: '',
  LIM_SUP_NORMA: '',
  PRECIO: ''
};

const CREATE_SERVICE_SECTIONS: Array<{
  title: string;
  description: string;
  fieldsGridClass?: string;
  fields: Array<{
    key: keyof CreateServiceDraft;
    label: string;
    className?: string;
    placeholder?: string;
  }>;
}> = [
  {
    title: 'Identificación técnica',
    description:
      'Define el identificador del servicio y sus metadatos base para trazabilidad.',
    fields: [
      {
        key: 'ID_CONFIG_PARAMETRO',
        label: 'ID config parámetro',
        placeholder: '9bb504ee'
      },
      { key: 'ID_PARAMETRO', label: 'Parámetro', placeholder: 'Manganeso' },
      {
        key: 'ID_CONDICION_PARAMETRO',
        label: 'Condición del parámetro'
      },
      {
        key: 'ID_UBICACION',
        label: 'Ubicación',
        placeholder: 'MATRIZ QUITO'
      }
    ]
  },
  {
    title: 'Clasificación comercial',
    description:
      'Especifica la matriz, el material de ensayo y la normativa asociada al servicio.',
    fields: [
      {
        key: 'ID_MATRIZ',
        label: 'Matriz',
        placeholder: 'Análisis Físicos – Químicos en Aguas'
      },
      {
        key: 'ID_MAT_ENSAYO',
        label: 'Material de ensayo',
        placeholder: 'AGUAS RESIDUALES'
      },
      {
        key: 'ID_NORMA',
        label: 'Norma',
        placeholder: 'OM138-QUITO-NT002'
      },
      {
        key: 'ID_TABLA_NORMA',
        label: 'Tabla normativa',
        className: 'md:col-span-2',
        placeholder: 'TABLA No. A3. CRITERIOS DE CALIDAD...'
      }
    ]
  },
  {
    title: 'Método y técnica',
    description:
      'Completa el método interno/de referencia y la técnica de laboratorio aplicable.',
    fieldsGridClass: 'grid grid-cols-1 gap-3 md:grid-cols-2',
    fields: [
      {
        key: 'ID_TECNICA',
        label: 'Técnica',
        className: 'md:col-span-2',
        placeholder:
          'Ej: Espectrofotometría de Absorción Atómica, Llama Aire - Acetileno'
      },
      {
        key: 'ID_MET_INTERNO',
        label: 'Método interno',
        className: 'md:col-span-1 md:col-start-1',
        placeholder: 'PEE 48'
      },
      {
        key: 'ID_MET_REFERENCIA',
        label: 'Método de referencia',
        className: 'md:col-span-1 md:col-start-1',
        placeholder: 'EPA ...'
      }
    ]
  },
  {
    title: 'Rangos y unidades',
    description: 'Define rangos internos/de norma y unidades de referencia.',
    fieldsGridClass: 'grid grid-cols-1 gap-3 md:grid-cols-2',
    fields: [
      {
        key: 'UNIDAD_INTERNO',
        label: 'Unidad interna',
        placeholder: 'mg/L'
      },
      { key: 'UNIDAD_NORMA', label: 'Unidad norma', placeholder: 'mg/L' },
      {
        key: 'LIM_INF_INTERNO',
        label: 'Límite inferior interno',
        placeholder: '0.10'
      },
      {
        key: 'LIM_SUP_INTERNO',
        label: 'Límite superior interno',
        placeholder: '2.00'
      },
      {
        key: 'LIM_INF_NORMA',
        label: 'Límite inferior norma',
        placeholder: '0.10'
      },
      {
        key: 'LIM_SUP_NORMA',
        label: 'Límite superior norma',
        placeholder: '2.00'
      }
    ]
  }
];

const PAGE_SIZE = 25;

const EDITABLE_COLUMNS: Array<{
  key: EditableFieldKey;
  label: string;
  minWidth: string;
}> = [
  { key: 'ID_PARAMETRO', label: 'Parámetro', minWidth: 'min-w-[14rem]' },
  { key: 'ID_MAT_ENSAYO', label: 'Material', minWidth: 'min-w-[12rem]' },
  { key: 'ID_MATRIZ', label: 'Matriz', minWidth: 'min-w-[13rem]' },
  { key: 'ID_NORMA', label: 'Norma', minWidth: 'min-w-[12rem]' },
  { key: 'ID_TABLA_NORMA', label: 'Tabla', minWidth: 'min-w-[16rem]' },
  { key: 'ID_TECNICA', label: 'Técnica', minWidth: 'min-w-[14rem]' },
  { key: 'ID_MET_INTERNO', label: 'Método interno', minWidth: 'min-w-[12rem]' },
  {
    key: 'ID_MET_REFERENCIA',
    label: 'Método referencia',
    minWidth: 'min-w-[12rem]'
  },
  { key: 'UNIDAD_INTERNO', label: 'Unidad', minWidth: 'min-w-[8rem]' },
  { key: 'LIM_INF_INTERNO', label: 'Límite inf.', minWidth: 'min-w-[9rem]' },
  { key: 'LIM_SUP_INTERNO', label: 'Límite sup.', minWidth: 'min-w-[9rem]' },
  { key: 'PRECIO', label: 'Precio', minWidth: 'min-w-[8rem]' }
];

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}`;
  return '';
};

const toTimestampIso = (value: unknown): string | null => {
  if (value instanceof Timestamp) return value.toDate().toISOString();

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }

  return null;
};

const buildRowFromDoc = (
  id: string,
  data: Record<string, unknown>
): ServiceCatalogRow => ({
  id,
  updatedAtISO: toTimestampIso(data.updatedAt),
  ID_CONFIG_PARAMETRO: toStringValue(data.ID_CONFIG_PARAMETRO) || id,
  ID_PARAMETRO: toStringValue(data.ID_PARAMETRO),
  ID_MAT_ENSAYO: toStringValue(data.ID_MAT_ENSAYO),
  ID_MATRIZ: toStringValue(data.ID_MATRIZ),
  ID_NORMA: toStringValue(data.ID_NORMA),
  ID_TABLA_NORMA: toStringValue(data.ID_TABLA_NORMA),
  ID_TECNICA: toStringValue(data.ID_TECNICA),
  ID_MET_INTERNO: toStringValue(data.ID_MET_INTERNO),
  ID_MET_REFERENCIA: toStringValue(data.ID_MET_REFERENCIA),
  UNIDAD_INTERNO: toStringValue(data.UNIDAD_INTERNO),
  LIM_INF_INTERNO: toStringValue(data.LIM_INF_INTERNO),
  LIM_SUP_INTERNO: toStringValue(data.LIM_SUP_INTERNO),
  PRECIO: toStringValue(data.PRECIO)
});

const normalizeForCompare = (value: string): string => value.trim();

const getChangedPatch = (
  current: ServiceCatalogRow,
  original: ServiceCatalogRow | undefined
): Record<string, string | number | null> => {
  if (!original) return {};

  const patch: Record<string, string | number | null> = {};

  EDITABLE_COLUMNS.forEach(({ key }) => {
    const nextRaw = current[key];
    const prevRaw = original[key];

    if (key === 'PRECIO') {
      const nextNormalized = normalizeForCompare(nextRaw);
      const prevNormalized = normalizeForCompare(prevRaw);

      if (nextNormalized === prevNormalized) return;

      if (nextNormalized.length === 0) {
        patch.PRECIO = null;
        return;
      }

      const numeric = Number(nextNormalized.replace(',', '.'));
      if (!Number.isFinite(numeric)) {
        return;
      }

      patch.PRECIO = numeric;
      return;
    }

    const next = normalizeForCompare(nextRaw);
    const prev = normalizeForCompare(prevRaw);

    if (next !== prev) {
      patch[key] = next;
    }
  });

  return patch;
};

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
  const [isCreateServiceDialogOpen, setIsCreateServiceDialogOpen] =
    useState(false);
  const [isDiscardCreateDialogOpen, setIsDiscardCreateDialogOpen] =
    useState(false);
  const [createServiceDraft, setCreateServiceDraft] =
    useState<CreateServiceDraft>(INITIAL_CREATE_SERVICE_DRAFT);

  const loadRows = async () => {
    setIsLoading(true);

    try {
      const snapshot = await getDocs(collection(db, 'services'));

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

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;

    return rows.filter((row) => {
      const searchable = [
        row.ID_CONFIG_PARAMETRO,
        row.ID_PARAMETRO,
        row.ID_MAT_ENSAYO,
        row.ID_MATRIZ,
        row.ID_NORMA,
        row.ID_TABLA_NORMA,
        row.ID_TECNICA,
        row.ID_MET_INTERNO,
        row.ID_MET_REFERENCIA,
        row.UNIDAD_INTERNO
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [rows, query]);

  const dirtyIds = useMemo(() => {
    return rows
      .filter((row) => {
        const original = originalById[row.id];
        return Object.keys(getChangedPatch(row, original)).length > 0;
      })
      .map((row) => row.id);
  }, [rows, originalById]);

  const dirtySet = useMemo(() => new Set(dirtyIds), [dirtyIds]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

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

    const invalidPriceRows = changes.filter((change) => {
      if (!Object.prototype.hasOwnProperty.call(change.patch, 'PRECIO'))
        return false;
      const priceValue = change.patch.PRECIO;
      return priceValue !== null && typeof priceValue !== 'number';
    });

    if (invalidPriceRows.length > 0) {
      toast.error(
        'Hay filas con precio inválido. Revisa los valores numéricos.'
      );
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
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'No se pudieron guardar los cambios.';
      toast.error(message);
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

  const handleOpenCreateServiceDialog = () => {
    setCreateServiceDraft(INITIAL_CREATE_SERVICE_DRAFT);
    setIsCreateServiceDialogOpen(true);
  };

  const hasCreateServiceDraftChanges = useMemo(
    () =>
      Object.entries(createServiceDraft).some(([key, value]) => {
        const initialValue =
          INITIAL_CREATE_SERVICE_DRAFT[key as keyof CreateServiceDraft];
        return value.trim() !== initialValue.trim();
      }),
    [createServiceDraft]
  );

  const handleRequestCloseCreateServiceDialog = () => {
    if (hasCreateServiceDraftChanges) {
      setIsDiscardCreateDialogOpen(true);
      return;
    }

    setIsCreateServiceDialogOpen(false);
    setCreateServiceDraft(INITIAL_CREATE_SERVICE_DRAFT);
  };

  const handleConfirmDiscardCreateServiceDraft = () => {
    setIsDiscardCreateDialogOpen(false);
    setIsCreateServiceDialogOpen(false);
    setCreateServiceDraft(INITIAL_CREATE_SERVICE_DRAFT);
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

            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='cursor-pointer'
                onClick={handleOpenCreateServiceDialog}
                disabled={isSaving}
              >
                <Plus className='h-4 w-4' />
                Agregar servicio
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={handleSaveChanges}
                disabled={isSaving || dirtyIds.length === 0}
              >
                {isSaving ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Save className='h-4 w-4' />
                )}
                Guardar cambios ({dirtyIds.length})
              </Button>
            </div>
          </div>

          <div className='mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
            <div className='relative w-full max-w-xl'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Buscar por parámetro, norma, técnica, tabla o matriz...'
                className='pl-9'
              />
            </div>

            <p className='text-muted-foreground text-sm'>
              {filteredRows.length} resultados · {dirtyIds.length} con cambios
            </p>
          </div>
        </CardHeader>

        <CardContent className='min-w-0 space-y-3 overflow-x-hidden'>
          <div className='w-full max-w-full min-w-0 overflow-hidden rounded-md border'>
            <Table className='min-w-[170rem]'>
              <TableHeader>
                <TableRow>
                  <TableHead className='min-w-[11rem]'>ID Config</TableHead>
                  {EDITABLE_COLUMNS.map((column) => (
                    <TableHead key={column.key} className={column.minWidth}>
                      {column.label}
                    </TableHead>
                  ))}
                  <TableHead className='min-w-[10rem] text-right'>
                    Deshacer cambios
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={EDITABLE_COLUMNS.length + 2}>
                      <div className='text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Cargando catálogo...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={EDITABLE_COLUMNS.length + 2}
                      className='text-muted-foreground py-6 text-center text-sm'
                    >
                      No se encontraron servicios con ese criterio.
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
                        <TableCell className='font-mono text-xs'>
                          {row.ID_CONFIG_PARAMETRO || row.id}
                        </TableCell>

                        {EDITABLE_COLUMNS.map((column) => (
                          <TableCell key={`${row.id}-${column.key}`}>
                            <Input
                              value={row[column.key]}
                              onChange={(event) =>
                                handleCellChange(
                                  row.id,
                                  column.key,
                                  event.target.value
                                )
                              }
                              className='h-8'
                            />
                          </TableCell>
                        ))}

                        <TableCell className='text-right'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-8 px-2'
                            onClick={() => handleResetRow(row.id)}
                            disabled={!isDirty}
                          >
                            <Undo2 className='h-4 w-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className='flex items-center justify-between'>
            <p className='text-muted-foreground text-xs'>
              Página {currentPage} de {totalPages}
            </p>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={currentPage <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
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
        open={isCreateServiceDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsCreateServiceDialogOpen(true);
            return;
          }

          handleRequestCloseCreateServiceDialog();
        }}
      >
        <DialogContent
          className='w-[min(96vw,1280px)] !max-w-[1280px] overflow-hidden p-0 sm:!max-w-[1280px]'
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <div className='flex max-h-[90vh] flex-col'>
            <DialogHeader className='border-b px-6 py-5'>
              <DialogTitle>Agregar servicio</DialogTitle>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto px-6 py-5'>
              <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
                {CREATE_SERVICE_SECTIONS.map((section) => (
                  <section
                    key={section.title}
                    className='bg-muted/15 rounded-lg border px-4 py-3'
                  >
                    <div className='mb-3'>
                      <h3 className='text-sm font-semibold'>{section.title}</h3>
                      <p className='text-muted-foreground text-xs'>
                        {section.description}
                      </p>
                    </div>

                    <div
                      className={
                        section.fieldsGridClass ??
                        'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'
                      }
                    >
                      {section.fields.map((field) => (
                        <div
                          key={field.key}
                          className={`space-y-1.5 ${(field.className ?? '').replace('md:col-span-2', 'md:col-span-2 xl:col-span-2')}`}
                        >
                          <label
                            htmlFor={`new-service-${field.key}`}
                            className='text-foreground/90 text-[11px] font-semibold tracking-[0.02em] uppercase'
                          >
                            {field.label}
                          </label>
                          {field.key === 'ID_CONDICION_PARAMETRO' ? (
                            <Select
                              value={createServiceDraft.ID_CONDICION_PARAMETRO}
                              onValueChange={(value) =>
                                handleCreateServiceFieldChange(
                                  'ID_CONDICION_PARAMETRO',
                                  value
                                )
                              }
                            >
                              <SelectTrigger
                                id={`new-service-${field.key}`}
                                className='bg-background/90 h-9 w-full'
                              >
                                <SelectValue placeholder='ACREDITADO' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='ACREDITADO'>
                                  ACREDITADO
                                </SelectItem>
                                <SelectItem value='NO ACREDITADO'>
                                  NO ACREDITADO
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={`new-service-${field.key}`}
                              value={createServiceDraft[field.key]}
                              onChange={(event) =>
                                handleCreateServiceFieldChange(
                                  field.key,
                                  event.target.value
                                )
                              }
                              placeholder={field.placeholder}
                              className='bg-background/90 h-9'
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <DialogFooter className='border-t px-6 py-4 sm:justify-between'>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='cursor-pointer'
                  onClick={handleRequestCloseCreateServiceDialog}
                >
                  Cancelar
                </Button>
                <Button type='button' className='cursor-pointer'>
                  Guardar servicio
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDiscardCreateDialogOpen}
        onOpenChange={setIsDiscardCreateDialogOpen}
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
              className='cursor-pointer bg-red-600 text-white hover:bg-red-700'
              onClick={handleConfirmDiscardCreateServiceDraft}
            >
              Descartar y cerrar
            </AlertDialogAction>
            <AlertDialogCancel className='cursor-pointer'>
              Seguir editando
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
