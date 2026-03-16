'use client';

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
import { useSidebar } from '@/components/ui/sidebar';
import { cn, formatBytes } from '@/lib/utils';
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFileTypeCsv,
  IconRefresh,
  IconUpload
} from '@tabler/icons-react';
import { IconTrash, IconRotateClockwise } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import {
  importServicesFromCsv,
  listServiceHistory,
  restoreServiceHistory,
  deleteServiceHistory,
  ServiceHistoryEntry
} from '../services/import-services';

const PREVIEW_ROWS_PER_PAGE = 30;

interface CsvPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

const CSV_ACCEPT = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.csv']
};

const parseCsvRows = (csvContent: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let index = 0; index < csvContent.length; index += 1) {
    const character = csvContent[index];

    if (character === '"') {
      const nextCharacter = csvContent[index + 1];
      if (inQuotes && nextCharacter === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && csvContent[index + 1] === '\n') {
        index += 1;
      }

      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += character;
  }

  currentRow.push(currentField);
  rows.push(currentRow);

  return rows.filter((row) => row.some((value) => value.trim() !== ''));
};

const buildCsvPreview = (csvContent: string): CsvPreviewData => {
  const rows = parseCsvRows(csvContent);

  if (!rows.length) {
    return {
      headers: [],
      rows: [],
      totalRows: 0
    };
  }

  const headers = rows[0].map((header: string, index: number) => {
    const normalized = header.trim();
    if (index === 0) return normalized.replace(/^\uFEFF/, '');
    return normalized;
  });

  const dataRows = rows
    .slice(1)
    .filter((row) => row.some((value) => value.trim() !== ''));

  return {
    headers,
    rows: dataRows,
    totalRows: dataRows.length
  };
};

const headerLabelMap: Record<string, string> = {
  ID_CONFIG_PARAMETRO: 'Parámetro (ID)',
  ID_UBICACION: 'Ubicación',
  ID_NORMA: 'Norma',
  ID_TABLA_NORMA: 'Tabla',
  ID_MATRIZ: 'Matriz',
  ID_MAT_ENSAYO: 'Matriz de ensayo',
  ID_PARAMETRO: 'Parámetro',
  ID_CONDICION_PARAMETRO: 'Condición',
  ID_TECNICA: 'Técnica',
  ID_MET_INTERNO: 'Método interno',
  UNIDAD_INTERNO: 'Unidad interna',
  LIM_INF_INTERNO: 'Límite inferior interno',
  LIM_SUP_INTERNO: 'Límite superior interno',
  ID_MET_REFERENCIA: 'Método de referencia',
  UNIDAD_NORMA: 'Unidad',
  LIM_INF_NORMA: 'Límite inferior',
  LIM_SUP_NORMA: 'Límite superior',
  // mantener ID visible de forma explícita también opcionalmente
  ID: 'ID de servicio'
};

const getHeaderLabel = (header: string): string =>
  headerLabelMap[header] ??
  header
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

const getRejectionMessage = (rejection: FileRejection) => {
  if (!rejection.errors.length) {
    return `No se pudo cargar el archivo ${rejection.file.name}.`;
  }

  const hasTypeError = rejection.errors.some(
    (error) => error.code === 'file-invalid-type'
  );

  if (hasTypeError) {
    return `El archivo ${rejection.file.name} no es CSV válido.`;
  }

  return `No se pudo cargar el archivo ${rejection.file.name}.`;
};

