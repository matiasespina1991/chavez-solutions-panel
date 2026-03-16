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
import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { importServicesFromCsv } from '../services/import-services';

const PREVIEW_ROWS_PER_PAGE = 30;

const CSV_ACCEPT = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.csv']
};

interface CsvPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

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

  const headers = rows[0].map((header, index) => {
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
  const [isImporting, setIsImporting] = useState(false);

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

  return (
    <>
      <div
        className='w-full space-y-4'
        style={{
          maxWidth: panelMaxWidth,
          paddingTop: 0,
          paddingRight: 0,
          paddingLeft: 0,
          paddingBottom: '2rem'
        }}
      >
        <Card className='w-full max-w-[44rem]'>
          <CardHeader>
            <CardTitle>Importar servicios</CardTitle>
            <p className='text-muted-foreground text-sm'>
              Cargá un archivo CSV para reemplazar completamente la colección de
              servicios en Firestore.
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

        {selectedFile ? (
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
              <div className='rounded-md border'>
                <div
                  className='overflow-auto'
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
                    <table className='w-full min-w-[1100px] text-left text-sm'>
                      <thead className='bg-muted text-muted-foreground sticky top-0 z-10'>
                        <tr>
                          {csvPreview.headers.map((header, index) => (
                            <th
                              key={`${header}-${index}`}
                              className='px-4 py-3 font-medium whitespace-nowrap'
                              style={getColumnWidth(header)}
                            >
                              {getHeaderLabel(header) || `Columna ${index + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.length ? (
                          paginatedRows.map((row, rowIndex) => (
                            <tr
                              key={`preview-row-${(currentPage - 1) * rowsPerPage + rowIndex}`}
                              className='border-t'
                            >
                              {csvPreview!.headers.map((header, colIndex) => (
                                <td
                                  key={`preview-cell-${(currentPage - 1) * rowsPerPage + rowIndex}-${header}-${colIndex}`}
                                  className='px-4 py-2 align-top'
                                  style={getColumnWidth(header)}
                                >
                                  {row[colIndex] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))
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
        ) : null}
      </div>

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
    </>
  );
}
