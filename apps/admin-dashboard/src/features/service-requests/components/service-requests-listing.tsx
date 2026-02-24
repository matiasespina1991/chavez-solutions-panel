'use client';

import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  deleteServiceRequest,
  createWorkOrderFromRequest,
  pauseWorkOrderFromRequest,
  resumeWorkOrderFromRequest
} from '@/features/configurator/services/configurations';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp
} from 'firebase/firestore';
import {
  IconDownload,
  IconDotsVertical,
  IconPencil,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPrinter,
  IconSearch,
  IconTrash
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type ServiceRequestMatrix = 'water' | 'soil';
type ServiceRequestStatus =
  | 'draft'
  | 'submitted'
  | 'converted_to_work_order'
  | 'work_order_paused'
  | 'work_order_completed'
  | 'cancelled';

interface ServiceRequestRow {
  id: string;
  reference: string;
  notes: string;
  isWorkOrder: boolean;
  matrix: ServiceRequestMatrix;
  status: ServiceRequestStatus;
  validDays: number | null;
  createdAtMs: number;
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
  | 'total'
  | 'updatedAt';

type SortDirection = 'asc' | 'desc';

const matrixLabelMap: Record<ServiceRequestMatrix, string> = {
  water: 'Agua',
  soil: 'Suelo'
};

const statusLabelMap: Record<ServiceRequestStatus, string> = {
  draft: '(Borrador)',
  submitted: 'Proforma enviada',
  converted_to_work_order: 'Convertida a OT',
  work_order_paused: 'Orden de trabajo pausada',
  work_order_completed: 'Orden de trabajo finalizada',
  cancelled: 'Cancelada'
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

const getValidUntilMs = (createdAtMs: number, validDays: number | null) => {
  if (!createdAtMs || !validDays || validDays <= 0) return null;
  return createdAtMs + validDays * 24 * 60 * 60 * 1000;
};

const formatDate = (valueMs: number | null) => {
  if (!valueMs) return '—';
  return new Date(valueMs).toLocaleDateString('es-EC');
};

export default function ServiceRequestsListing() {
  const router = useRouter();
  const [rows, setRows] = useState<ServiceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ServiceRequestRow | null>(
    null
  );
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<ServiceRequestRow | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const hasIssuedWorkOrder = (row: ServiceRequestRow) =>
    row.status === 'converted_to_work_order' ||
    row.status === 'work_order_paused' ||
    row.status === 'work_order_completed';

  const isExpiredProforma = (row: ServiceRequestRow) => {
    if (row.status !== 'submitted') return false;
    const validUntilMs = getValidUntilMs(row.createdAtMs, row.validDays);
    if (!validUntilMs) return false;
    return validUntilMs < Date.now();
  };

  const getRowStatusLabel = (row: ServiceRequestRow) => {
    if (isExpiredProforma(row)) return 'Proforma vencida';
    return statusLabelMap[row.status];
  };

  const getOtSortRank = (row: ServiceRequestRow) => {
    if (row.status === 'work_order_paused') return 1;
    if (row.status === 'work_order_completed') return 2;
    if (hasIssuedWorkOrder(row)) return 3;
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

  const dialogActionButtonClass =
    'h-[2.4rem] w-[2.4rem] cursor-pointer rounded-md border bg-background p-0 transition-colors duration-150 hover:bg-muted/60';

  const getRequestDialogBanner = (row: ServiceRequestRow) => {
    if (row.status === 'work_order_completed') {
      return {
        className:
          'mb-[1rem] rounded-md border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300',
        text: 'Orden de trabajo finalizada. ✅'
      };
    }

    if (row.status === 'cancelled') {
      return {
        className:
          'mb-[1rem] rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
        text: 'Solicitud cancelada.'
      };
    }

    if (row.status === 'draft') {
      return {
        className:
          'mb-[1rem] rounded-md border border-slate-500/30 bg-slate-500/10 px-3 py-2 text-sm text-slate-700 dark:text-slate-300',
        text: 'Borrador.'
      };
    }

    return null;
  };

  const handleWorkOrderAction = async (row: ServiceRequestRow) => {
    if (row.status === 'draft') {
      toast.error('No se puede emitir una orden de trabajo desde un borrador');
      return;
    }

    if (row.status === 'work_order_completed') {
      toast.error('La orden de trabajo ya se encuentra finalizada');
      return;
    }

    try {
      setPendingActionId(row.id);

      const workOrderIssued = hasIssuedWorkOrder(row);

      if (workOrderIssued) {
        if (row.status === 'work_order_paused') {
          await resumeWorkOrderFromRequest(row.id);
          toast.success(`Orden de trabajo ${row.reference} reanudada`);
        } else {
          await pauseWorkOrderFromRequest(row.id);
          toast.success(`Orden de trabajo ${row.reference} pausada`);
        }
      } else {
        await createWorkOrderFromRequest(row.id);
        toast.success(`Orden de Trabajo emitida (${row.reference})`);
      }
    } catch (error) {
      console.error('[ServiceRequests] action error', error);
      toast.error('No se pudo completar la acción de la orden de trabajo');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleDeleteRequest = async () => {
    if (!rowToDelete) return;

    try {
      setIsDeleting(true);
      await deleteServiceRequest(rowToDelete.id);
      toast.success('Solicitud eliminada correctamente');
      setIsDeleteDialogOpen(false);
      setRowToDelete(null);
      if (selectedRow?.id === rowToDelete.id) {
        setIsViewDialogOpen(false);
        setSelectedRow(null);
      }
    } catch (error) {
      console.error('[ServiceRequests] delete error', error);
      toast.error('No se pudo eliminar la solicitud');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDialogEdit = () => {
    if (!selectedRow) return;

    const workOrderIssued = hasIssuedWorkOrder(selectedRow);
    const isWorkOrderPaused = selectedRow.status === 'work_order_paused';

    if (workOrderIssued && !isWorkOrderPaused) {
      toast.error('No se puede editar una orden de trabajo ya emitida');
      return;
    }

    setIsViewDialogOpen(false);
    router.push(
      `/dashboard/configurator?requestId=${encodeURIComponent(selectedRow.id)}&tab=summary`
    );
  };

  const handleDialogDelete = () => {
    if (!selectedRow) return;
    setRowToDelete(selectedRow);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogDownload = () => {
    toast.info('Descargar solicitud estará disponible próximamente');
  };

  const handleDialogPrint = () => {
    toast.info('Imprimir solicitud estará disponible próximamente');
  };

  useEffect(() => {
    const requestsQuery = query(
      collection(db, 'service_requests'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const nextRows: ServiceRequestRow[] = snapshot.docs.map((docSnap) => {
          const value = docSnap.data() as Record<string, unknown>;

          const isWorkOrder = Boolean(value.isWorkOrder);
          const matrix = (value.matrix as ServiceRequestMatrix) ?? 'water';
          const status =
            (value.status as ServiceRequestStatus) ??
            ('draft' as ServiceRequestStatus);
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
          const validDays =
            typeof value.pricing === 'object' && value.pricing !== null
              ? Number(
                  (value.pricing as { validDays?: number | null }).validDays ??
                    0
                )
              : 0;

          const createdAtMs =
            toTimestampMs(value.createdAt) || toTimestampMs(value.updatedAt);

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
            reference: String(value.reference ?? '—'),
            notes: String(value.notes ?? ''),
            isWorkOrder,
            matrix,
            status,
            validDays:
              Number.isFinite(validDays) && validDays > 0 ? validDays : null,
            createdAtMs,
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
        console.error('[ServiceRequests] load error', error);
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
          compare = collator.compare(left.reference, right.reference);
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
            getRowStatusLabel(left),
            getRowStatusLabel(right)
          );
          break;
        case 'notes':
          compare = collator.compare(
            getString(left.notes),
            getString(right.notes)
          );
          break;
        case 'total':
          compare = left.total - right.total;
          break;
        case 'updatedAt':
          compare = left.updatedAtMs - right.updatedAtMs;
          break;
        default:
          compare = 0;
      }

      if (compare === 0) {
        compare = collator.compare(left.reference, right.reference);
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
        row.status === 'work_order_paused'
          ? 'amarillo'
          : row.status === 'work_order_completed'
            ? 'verde suave'
            : hasIssuedWorkOrder(row)
              ? 'verde'
              : 'rojo';

      const searchableParts = [
        row.reference,
        row.notes,
        row.matrix,
        matrixLabelMap[row.matrix],
        row.status,
        getRowStatusLabel(row),
        String(row.validDays ?? ''),
        formatDate(getValidUntilMs(row.createdAtMs, row.validDays)),
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
        columnCount={11}
        rowCount={8}
        filterCount={0}
        withViewOptions={false}
        withPagination={false}
        cellWidths={[
          '10rem',
          '4rem',
          '6rem',
          '14rem',
          '6rem',
          '6rem',
          '14rem',
          '10rem',
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
        Aún no hay solicitudes de servicio registradas.
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='relative max-w-[19.5rem]'>
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder='Buscar en todas las solicitudes...'
          className='pr-10'
        />
        <IconSearch className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2' />
      </div>

      <div className='rounded-md border'>
        <div className='max-h-[calc(100vh-240px)] overflow-auto'>
          <table className='w-full min-w-[1120px] text-left text-sm'>
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
                <th className='px-4 py-3 text-right'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('total')}
                  >
                    Total (USD){getSortIndicator('total')}
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
                const workOrderIssued = hasIssuedWorkOrder(row);
                const isWorkOrderPaused = row.status === 'work_order_paused';
                const isWorkOrderCompleted =
                  row.status === 'work_order_completed';
                const isDraft = row.status === 'draft';
                const isProformaExpired = isExpiredProforma(row);

                return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer border-t transition-colors duration-200 ${
                      isWorkOrderCompleted
                        ? 'bg-emerald-50/40 hover:bg-emerald-50/40 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/10'
                        : 'hover:bg-muted/40'
                    }`}
                    onClick={() => {
                      setSelectedRow(row);
                      setIsViewDialogOpen(true);
                    }}
                  >
                    <td className='px-4 py-3'>
                      <span className={isDraft ? 'text-destructive' : ''}>
                        {row.reference}
                      </span>
                      {row.status === 'draft' && (
                        <span className='text-muted-foreground ml-1 text-xs'>
                          (borrador)
                        </span>
                      )}
                      {row.status === 'work_order_paused' && (
                        <span className='text-muted-foreground ml-1 text-xs'>
                          (pausada)
                        </span>
                      )}

                      {isProformaExpired && (
                        <span className='text-muted-foreground ml-1 text-xs'>
                          (vencida)
                        </span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-center'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {isWorkOrderCompleted ? (
                            <span className='inline-flex h-4 w-4 items-center justify-center text-[0.8rem] leading-none'>
                              ✅
                            </span>
                          ) : (
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${
                                isWorkOrderPaused
                                  ? 'bg-yellow-400'
                                  : isDraft
                                    ? 'bg-slate-400'
                                    : workOrderIssued
                                      ? 'bg-emerald-500'
                                      : 'bg-red-500'
                              }`}
                            />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {isWorkOrderPaused
                            ? 'Orden de trabajo pausada'
                            : isWorkOrderCompleted
                              ? 'Orden de trabajo finalizada'
                              : workOrderIssued
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
                        isProformaExpired ? 'text-destructive' : ''
                      }`}
                    >
                      {getRowStatusLabel(row)}
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
                    <td className='px-4 py-3 text-right'>
                      ${row.total.toFixed(2).replace('.', ',')}
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
                              disabled={pendingActionId === row.id}
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
                              Ver solicitud
                            </DropdownMenuItem>
                            {!isWorkOrderCompleted ? (
                              <>
                                {workOrderIssued && !isWorkOrderPaused ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className='block'>
                                        <DropdownMenuItem
                                          disabled
                                          className='text-muted-foreground cursor-not-allowed opacity-60'
                                        >
                                          Editar solicitud...
                                        </DropdownMenuItem>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      No se puede editar una orden de trabajo ya
                                      emitida
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <DropdownMenuItem
                                    className='cursor-pointer transition-colors duration-150'
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      router.push(
                                        `/dashboard/configurator?requestId=${encodeURIComponent(row.id)}&tab=summary`
                                      );
                                    }}
                                  >
                                    Editar solicitud...
                                  </DropdownMenuItem>
                                )}
                                {isDraft ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className='block'>
                                        <DropdownMenuItem
                                          disabled
                                          className='text-muted-foreground focus:text-muted-foreground cursor-not-allowed justify-start opacity-60'
                                        >
                                          Emitir orden de trabajo
                                        </DropdownMenuItem>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Finalice el borrador para poder emitir una
                                      Orden de trabajo
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <DropdownMenuItem
                                    className={`cursor-pointer justify-start transition-colors duration-150 ${
                                      !workOrderIssued
                                        ? 'text-foreground focus:text-foreground'
                                        : isWorkOrderPaused
                                          ? 'text-emerald-600 focus:text-emerald-600'
                                          : 'text-destructive focus:text-destructive'
                                    }`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleWorkOrderAction(row);
                                    }}
                                    disabled={pendingActionId === row.id}
                                  >
                                    {workOrderIssued ? (
                                      isWorkOrderPaused ? (
                                        <span className='inline-flex items-center justify-start gap-0'>
                                          <IconPlayerPlayFilled
                                            className='h-[0.64rem] w-[0.64rem] text-emerald-600'
                                            style={{
                                              transform: 'scale(0.9)',
                                              marginRight: '5px'
                                            }}
                                          />
                                          <span>Reanudar orden de trabajo</span>
                                        </span>
                                      ) : (
                                        <span className='inline-flex items-center justify-start gap-0'>
                                          <IconPlayerPauseFilled
                                            className='text-destructive h-[0.64rem] w-[0.64rem]'
                                            style={{
                                              transform: 'scale(0.9)',
                                              marginRight: '5px'
                                            }}
                                          />
                                          <span>Pausar orden de trabajo</span>
                                        </span>
                                      )
                                    ) : (
                                      'Emitir orden de trabajo'
                                    )}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className='text-destructive focus:text-destructive cursor-pointer transition-colors duration-150'
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setRowToDelete(row);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  disabled={isDeleting}
                                >
                                  <span className='inline-flex items-center justify-start gap-0'>
                                    <IconTrash
                                      className='text-destructive h-[0.64rem] w-[0.64rem]'
                                      style={{
                                        transform: 'scale(0.9)',
                                        marginRight: '5px'
                                      }}
                                    />
                                    <span>Eliminar Solicitud</span>
                                  </span>
                                </DropdownMenuItem>
                              </>
                            ) : null}
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
              No se encontraron solicitudes para la búsqueda actual.
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent
          className='max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl'
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className='bg-background shrink-0 border-b px-6 py-4 pr-12'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <DialogTitle>Resumen de solicitud</DialogTitle>
                <DialogDescription>
                  Vista consolidada de cliente, muestras, análisis y costos.
                </DialogDescription>
              </div>
              <div className='flex items-center gap-1'>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className={dialogActionButtonClass}
                      onClick={handleDialogEdit}
                      aria-label='Editar solicitud'
                    >
                      <IconPencil className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar solicitud...</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className={dialogActionButtonClass}
                      onClick={handleDialogDownload}
                      aria-label='Descargar solicitud'
                    >
                      <IconDownload className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Descargar solicitud</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className={dialogActionButtonClass}
                      onClick={handleDialogPrint}
                      aria-label='Imprimir solicitud'
                    >
                      <IconPrinter className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Imprimir solicitud</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className={`${dialogActionButtonClass} text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10`}
                      onClick={handleDialogDelete}
                      aria-label='Eliminar solicitud'
                    >
                      <IconTrash className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Eliminar solicitud</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </DialogHeader>

          {selectedRow && (
            <div className='max-h-[calc(90vh-88px)] overflow-y-auto overscroll-none'>
              <div className='space-y-5 px-6 py-5'>
                {getRequestDialogBanner(selectedRow) ? (
                  <div
                    className={`${getRequestDialogBanner(selectedRow)?.className} mx-0 mt-0 flex items-center justify-start gap-1`}
                  >
                    <span>{getRequestDialogBanner(selectedRow)?.text}</span>
                    {selectedRow.status === 'draft' ? (
                      <button
                        type='button'
                        className='cursor-pointer text-blue-600 underline underline-offset-2 hover:text-blue-500'
                        onClick={handleDialogEdit}
                      >
                        Editar
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Datos Generales
                    </h4>
                    <p>
                      <span className='font-medium'>Tipo:</span>{' '}
                      {selectedRow.isWorkOrder ? 'Proforma + OT' : 'Proforma'}
                    </p>
                    <p>
                      <span className='font-medium'>Matriz:</span>{' '}
                      {selectedRow.matrix === 'water' ? 'Agua' : 'Suelo'}
                    </p>
                    <p>
                      <span className='font-medium'>Referencia:</span>{' '}
                      {selectedRow.reference}
                    </p>
                    <p>
                      <span className='font-medium'>Validez:</span>{' '}
                      {selectedRow.validDays
                        ? `${selectedRow.validDays} días`
                        : '—'}
                    </p>
                    <p>
                      <span className='font-medium'>Válida hasta:</span>{' '}
                      {formatDate(
                        getValidUntilMs(
                          selectedRow.createdAtMs,
                          selectedRow.validDays
                        )
                      )}
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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setIsDeleteDialogOpen(open);
          if (!open) setRowToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar eliminación de solicitud
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar esta solicitud? Esta acción la
              removerá y no podrá deshacerse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer' disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive hover:bg-destructive/90 cursor-pointer text-white'
              onClick={handleDeleteRequest}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar Solicitud'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