export function ImportServicesPanel() {
  const { state, isMobile } = useSidebar();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [isParsingPreview, setIsParsingPreview] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedTimelineEntry, setSelectedTimelineEntry] =
    useState<ServiceHistoryEntry | null>(null);
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [historyEntries, setHistoryEntries] = useState<ServiceHistoryEntry[]>(
    []
  );
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRestoreInProgress, setIsRestoreInProgress] = useState(false);
  const [isHistoryActionInProgress, setIsHistoryActionInProgress] =
    useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        rejected.forEach((rejection) => {
          toast.error(getRejectionMessage(rejection));
        });
      }

      if (!acceptedFiles.length) return;

      const nextFile = acceptedFiles[0];
      const wasReplacing = Boolean(selectedFile);
      setSelectedFile(nextFile);
      setCsvPreview(null);
      setPreviewPage(1);

      toast.success(
        wasReplacing
          ? `Archivo reemplazado: ${nextFile.name}`
          : `Archivo cargado: ${nextFile.name}`
      );

      void (async () => {
        try {
          setIsParsingPreview(true);
          const csvContent = await nextFile.text();
          const preview = buildCsvPreview(csvContent);
          setCsvPreview(preview);
        } catch (error) {
          console.error('[Admin] preview parse error', error);
          setCsvPreview(null);
          toast.error('No se pudo generar la vista previa del CSV.');
        } finally {
          setIsParsingPreview(false);
        }
      })();
    },
    [selectedFile]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: CSV_ACCEPT,
    maxFiles: 1,
    multiple: false,
    disabled: isImporting,
    noClick: Boolean(selectedFile),
    noKeyboard: Boolean(selectedFile)
  });

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { entries, currentHistoryId: currentId } =
        await listServiceHistory();
      setHistoryEntries(entries);
      setCurrentHistoryId(currentId);
    } catch (error) {
      console.error('[Admin] list service history error', error);
      toast.error('No se pudo cargar el historial de versiones.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRestoreHistory = async (historyId: string) => {
    setIsRestoreInProgress(true);
    try {
      await restoreServiceHistory(historyId);
      toast.success('Versión restaurada correctamente.');
      await fetchHistory();
    } catch (error) {
      console.error('[Admin] restore service history error', error);
      const message =
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'No se pudo restaurar la versión.';
      toast.error(message);
    } finally {
      setIsRestoreInProgress(false);
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    setIsHistoryActionInProgress(true);
    try {
      await deleteServiceHistory(historyId);
      toast.success('Versión eliminada.');
      await fetchHistory();
    } catch (error) {
      console.error('[Admin] delete service history error', error);
      const message =
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'No se pudo eliminar la versión.';
      toast.error(message);
    } finally {
      setIsHistoryActionInProgress(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, []);

  const handleTimelineRestore = async () => {
    if (!selectedTimelineEntry) return;
    setIsTimelineDialogOpen(false);
    await handleRestoreHistory(selectedTimelineEntry.id);
    setSelectedTimelineEntry(null);
  };

  const handleTimelineDelete = async () => {
    if (!selectedTimelineEntry) return;
    setIsTimelineDialogOpen(false);
    await handleDeleteHistory(selectedTimelineEntry.id);
    setSelectedTimelineEntry(null);
  };

  // Nested confirmation state
  const [pendingAction, setPendingAction] = useState<
    'restore' | 'delete' | null
  >(null);
  const [isActionConfirmOpen, setIsActionConfirmOpen] = useState(false);

  const handleConfirmUpdate = async () => {
    if (!selectedFile) return;

    try {
      setIsImporting(true);
      const csvContent = await selectedFile.text();

      if (!csvContent.trim()) {
        toast.error('El archivo CSV está vacío.');
        return;
      }

      const result = await importServicesFromCsv(csvContent, selectedFile.name);

      toast.success(
        `Servicios actualizados correctamente (${result.importedCount} registros).`
      );
      setIsConfirmDialogOpen(false);
      await fetchHistory();
    } catch (error) {
      console.error('[Admin] import services error', error);
      const message =
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'No se pudo actualizar la colección de servicios.';

      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const panelMaxWidth = isMobile
    ? 'calc(100dvw - 1rem)'
    : state === 'collapsed'
      ? 'calc(100dvw - var(--sidebar-width-icon) - 2rem)'
      : 'calc(100dvw - var(--sidebar-width) - 2rem)';

  const previewTableHeight = isMobile
    ? 'calc(100dvh - 30rem)'
    : 'calc(100dvh - 25rem)';

  const rowsPerPage = PREVIEW_ROWS_PER_PAGE;
  const totalRows = csvPreview?.totalRows ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const currentPage = Math.min(previewPage, pageCount);
  const paginatedRows =
    csvPreview?.rows.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    ) ?? [];

  const getColumnWidth = (header: string): React.CSSProperties => {
    if (header === 'ID_TABLA_NORMA') {
      return { minWidth: '450px', width: '450px' };
    }

    if (header === 'ID_CONFIG_PARAMETRO') {
      return { minWidth: '80px', width: '80px' };
    }

    if (header === 'ID_TECNICA') {
      return { minWidth: '300px', width: '300px' };
    }

    if (header === 'ID_MATRIZ') {
      return { minWidth: '200px', width: '200px' };
    }

    return { minWidth: '140px' };
  };

  const formatHistoryDate = (value?: string | number | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    const dateFormatter = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const timeFormatter = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const datePart = dateFormatter.format(date);
    const dateCapitalized =
      datePart.charAt(0).toUpperCase() + datePart.slice(1);
    const timePart = timeFormatter.format(date);

    return `${dateCapitalized}, ${timePart} hs`;
  };

  return (
    <>
      <div
        className='flex w-full flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-start'
        style={{
          width: '100%',
          maxWidth: panelMaxWidth,
          paddingTop: 0,
          paddingRight: 0,
          paddingLeft: 0,
          paddingBottom: '2rem'
        }}
      >
        <div className='flex min-w-0 flex-col gap-4 lg:h-auto'>
          <Card className='w-full flex-none lg:w-[40rem]'>
            <CardHeader>
              <CardTitle>Importar servicios</CardTitle>
              <p className='text-muted-foreground text-sm'>
                Cargá un archivo CSV para reemplazar completamente la colección
                de servicios en Firestore.
              </p>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div
                {...getRootProps()}
                className={cn(
                  'border-muted-foreground/25 bg-background hover:bg-muted/30 rounded-lg border-2 border-dashed px-6 py-5 transition-colors duration-200',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
                  isDragActive && 'border-muted-foreground/50',
                  isImporting && 'pointer-events-none opacity-70'
                )}
              >
                <input {...getInputProps()} />

                {!selectedFile ? (
                  <div className='flex min-h-[9rem] flex-col items-center justify-center gap-3 text-center'>
                    <span className='bg-muted inline-flex h-10 w-10 items-center justify-center rounded-full border'>
                      <IconUpload className='text-muted-foreground h-5 w-5' />
                    </span>
                    <div className='space-y-1'>
                      <p className='text-sm font-medium'>
                        Arrastrá y soltá un archivo CSV acá o hacé clic para
                        seleccionarlo
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        Solo se aceptan archivos CSV (.csv)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='flex min-h-[9rem] flex-col items-center justify-center gap-3 text-center'>
                    <span className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10'>
                      <IconCheck className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                    </span>
                    <div className='space-y-1'>
                      <p className='inline-flex items-center gap-2 text-sm font-medium'>
                        <IconFileTypeCsv className='h-4 w-4' />
                        {selectedFile.name}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='cursor-pointer'
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        open();
                      }}
                      disabled={isImporting}
                    >
                      Reemplazar archivo
                    </Button>
                  </div>
                )}
              </div>

              <div className='flex justify-end'>
                <Button
                  type='button'
                  className='cursor-pointer'
                  onClick={() => setIsConfirmDialogOpen(true)}
                  disabled={!selectedFile || isImporting}
                >
                  {isImporting ? (
                    <span className='inline-flex items-center gap-2'>
                      <IconRefresh className='h-4 w-4 animate-spin' />
                      Actualizando servicios...
                    </span>
                  ) : (
                    'Actualizar servicios'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='w-full lg:w-[340px]'>
          <Card className='w-full'>
            <CardHeader>
              <CardTitle>Historial de versiones</CardTitle>
              <p className='text-muted-foreground text-sm'>
                Guarda y recupera versiones previas llenadas por CSV.
              </p>
            </CardHeader>
            <CardContent className='space-y-2'>
              {isLoadingHistory ? (
                <div className='text-muted-foreground p-4 text-sm'>
                  Cargando historial...
                </div>
              ) : historyEntries.length === 0 ? (
                <div className='text-muted-foreground p-4 text-sm'>
                  No hay versiones disponibles.
                </div>
              ) : (
                <div className='overflow-visible pr-2'>
                  <ul className='relative border-l-2 border-slate-200 pl-4 dark:border-slate-700'>
                    {historyEntries.map((entry) => (
                      <li key={entry.id} className='mb-6 ml-4'>
                        <span className='absolute -left-2'>
                          {entry.isCurrent ? (
                            <span className='inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-1 ring-slate-200 dark:ring-slate-700'>
                              <IconCheck className='h-3 w-3' />
                            </span>
                          ) : (
                            <button
                              type='button'
                              aria-label={`Opciones de la versión ${entry.id}`}
                              className='inline-flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-slate-200 hover:cursor-pointer dark:ring-slate-700'
                              onClick={() => {
                                setSelectedTimelineEntry(entry);
                                setIsTimelineDialogOpen(true);
                              }}
                            >
                              <span className='inline-block h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500' />
                            </button>
                          )}
                        </span>

                        <div className='flex items-start justify-between gap-3'>
                          <div className='text-sm'>
                            <div className='font-medium'>
                              {entry.createdAt
                                ? formatHistoryDate(entry.createdAt)
                                : entry.id}
                              {entry.isCurrent ? ' (activo)' : ''}
                            </div>
                            <div className='text-muted-foreground text-xs break-words'>
                              {entry.fileName || '-'} • {entry.serviceCount}{' '}
                              registros
                            </div>
                          </div>

                          <div className='flex flex-shrink-0 items-center gap-2'>
                            {/* Removed inline action buttons - actions are in timeline dialog */}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedFile ? (
        <div
          style={{ width: '100%', maxWidth: panelMaxWidth }}
          className='w-full'
        >
          <Card className='w-full'>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between gap-2'>
                <CardTitle className='text-base'>
                  Vista previa del CSV
                </CardTitle>
                {csvPreview ? (
                  <p className='text-muted-foreground text-xs'>
                    {csvPreview.totalRows} filas detectadas
                  </p>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className='space-y-2'>
              <div className='max-w-full overflow-hidden rounded-md border'>
                <div
                  className='w-full overflow-x-auto'
                  style={{
                    minHeight: '35rem',
                    maxHeight: previewTableHeight
                  }}
                >
                  {isParsingPreview ? (
                    <div className='text-muted-foreground p-6 text-sm'>
                      Generando vista previa...
                    </div>
                  ) : csvPreview?.headers.length ? (
                    <table className='w-max min-w-[1100px] text-left text-sm'>
                      <thead className='bg-muted text-muted-foreground sticky top-0 z-10'>
                        <tr>
                          {csvPreview.headers.map(
                            (header: string, index: number) => (
                              <th
                                key={`${header}-${index}`}
                                className='px-4 py-3 font-medium whitespace-nowrap'
                                style={getColumnWidth(header)}
                              >
                                {getHeaderLabel(header) ||
                                  `Columna ${index + 1}`}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.length ? (
                          paginatedRows.map(
                            (row: string[], rowIndex: number) => (
                              <tr
                                key={`preview-row-${(currentPage - 1) * rowsPerPage + rowIndex}`}
                                className='border-t'
                              >
                                {csvPreview!.headers.map(
                                  (header: string, colIndex: number) => (
                                    <td
                                      key={`preview-cell-${(currentPage - 1) * rowsPerPage + rowIndex}-${header}-${colIndex}`}
                                      className='px-4 py-2 align-top whitespace-nowrap'
                                      style={getColumnWidth(header)}
                                    >
                                      {row[colIndex] || '—'}
                                    </td>
                                  )
                                )}
                              </tr>
                            )
                          )
                        ) : (
                          <tr className='border-t'>
                            <td
                              className='text-muted-foreground px-4 py-6 text-center'
                              colSpan={csvPreview.headers.length}
                            >
                              El archivo no contiene filas de datos.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div className='text-muted-foreground p-6 text-sm'>
                      No se pudo generar una vista previa del archivo.
                    </div>
                  )}
                </div>
              </div>

              {csvPreview ? (
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <p className='text-muted-foreground text-xs'>
                    Mostrando{' '}
                    {Math.min((currentPage - 1) * rowsPerPage + 1, totalRows)} -{' '}
                    {Math.min(currentPage * rowsPerPage, totalRows)} de{' '}
                    {totalRows} filas.
                  </p>
                  {totalRows > rowsPerPage ? (
                    <div className='flex items-center gap-2 text-xs'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={currentPage <= 1}
                        onClick={() =>
                          setPreviewPage((prev) => Math.max(1, prev - 1))
                        }
                        aria-label='Página anterior'
                      >
                        <IconChevronLeft className='h-4 w-4' />
                      </Button>
                      <span className='text-muted-foreground'>
                        Página {currentPage} de {pageCount}
                      </span>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={currentPage >= pageCount}
                        onClick={() =>
                          setPreviewPage((prev) =>
                            Math.min(pageCount, prev + 1)
                          )
                        }
                        aria-label='Página siguiente'
                      >
                        <IconChevronRight className='h-4 w-4' />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <AlertDialog
        open={isConfirmDialogOpen}
        onOpenChange={(open) => {
          if (isImporting) return;
          setIsConfirmDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar actualización de servicios
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción reemplazará completamente los documentos actuales de
              la colección services con los datos del CSV cargado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isImporting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer'
              onClick={handleConfirmUpdate}
              disabled={isImporting || !selectedFile}
            >
              {isImporting ? 'Actualizando…' : 'Aceptar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isTimelineDialogOpen}
        onOpenChange={(open) => setIsTimelineDialogOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opciones de la versión</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTimelineEntry ? (
                <div>
                  <div className='text-xs font-medium'>
                    {selectedTimelineEntry.createdAt
                      ? formatHistoryDate(selectedTimelineEntry.createdAt)
                      : selectedTimelineEntry.id}
                    {selectedTimelineEntry.isCurrent ? ' (activo)' : ''}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {selectedTimelineEntry.fileName || '-'} •{' '}
                    {selectedTimelineEntry.serviceCount} registros
                  </div>
                </div>
              ) : (
                'No hay versión seleccionada.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex items-center gap-2'>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-700/20 bg-black px-3 py-2 text-white hover:bg-black dark:border-slate-600/40 dark:bg-sky-500 dark:text-white dark:hover:bg-sky-500'
              onClick={() => {
                // open confirmation for restore
                setPendingAction('restore');
                setIsActionConfirmOpen(true);
              }}
              disabled={
                !selectedTimelineEntry ||
                isRestoreInProgress ||
                isHistoryActionInProgress
              }
            >
              <IconRotateClockwise className='mr-1 h-4 w-4 text-white' />
              <span>Restaurar</span>
            </AlertDialogAction>
            <AlertDialogAction
              className='inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-700/20 bg-red-500 px-3 py-2 text-white hover:bg-red-500 dark:border-slate-600/40 dark:hover:bg-red-500'
              onClick={() => {
                setPendingAction('delete');
                setIsActionConfirmOpen(true);
              }}
              disabled={
                !selectedTimelineEntry ||
                selectedTimelineEntry?.isCurrent ||
                isHistoryActionInProgress ||
                isRestoreInProgress
              }
            >
              <IconTrash className='mr-1 h-4 w-4 text-white' />
              <span>Eliminar</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation dialog for restore/delete actions (custom, not native) */}
      <AlertDialog
        open={isActionConfirmOpen}
        onOpenChange={(open) => setIsActionConfirmOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === 'restore'
                ? 'Confirmar restauración'
                : 'Confirmar eliminación'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'restore'
                ? 'Esta acción reemplazará los servicios actuales con la versión seleccionada.'
                : 'Esta acción eliminará permanentemente la versión seleccionada.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex items-center gap-2'>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className={`inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-700/20 px-3 py-2 dark:border-slate-600/40 ${pendingAction === 'delete' ? 'bg-red-500 text-white hover:bg-red-500 dark:hover:bg-red-500' : 'bg-black text-white hover:bg-black dark:bg-sky-500 dark:text-white dark:hover:bg-sky-500'}`}
              onClick={async () => {
                if (!selectedTimelineEntry) return;
                const id = selectedTimelineEntry.id;
                setIsActionConfirmOpen(false);
                setIsTimelineDialogOpen(false);
                setPendingAction(null);
                if (pendingAction === 'restore') {
                  await handleRestoreHistory(id);
                } else if (pendingAction === 'delete') {
                  await handleDeleteHistory(id);
                }
              }}
            >
              {pendingAction === 'restore' ? (
                <>
                  <IconRotateClockwise className='mr-1 h-4 w-4 text-white' />
                  Restaurar
                </>
              ) : (
                <>
                  <IconTrash className='mr-1 h-4 w-4 text-white' />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
