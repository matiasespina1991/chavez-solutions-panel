'use client';

import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp
} from 'firebase/firestore';
import { IconDotsVertical, IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

type WorkOrderMatrix = 'water' | 'soil';
type WorkOrderStatus = 'issued' | 'paused' | 'cancelled' | 'unknown';

interface WorkOrderRow {
  id: string;
  workOrderNumber: string;
  sourceReference: string;
  sourceRequestId: string;
  notes: string;
  matrix: WorkOrderMatrix;
  status: WorkOrderStatus;
  client: {
    businessName: string;
    taxId: string;
    contactName: string;
  };
  sampleItems: Array<{ sampleCode: string; sampleType: string }>;
  analysisItems: Array<{ parameterLabelEs: string; unitPrice: number }>;
  taxPercent: number;
  clientBusinessName: string;
  agreedCount: number;
  analysesCount: number;
  total: number;
  subtotal: number;
  updatedAtLabel: string;
  updatedAtMs: number;
}

type SortKey =
  | 'reference'
  | 'ot'
  | 'matrix'
  | 'client'
  | 'samples'
  | 'analyses'
  | 'status'
  | 'notes'
  | 'updatedAt';

type SortDirection = 'asc' | 'desc';

const matrixLabelMap: Record<WorkOrderMatrix, string> = {
  water: 'Agua',
  soil: 'Suelo'
};

const statusLabelMap: Record<WorkOrderStatus, string> = {
  issued: 'Orden de trabajo emitida',
  paused: 'Orden de trabajo pausada',
  cancelled: 'Orden de trabajo cancelada',
  unknown: 'Estado desconocido'
};

const formatTimestamp = (value: unknown) => {
  if (!value) return '—';
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString('es-EC');
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toLocaleString('es-EC');
    } catch {
      return '—';
    }
  }
  return '—';
};

const toTimestampMs = (value: unknown) => {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toDate().getTime();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().getTime();
    } catch {
      return 0;
    }
  }
  return 0;
};

export default function WorkOrdersListing() {
  const [rows, setRows] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedRow, setSelectedRow] = useState<WorkOrderRow | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const getOtSortRank = (row: WorkOrderRow) => {
    if (row.status === 'paused') return 1;
    if (row.status === 'issued') return 2;
    if (row.status === 'cancelled') return 3;
    return 0;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  useEffect(() => {
    const workOrdersQuery = query(
      collection(db, 'work_orders'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      workOrdersQuery,
      (snapshot) => {
        const nextRows: WorkOrderRow[] = snapshot.docs.map((docSnap) => {
          const value = docSnap.data() as Record<string, unknown>;

          const matrix = (value.matrix as WorkOrderMatrix) ?? 'water';
          const rawStatus = String(value.status ?? '').toLowerCase();
          const status: WorkOrderStatus =
            rawStatus === 'issued' ||
            rawStatus === 'paused' ||
            rawStatus === 'cancelled'
              ? (rawStatus as WorkOrderStatus)
              : 'unknown';

          const total =
            typeof value.pricing === 'object' && value.pricing !== null
              ? Number((value.pricing as { total?: number | null }).total ?? 0)
              : 0;
          const subtotal =
            typeof value.pricing === 'object' && value.pricing !== null
              ? Number(
                  (value.pricing as { subtotal?: number | null }).subtotal ?? 0
                )
              : 0;
          const taxPercent =
            typeof value.pricing === 'object' && value.pricing !== null
              ? Number(
                  (value.pricing as { taxPercent?: number | null })
                    .taxPercent ?? 15
                )
              : 15;

          const agreedCount =
            typeof value.samples === 'object' && value.samples !== null
              ? Number(
                  (value.samples as { agreedCount?: number }).agreedCount ?? 0
                )
              : 0;

          const analysesCount =
            typeof value.analyses === 'object' && value.analyses !== null
              ? Array.isArray((value.analyses as { items?: unknown[] }).items)
                ? ((value.analyses as { items?: unknown[] }).items?.length ?? 0)
                : 0
              : 0;

          const clientBusinessName =
            typeof value.client === 'object' && value.client !== null
              ? String(
                  (value.client as { businessName?: string }).businessName ?? ''
                )
              : '';

          const client =
            typeof value.client === 'object' && value.client !== null
              ? {
                  businessName: String(
                    (value.client as { businessName?: string }).businessName ??
                      ''
                  ),
                  taxId: String(
                    (value.client as { taxId?: string }).taxId ?? ''
                  ),
                  contactName: String(
                    (value.client as { contactName?: string }).contactName ?? ''
                  )
                }
              : {
                  businessName: '',
                  taxId: '',
                  contactName: ''
                };

          const sampleItems =
            typeof value.samples === 'object' && value.samples !== null
              ? Array.isArray((value.samples as { items?: unknown[] }).items)
                ? ((value.samples as { items?: unknown[] }).items ?? []).map(
                    (item) => {
                      const rowItem = item as {
                        sampleCode?: string;
                        sampleType?: string;
                      };
                      return {
                        sampleCode: String(rowItem.sampleCode ?? '—'),
                        sampleType: String(rowItem.sampleType ?? 'Sin tipo')
                      };
                    }
                  )
                : []
              : [];

          const analysisItems =
            typeof value.analyses === 'object' && value.analyses !== null
              ? Array.isArray((value.analyses as { items?: unknown[] }).items)
                ? ((value.analyses as { items?: unknown[] }).items ?? []).map(
                    (item) => {
                      const rowItem = item as {
                        parameterLabelEs?: string;
                        unitPrice?: number | null;
                      };
                      return {
                        parameterLabelEs: String(
                          rowItem.parameterLabelEs ?? 'Parámetro'
                        ),
                        unitPrice: Number(rowItem.unitPrice ?? 0)
                      };
                    }
                  )
                : []
              : [];

          return {
            id: docSnap.id,
            workOrderNumber: String(value.workOrderNumber ?? docSnap.id),
            sourceReference: String(value.sourceReference ?? '—'),
            sourceRequestId: String(value.sourceRequestId ?? ''),
            notes: String(value.notes ?? ''),
            matrix,
            status,
            client,
            sampleItems,
            analysisItems,
            taxPercent: Number.isFinite(taxPercent) ? taxPercent : 15,
            clientBusinessName: clientBusinessName || '—',
            agreedCount,
            analysesCount,
            total: Number.isFinite(total) ? total : 0,
            subtotal: Number.isFinite(subtotal) ? subtotal : 0,
            updatedAtLabel: formatTimestamp(value.updatedAt),
            updatedAtMs: toTimestampMs(value.updatedAt)
          };
        });

        setRows(nextRows);
        setLoading(false);
      },
      (error) => {
        console.error('[WorkOrders] load error', error);
        setRows([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const sortedRows = useMemo(() => {
    const collator = new Intl.Collator('es', {
      sensitivity: 'base',
      numeric: true
    });

    const getString = (value: string | null | undefined) =>
      (value || '').trim();

    const sorted = [...rows].sort((left, right) => {
      let compare = 0;

      switch (sortKey) {
        case 'reference':
          compare = collator.compare(
            left.workOrderNumber,
            right.workOrderNumber
          );
          break;
        case 'ot':
          compare = getOtSortRank(left) - getOtSortRank(right);
          break;
        case 'matrix':
          compare = collator.compare(
            matrixLabelMap[left.matrix],
            matrixLabelMap[right.matrix]
          );
          break;
        case 'client':
          compare = collator.compare(
            left.clientBusinessName,
            right.clientBusinessName
          );
          break;
        case 'samples':
          compare = left.agreedCount - right.agreedCount;
          break;
        case 'analyses':
          compare = left.analysesCount - right.analysesCount;
          break;
        case 'status':
          compare = collator.compare(
            statusLabelMap[left.status],
            statusLabelMap[right.status]
          );
          break;
        case 'notes':
          compare = collator.compare(
            getString(left.notes),
            getString(right.notes)
          );
          break;
        case 'updatedAt':
          compare = left.updatedAtMs - right.updatedAtMs;
          break;
        default:
          compare = 0;
      }

      if (compare === 0) {
        compare = collator.compare(left.workOrderNumber, right.workOrderNumber);
      }

      return sortDirection === 'asc' ? compare : compare * -1;
    });

    return sorted;
  }, [rows, sortDirection, sortKey]);

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('es');
    if (!query) return sortedRows;

    return sortedRows.filter((row) => {
      const otLabel =
        row.status === 'paused'
          ? 'amarillo'
          : row.status === 'cancelled'
            ? 'gris'
          : row.status === 'issued'
            ? 'verde'
            : 'rojo';

      const searchableParts = [
        row.workOrderNumber,
        row.sourceReference,
        row.sourceRequestId,
        row.notes,
        row.matrix,
        matrixLabelMap[row.matrix],
        row.status,
        statusLabelMap[row.status],
        row.client.businessName,
        row.client.taxId,
        row.client.contactName,
        row.clientBusinessName,
        String(row.agreedCount),
        String(row.analysesCount),
        String(row.total),
        String(row.subtotal),
        String(row.taxPercent),
        row.updatedAtLabel,
        otLabel,
        ...row.sampleItems.flatMap((sample) => [
          sample.sampleCode,
          sample.sampleType
        ]),
        ...row.analysisItems.flatMap((analysis) => [
          analysis.parameterLabelEs,
          String(analysis.unitPrice)
        ])
      ];

      return searchableParts.join(' ').toLocaleLowerCase('es').includes(query);
    });
  }, [searchQuery, sortedRows]);

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);
  const hasVisibleRows = useMemo(
    () => visibleRows.length > 0,
    [visibleRows.length]
  );

  if (loading) {
    return (
      <DataTableSkeleton
        columnCount={10}
        rowCount={8}
        filterCount={0}
        withViewOptions={false}
        withPagination={false}
        cellWidths={[
          '12rem',
          '4rem',
          '6rem',
          '14rem',
          '6rem',
          '6rem',
          '14rem',
          '8rem',
          '12rem',
          '3rem'
        ]}
      />
    );
  }

  if (!hasRows) {
    return (
      <div className='text-muted-foreground rounded-md border p-8 text-center text-sm'>
        Aún no hay órdenes de trabajo registradas.
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='relative max-w-[19.5rem]'>
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder='Buscar en todas las órdenes de trabajo...'
          className='pr-10'
        />
        <IconSearch className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2' />
      </div>

      <div className='rounded-md border'>
        <div className='max-h-[calc(100vh-240px)] overflow-auto'>
          <table className='w-full min-w-[1080px] text-left text-sm'>
            <thead className='bg-muted text-muted-foreground sticky top-0 z-10'>
              <tr>
                <th className='px-4 py-3'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('reference')}
                  >
                    Referencia{getSortIndicator('reference')}
                  </button>
                </th>
                <th className='px-4 py-3 text-center'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('ot')}
                  >
                    OT{getSortIndicator('ot')}
                  </button>
                </th>
                <th className='px-4 py-3'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('matrix')}
                  >
                    Matriz{getSortIndicator('matrix')}
                  </button>
                </th>
                <th className='px-4 py-3'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('client')}
                  >
                    Cliente{getSortIndicator('client')}
                  </button>
                </th>
                <th className='px-4 py-3 text-right'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('samples')}
                  >
                    Muestras{getSortIndicator('samples')}
                  </button>
                </th>
                <th className='px-4 py-3 text-right'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('analyses')}
                  >
                    Análisis{getSortIndicator('analyses')}
                  </button>
                </th>
                <th className='px-4 py-3'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('status')}
                  >
                    Estado{getSortIndicator('status')}
                  </button>
                </th>
                <th className='px-4 py-3'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('notes')}
                  >
                    Notas{getSortIndicator('notes')}
                  </button>
                </th>
                <th className='px-4 py-3'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('updatedAt')}
                  >
                    Última Actualización{getSortIndicator('updatedAt')}
                  </button>
                </th>
                <th className='w-12 px-2 py-3 text-right'></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const isWorkOrderPaused = row.status === 'paused';
                const isWorkOrderIssued = row.status === 'issued';
                const isWorkOrderCancelled = row.status === 'cancelled';

                return (
                  <tr
                    key={row.id}
                    className='hover:bg-muted/40 cursor-pointer border-t transition-colors duration-200'
                    onClick={() => {
                      setSelectedRow(row);
                      setIsViewDialogOpen(true);
                    }}
                  >
                    <td className='px-4 py-3'>
                      <div className='space-y-0.5'>
                        <p>
                          {row.workOrderNumber}
                          {row.status === 'paused' ? (
                            <span className='text-muted-foreground ml-1 text-xs'>
                              (pausada)
                            </span>
                          ) : null}
                          {isWorkOrderCancelled ? (
                            <span className='text-muted-foreground ml-1 text-xs'>
                              (cancelada)
                            </span>
                          ) : null}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {row.sourceReference || '—'}
                        </p>
                      </div>
                    </td>
                    <td className='px-4 py-3 text-center'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              isWorkOrderPaused
                                ? 'bg-yellow-400'
                                : isWorkOrderCancelled
                                  ? 'bg-slate-400'
                                : isWorkOrderIssued
                                  ? 'bg-emerald-500'
                                  : 'bg-red-500'
                            }`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {isWorkOrderPaused
                            ? 'Orden de trabajo pausada'
                            : isWorkOrderCancelled
                              ? 'Orden de trabajo cancelada'
                            : isWorkOrderIssued
                              ? 'Orden de trabajo emitida'
                              : 'Orden de trabajo sin emitir'}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className='px-4 py-3'>{matrixLabelMap[row.matrix]}</td>
                    <td className='px-4 py-3'>{row.clientBusinessName}</td>
                    <td className='px-4 py-3 text-right'>{row.agreedCount}</td>
                    <td className='px-4 py-3 text-right'>
                      {row.analysesCount}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        row.status === 'paused' || row.status === 'cancelled'
                          ? 'text-destructive'
                          : ''
                      }`}
                    >
                      {statusLabelMap[row.status]}
                    </td>
                    <td className='px-4 py-3'>
                      {row.notes?.trim() ? (
                        <span className='inline-block max-w-[14rem] truncate align-bottom'>
                          {row.notes}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='px-4 py-3'>{row.updatedAtLabel}</td>
                    <td className='w-12 px-2 py-3 text-right'>
                      <div
                        className='flex justify-end'
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              className='h-8 w-8 cursor-pointer p-0'
                            >
                              <span className='sr-only'>Abrir acciones</span>
                              <IconDotsVertical className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' side='bottom'>
                            <DropdownMenuItem
                              className='cursor-pointer transition-colors duration-150'
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedRow(row);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              Ver orden de trabajo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!hasVisibleRows ? (
            <div className='text-muted-foreground border-t p-8 text-center text-sm'>
              No se encontraron órdenes de trabajo para la búsqueda actual.
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className='max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl'>
          <DialogHeader className='bg-background shrink-0 border-b px-6 py-4 pr-12'>
            <DialogTitle>Resumen de orden de trabajo</DialogTitle>
            <DialogDescription>
              Vista consolidada de cliente, muestras, análisis y costos.
            </DialogDescription>
          </DialogHeader>

          {selectedRow && (
            <div className='max-h-[calc(90vh-88px)] overflow-y-auto overscroll-none'>
              <div className='space-y-5 px-6 py-5'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Datos Generales
                    </h4>
                    <p>
                      <span className='font-medium'>N° OT:</span>{' '}
                      {selectedRow.workOrderNumber}
                    </p>
                    <p>
                      <span className='font-medium'>Referencia origen:</span>{' '}
                      {selectedRow.sourceReference}
                    </p>
                    <p>
                      <span className='font-medium'>Matriz:</span>{' '}
                      {selectedRow.matrix === 'water' ? 'Agua' : 'Suelo'}
                    </p>
                  </div>
                  <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Cliente
                    </h4>
                    <p>
                      <span className='font-medium'>Razón Social:</span>{' '}
                      {selectedRow.client.businessName || '—'}
                    </p>
                    <p>
                      <span className='font-medium'>RUC:</span>{' '}
                      {selectedRow.client.taxId || '—'}
                    </p>
                    <p>
                      <span className='font-medium'>Contacto:</span>{' '}
                      {selectedRow.client.contactName || '—'}
                    </p>
                  </div>
                </div>

                <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                  <h4 className='text-muted-foreground font-semibold'>
                    Muestras ({selectedRow.agreedCount})
                  </h4>
                  <div className='flex flex-wrap gap-2'>
                    {selectedRow.sampleItems.map((sample, index) => (
                      <span
                        key={`${sample.sampleCode}-${index}`}
                        className='bg-muted rounded border px-2 py-1 text-sm'
                      >
                        {sample.sampleCode} ({sample.sampleType || 'Sin tipo'})
                      </span>
                    ))}
                  </div>
                </div>

                <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                  <h4 className='text-muted-foreground font-semibold'>
                    Análisis ({selectedRow.analysisItems.length})
                  </h4>
                  <div className='flex flex-wrap gap-2'>
                    {selectedRow.analysisItems.map((analysis, index) => (
                      <span
                        key={`${analysis.parameterLabelEs}-${index}`}
                        className='bg-muted rounded border px-2 py-1 text-sm'
                      >
                        {analysis.parameterLabelEs}
                      </span>
                    ))}
                  </div>
                </div>

                <div className='space-y-4 rounded-md border p-4'>
                  {selectedRow.analysisItems.length > 0 && (
                    <div className='space-y-2'>
                      <h4 className='text-muted-foreground font-semibold'>
                        Detalle de costos por análisis
                      </h4>
                      <div className='overflow-x-auto rounded-md border'>
                        <table className='w-full text-left text-sm'>
                          <thead className='bg-muted text-muted-foreground'>
                            <tr>
                              <th className='p-2'>Parámetro</th>
                              <th className='p-2 text-right'>Muestras</th>
                              <th className='p-2 text-right'>Costo unitario</th>
                              <th className='p-2 text-right'>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRow.analysisItems.map(
                              (analysis, index) => {
                                const lineTotal =
                                  analysis.unitPrice * selectedRow.agreedCount;
                                return (
                                  <tr
                                    key={`${analysis.parameterLabelEs}-${index}`}
                                    className='border-t'
                                  >
                                    <td className='p-2'>
                                      {analysis.parameterLabelEs}
                                    </td>
                                    <td className='p-2 text-right'>
                                      {selectedRow.agreedCount}
                                    </td>
                                    <td className='p-2 text-right'>
                                      ${analysis.unitPrice.toFixed(2)}
                                    </td>
                                    <td className='p-2 text-right'>
                                      ${lineTotal.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <h4 className='text-muted-foreground font-semibold'>
                    Costos Estimados
                  </h4>
                  <div className='w-full max-w-xs space-y-1'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Subtotal:</span>
                      <span>${selectedRow.subtotal.toFixed(2)}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>
                        IVA ({selectedRow.taxPercent}%):
                      </span>
                      <span>
                        $
                        {(
                          (selectedRow.subtotal * selectedRow.taxPercent) /
                          100
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className='mt-1 flex justify-between border-t pt-1 text-lg font-bold'>
                      <span>Total:</span>
                      <span>${selectedRow.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedRow.notes?.trim() ? (
                  <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Notas
                    </h4>
                    <p className='whitespace-pre-wrap'>{selectedRow.notes}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
