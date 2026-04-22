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
import { completeWorkOrder } from '@/features/configurator/services/configurations';
import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import { getGenericCallableErrorMessage } from '@/lib/callable-errors';
import { showCallableErrorToast } from '@/lib/callable-toast';
import { normalizeMatrixArray } from '@/lib/request-normalizers';
import {
  firestoreTimestampToMs,
  formatFirestoreTimestamp
} from '@/lib/firestore-timestamps';
import { WORK_ORDER_STATUS_LABEL_MAP } from '@/lib/status-labels';
import type {
  WorkOrderListRow as WorkOrderRow,
  WorkOrderStatus
} from '@/types/domain';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  IconDownload,
  IconDotsVertical,
  IconPrinter,
  IconSearch
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SortKey =
  | 'reference'
  | 'client'
  | 'samples'
  | 'analyses'
  | 'status'
  | 'total'
  | 'notes'
  | 'updatedAt';

type SortDirection = 'asc' | 'desc';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildPrintDocumentHtml = (
  title: string,
  bodyHtml: string
) => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 24px; }
      h1 { margin: 0 0 6px 0; font-size: 28px; }
      .sub { margin: 0 0 16px 0; color: #555; font-size: 14px; }
      .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
      .card { border: 1px solid #d4d4d8; border-radius: 8px; padding: 12px; }
      .card h3 { margin: 0 0 8px 0; font-size: 16px; }
      .line { margin: 4px 0; font-size: 14px; }
      .section { border: 1px solid #d4d4d8; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
      .section h3 { margin: 0 0 8px 0; font-size: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border-top: 1px solid #e4e4e7; padding: 8px; text-align: left; vertical-align: top; }
      thead th { border-top: none; background: #f4f4f5; color: #3f3f46; }
      .right { text-align: right; }
      ul { margin: 0; padding-left: 16px; }
      li { margin: 4px 0; font-size: 14px; }
      @media print { body { padding: 14mm; } }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;

const openPrintWindow = (html: string) => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 200);
  return true;
};

const downloadHtml = (fileName: string, html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function WorkOrdersListing() {
  const router = useRouter();
  const [sourceRequestServicesById, setSourceRequestServicesById] = useState<
    Record<string, WorkOrderRow['serviceItems']>
  >({});
  const [rows, setRows] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedRow, setSelectedRow] = useState<WorkOrderRow | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [rowToComplete, setRowToComplete] = useState<WorkOrderRow | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const getStatusDisplayLabel = (row: WorkOrderRow) => {
    if (row.status === 'paused') return '⏸️ OT pausada';
    if (row.status === 'issued') return '🟢 OT iniciada';
    if (row.status === 'completed') return '✅ Finalizada';
    if (row.status === 'cancelled') return '(Cancelada)';
    return '(Estado desconocido)';
  };

  const handleConfirmCompleteWorkOrder = async () => {
    if (!rowToComplete) return;

    try {
      setIsCompleting(true);
      setPendingActionId(rowToComplete.id);
      await completeWorkOrder(rowToComplete.id, rowToComplete.sourceRequestId);
      toast.success(
        `Orden de trabajo ${rowToComplete.workOrderNumber} finalizada`
      );
      setIsCompleteDialogOpen(false);
      setRowToComplete(null);
    } catch (error) {
      console.error('[WorkOrders] complete action error', error);
      const genericErrorMessage = getGenericCallableErrorMessage(error);
      const fallbackMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'No se pudo finalizar la orden de trabajo';
      showCallableErrorToast(genericErrorMessage ?? fallbackMessage);
    } finally {
      setIsCompleting(false);
      setPendingActionId(null);
    }
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

  const getWorkOrderDialogBanner = (row: WorkOrderRow) => {
    if (row.status === 'completed') {
      return {
        className:
          'mb-[1rem] rounded-md border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300',
        text: 'Orden de trabajo finalizada. ✅'
      };
    }

    if (row.status === 'paused') {
      return {
        className:
          'mb-[1rem] rounded-md border border-yellow-500/40 bg-yellow-400/15 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-300',
        text: 'Orden de trabajo pausada.'
      };
    }

    if (row.status === 'cancelled') {
      return {
        className:
          'mb-[1rem] rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
        text: 'Orden de trabajo cancelada.'
      };
    }

    return null;
  };

  const handleDialogDownload = () => {
    if (!selectedRow) return;

    const html = buildPrintDocumentHtml(
      `Orden de trabajo ${selectedRow.workOrderNumber}`,
      `<h1>Resumen de orden de trabajo</h1>
       <p class="sub">N° OT: ${escapeHtml(selectedRow.workOrderNumber)}</p>
       <div class="cards">
         <div class="card">
           <h3>Datos generales</h3>
           <p class="line"><strong>N° OT:</strong> ${escapeHtml(selectedRow.workOrderNumber)}</p>
           <p class="line"><strong>Referencia origen:</strong> ${escapeHtml(selectedRow.sourceReference)}</p>
           <p class="line"><strong>Estado:</strong> ${escapeHtml(WORK_ORDER_STATUS_LABEL_MAP[selectedRow.status])}</p>
           <p class="line"><strong>Última actualización:</strong> ${escapeHtml(selectedRow.updatedAtLabel)}</p>
         </div>
         <div class="card">
           <h3>Cliente</h3>
           <p class="line"><strong>Razón social:</strong> ${escapeHtml(selectedRow.client.businessName || '—')}</p>
           <p class="line"><strong>RUC:</strong> ${escapeHtml(selectedRow.client.taxId || '—')}</p>
           <p class="line"><strong>Contacto:</strong> ${escapeHtml(selectedRow.client.contactName || '—')}</p>
         </div>
       </div>
       <div class="section">
         <h3>Servicios (${selectedRow.serviceItems.length})</h3>
         ${
           selectedRow.serviceItems.length
             ? `<ul>${selectedRow.serviceItems
                 .map(
                   (service) =>
                     `<li>${escapeHtml(service.parameterLabel)} (x${service.quantity})</li>`
                 )
                 .join('')}</ul>`
             : '<p class="line">No hay servicios seleccionados.</p>'
         }
       </div>
       ${
         selectedRow.serviceItems.length
           ? `<div class="section">
               <h3>Detalle de servicios</h3>
               <table>
                 <thead>
                   <tr>
                     <th>Parámetro</th>
                     <th class="right">Cantidad</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${selectedRow.serviceItems
                     .map(
                       (service) => `<tr>
                         <td>${escapeHtml(service.parameterLabel)}</td>
                         <td class="right">${service.quantity}</td>
                       </tr>`
                     )
                     .join('')}
                 </tbody>
               </table>
             </div>`
           : ''
       }
       ${
         selectedRow.notes?.trim()
           ? `<div class="section"><h3>Notas</h3><p class="line">${escapeHtml(selectedRow.notes)}</p></div>`
           : ''
       }`
    );

    downloadHtml(`orden-trabajo-${selectedRow.workOrderNumber}.html`, html);
    toast.success('Resumen descargado correctamente');
  };

  const handleDialogPrint = () => {
    if (!selectedRow) return;
    const printed = openPrintWindow(
      buildPrintDocumentHtml(
        `Orden de trabajo ${selectedRow.workOrderNumber}`,
        `<h1>Resumen de orden de trabajo</h1>
         <p class="sub">N° OT: ${escapeHtml(selectedRow.workOrderNumber)}</p>
         <div class="section">
           <h3>Cliente</h3>
           <p class="line"><strong>Razón social:</strong> ${escapeHtml(selectedRow.client.businessName || '—')}</p>
           <p class="line"><strong>RUC:</strong> ${escapeHtml(selectedRow.client.taxId || '—')}</p>
           <p class="line"><strong>Contacto:</strong> ${escapeHtml(selectedRow.client.contactName || '—')}</p>
         </div>
         <div class="section">
           <h3>Servicios (${selectedRow.serviceItems.length})</h3>
           ${
             selectedRow.serviceItems.length
               ? `<ul>${selectedRow.serviceItems
                   .map(
                     (service) =>
                       `<li>${escapeHtml(service.parameterLabel)} (x${service.quantity})</li>`
                   )
                   .join('')}</ul>`
               : '<p class="line">No hay servicios seleccionados.</p>'
           }
         </div>`
      )
    );
    if (!printed) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }
    toast.success('Abriendo vista de impresión…');
  };

  useEffect(() => {
    const requestsQuery = query(collection(db, FIRESTORE_COLLECTIONS.REQUESTS));
    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const nextMap: Record<string, WorkOrderRow['serviceItems']> = {};
      snapshot.docs.forEach((docSnap) => {
        const value = docSnap.data() as Record<string, unknown>;
        const rawServiceItems =
          value.services &&
          typeof value.services === 'object' &&
          !Array.isArray(value.services)
            ? (value.services as { items?: unknown[] }).items
            : Array.isArray(value.services)
              ? (value.services as unknown[])
              : [];
        const serviceItems = Array.isArray(rawServiceItems)
          ? rawServiceItems.map((item, index) => {
              const rowItem = item as {
                serviceId?: string;
                parameterId?: string;
                parameterLabel?: string;
                tableLabel?: string | null;
                unit?: string | null;
                method?: string | null;
                rangeMin?: string;
                rangeMax?: string;
                quantity?: number;
                unitPrice?: number | null;
                discountAmount?: number | null;
              };
              return {
                serviceId: String(
                  rowItem.serviceId ?? rowItem.parameterId ?? `service-${index}`
                ),
                parameterId: String(
                  rowItem.parameterId ?? rowItem.serviceId ?? `p-${index}`
                ),
                parameterLabel: String(
                  rowItem.parameterLabel ?? rowItem.parameterId ?? 'Servicio'
                ),
                tableLabel:
                  typeof rowItem.tableLabel === 'string'
                    ? rowItem.tableLabel
                    : null,
                unit: typeof rowItem.unit === 'string' ? rowItem.unit : null,
                method:
                  typeof rowItem.method === 'string' ? rowItem.method : null,
                rangeMin: String(rowItem.rangeMin ?? ''),
                rangeMax: String(rowItem.rangeMax ?? ''),
                quantity: Math.max(1, Number(rowItem.quantity ?? 1)),
                unitPrice: Number(rowItem.unitPrice ?? 0),
                discountAmount: Math.max(0, Number(rowItem.discountAmount ?? 0))
              };
            })
          : [];
        nextMap[docSnap.id] = serviceItems;
      });
      setSourceRequestServicesById(nextMap);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const workOrdersQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.WORK_ORDERS),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      workOrdersQuery,
      (snapshot) => {
        const nextRows: WorkOrderRow[] = snapshot.docs.map((docSnap) => {
          const value = docSnap.data() as Record<string, unknown>;

          const matrix = normalizeMatrixArray(value.matrix);
          const rawStatus = String(value.status ?? '').toLowerCase();
          const status: WorkOrderStatus =
            rawStatus === 'issued' ||
            rawStatus === 'paused' ||
            rawStatus === 'completed' ||
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

          const rawDirectServices =
            value.services &&
            typeof value.services === 'object' &&
            !Array.isArray(value.services)
              ? (value.services as { items?: unknown[] }).items
              : Array.isArray(value.services)
                ? (value.services as unknown[])
                : [];

          const directServiceItems = Array.isArray(rawDirectServices)
            ? rawDirectServices.map((item, index) => {
                const rowItem = item as {
                  serviceId?: string;
                  parameterId?: string;
                  parameterLabel?: string;
                  tableLabel?: string | null;
                  unit?: string | null;
                  method?: string | null;
                  rangeMin?: string;
                  rangeMax?: string;
                  quantity?: number;
                  unitPrice?: number | null;
                  discountAmount?: number | null;
                };
                return {
                  serviceId: String(
                    rowItem.serviceId ??
                      rowItem.parameterId ??
                      `service-${index}`
                  ),
                  parameterId: String(
                    rowItem.parameterId ?? rowItem.serviceId ?? `p-${index}`
                  ),
                  parameterLabel: String(
                    rowItem.parameterLabel ?? rowItem.parameterId ?? 'Servicio'
                  ),
                  tableLabel:
                    typeof rowItem.tableLabel === 'string'
                      ? rowItem.tableLabel
                      : null,
                  unit: typeof rowItem.unit === 'string' ? rowItem.unit : null,
                  method:
                    typeof rowItem.method === 'string' ? rowItem.method : null,
                  rangeMin: String(rowItem.rangeMin ?? ''),
                  rangeMax: String(rowItem.rangeMax ?? ''),
                  quantity: Math.max(1, Number(rowItem.quantity ?? 1)),
                  unitPrice: Number(rowItem.unitPrice ?? 0),
                  discountAmount: Math.max(
                    0,
                    Number(rowItem.discountAmount ?? 0)
                  )
                };
              })
            : [];

          const sourceRequestId = String(value.sourceRequestId ?? '');
          const fallbackServiceItems = sourceRequestId
            ? sourceRequestServicesById[sourceRequestId] || []
            : [];

          const normalizedServiceItems =
            directServiceItems.length > 0
              ? directServiceItems
              : fallbackServiceItems.length > 0
                ? fallbackServiceItems
                : analysisItems.map((analysis, index) => ({
                    serviceId: `legacy-${index}`,
                    parameterId: `legacy-${index}`,
                    parameterLabel: analysis.parameterLabelEs,
                    tableLabel: null,
                    unit: null,
                    method: null,
                    rangeMin: '',
                    rangeMax: '',
                    quantity: agreedCount > 0 ? agreedCount : 1,
                    unitPrice: Number(analysis.unitPrice ?? 0),
                    discountAmount: 0
                  }));

          return {
            id: docSnap.id,
            workOrderNumber: String(value.workOrderNumber ?? docSnap.id),
            sourceReference: String(value.sourceReference ?? '—'),
            sourceRequestId,
            notes: String(value.notes ?? ''),
            matrix,
            status,
            client,
            serviceItems: normalizedServiceItems,
            sampleItems,
            analysisItems,
            taxPercent: Number.isFinite(taxPercent) ? taxPercent : 15,
            clientBusinessName: clientBusinessName || '—',
            agreedCount,
            analysesCount: normalizedServiceItems.length || analysesCount,
            total: Number.isFinite(total) ? total : 0,
            subtotal: Number.isFinite(subtotal) ? subtotal : 0,
            updatedAtLabel: formatFirestoreTimestamp(value.updatedAt),
            updatedAtMs: firestoreTimestampToMs(value.updatedAt)
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
  }, [sourceRequestServicesById]);

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
        case 'client':
          compare = collator.compare(
            left.clientBusinessName,
            right.clientBusinessName
          );
          break;
        case 'samples':
          compare = left.analysesCount - right.analysesCount;
          break;
        case 'analyses':
          compare = left.analysesCount - right.analysesCount;
          break;
        case 'status':
          compare = collator.compare(
            getStatusDisplayLabel(left),
            getStatusDisplayLabel(right)
          );
          break;
        case 'total':
          compare = left.total - right.total;
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
          : row.status === 'completed'
            ? 'verde suave'
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
        row.matrix.join(','),
        row.status,
        WORK_ORDER_STATUS_LABEL_MAP[row.status],
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
        columnCount={9}
        rowCount={8}
        filterCount={0}
        withViewOptions={false}
        withPagination={false}
        cellWidths={[
          '12rem',
          '14rem',
          '6rem',
          '6rem',
          '6rem',
          '8rem',
          '12rem',
          '14rem',
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

      <div className='max-w-full overflow-x-hidden rounded-md border'>
        <div className='max-h-[calc(100vh-240px)] overflow-x-hidden overflow-y-auto'>
          <table className='w-full table-fixed text-left text-sm'>
            <thead className='bg-muted text-muted-foreground sticky top-0 z-10'>
              <tr>
                <th className='w-[8rem] px-3 py-3 md:w-[11rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('reference')}
                  >
                    Referencia{getSortIndicator('reference')}
                  </button>
                </th>
                <th className='w-[8rem] px-3 py-3 md:w-[11rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('status')}
                  >
                    Estado{getSortIndicator('status')}
                  </button>
                </th>
                <th className='w-[8rem] px-3 py-3 md:w-[10rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('client')}
                  >
                    Cliente{getSortIndicator('client')}
                  </button>
                </th>
                <th className='w-[4.5rem] px-3 py-3 text-right md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('samples')}
                  >
                    Servicios{getSortIndicator('samples')}
                  </button>
                </th>
                <th className='w-[5.5rem] px-3 py-3 text-right md:w-[6rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('total')}
                  >
                    Total{getSortIndicator('total')}
                  </button>
                </th>
                <th className='w-[10rem] px-3 py-3 md:w-[19rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('updatedAt')}
                  >
                    Última Actualización{getSortIndicator('updatedAt')}
                  </button>
                </th>
                <th className='min-w-0 px-3 py-3 md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('notes')}
                  >
                    Notas{getSortIndicator('notes')}
                  </button>
                </th>
                <th className='w-10 px-1 py-3 text-right md:w-12 md:px-2'></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const isWorkOrderPaused = row.status === 'paused';
                const isWorkOrderIssued = row.status === 'issued';
                const isWorkOrderCompleted = row.status === 'completed';
                const isWorkOrderCancelled = row.status === 'cancelled';

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
                    <td className='w-[8rem] px-3 py-3 md:w-[11rem] md:px-4'>
                      <div className='space-y-0.5'>
                        <p>{row.workOrderNumber}</p>
                        <p className='text-muted-foreground text-xs'>
                          {row.sourceReference || '—'}
                        </p>
                      </div>
                    </td>
                    <td
                      className={`w-[8rem] px-3 py-3 md:w-[11rem] md:px-4 ${
                        row.status === 'cancelled'
                          ? 'text-destructive'
                          : row.status === 'completed'
                            ? 'text-emerald-700 dark:text-white'
                            : ''
                      }`}
                    >
                      {getStatusDisplayLabel(row)}
                    </td>
                    <td className='w-[8rem] px-3 py-3 md:w-[10rem] md:px-4'>
                      <span className='block w-full max-w-full truncate'>
                        {row.clientBusinessName}
                      </span>
                    </td>
                    <td className='w-[4.5rem] px-3 py-3 text-right md:px-4'>
                      {row.analysesCount}
                    </td>
                    <td className='w-[5.5rem] px-3 py-3 text-right md:w-[6rem] md:px-4'>
                      ${row.total.toFixed(2).replace('.', ',')}
                    </td>
                    <td className='w-[10rem] px-3 py-3 md:w-[19rem] md:px-4'>
                      <span className='block w-full max-w-full truncate'>
                        {row.updatedAtLabel}
                      </span>
                    </td>
                    <td className='min-w-0 px-3 py-3 md:px-4'>
                      {row.notes?.trim() ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className='block w-full max-w-full truncate align-bottom'>
                              {row.notes}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side='bottom'
                            className='max-w-[28rem] break-words whitespace-pre-wrap'
                          >
                            {row.notes}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='w-10 px-1 py-3 text-right md:w-12 md:px-2'>
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
                              Ver orden de trabajo
                            </DropdownMenuItem>
                            {isWorkOrderCancelled ? null : (
                              <DropdownMenuItem
                                className='cursor-pointer transition-colors duration-150'
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(
                                    `/dashboard/lab-analysis?workOrderId=${encodeURIComponent(row.id)}`
                                  );
                                }}
                              >
                                Registro de análisis de laboratorio
                              </DropdownMenuItem>
                            )}
                            {isWorkOrderCompleted ||
                            isWorkOrderCancelled ? null : (
                              <DropdownMenuItem
                                className='cursor-pointer transition-colors duration-150'
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setRowToComplete(row);
                                  setIsCompleteDialogOpen(true);
                                }}
                                disabled={pendingActionId === row.id}
                              >
                                Finalizar orden de trabajo
                              </DropdownMenuItem>
                            )}
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
        <DialogContent
          className='max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl'
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className='bg-background shrink-0 border-b px-6 py-4 pr-12'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <DialogTitle>Resumen de orden de trabajo</DialogTitle>
                <DialogDescription>
                  Vista consolidada de cliente, servicios y costos.
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
                      onClick={handleDialogDownload}
                      aria-label='Descargar orden de trabajo'
                    >
                      <IconDownload className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Descargar orden de trabajo</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className={dialogActionButtonClass}
                      onClick={handleDialogPrint}
                      aria-label='Imprimir orden de trabajo'
                    >
                      <IconPrinter className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Imprimir orden de trabajo</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </DialogHeader>

          {selectedRow && (
            <div className='max-h-[calc(90vh-88px)] overflow-y-auto overscroll-none'>
              <div className='space-y-5 px-6 py-5'>
                {getWorkOrderDialogBanner(selectedRow) ? (
                  <div
                    className={`${getWorkOrderDialogBanner(selectedRow)?.className} mx-0 mt-0`}
                  >
                    {getWorkOrderDialogBanner(selectedRow)?.text}
                  </div>
                ) : null}

                {selectedRow.notes?.trim() ? (
                  <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Notas
                    </h4>
                    <p className='whitespace-pre-wrap'>{selectedRow.notes}</p>
                  </div>
                ) : null}

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
                    Servicios ({selectedRow.serviceItems.length})
                  </h4>
                  <div className='space-y-1'>
                    {selectedRow.serviceItems.length > 0 ? (
                      selectedRow.serviceItems.map((service, index) => (
                        <p
                          key={`${service.serviceId}-${index}`}
                          className='text-sm'
                        >
                          {service.parameterLabel}
                        </p>
                      ))
                    ) : (
                      <p className='text-sm'>No hay servicios seleccionados.</p>
                    )}
                  </div>
                </div>

                {selectedRow.serviceItems.length > 0 ? (
                  <div className='space-y-2 rounded-md border p-4'>
                    <h4 className='text-muted-foreground font-semibold'>
                      Detalle de servicios
                    </h4>
                    <div className='overflow-x-auto rounded-md border'>
                      <table className='w-full text-left text-sm'>
                        <thead className='bg-muted text-muted-foreground'>
                          <tr>
                            <th className='p-2'>Parámetro</th>
                            <th className='p-2 text-right'>Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRow.serviceItems.map((service, index) => (
                            <tr
                              key={`${service.serviceId}-${index}`}
                              className='border-t'
                            >
                              <td className='p-2'>{service.parameterLabel}</td>
                              <td className='p-2 text-right'>
                                {service.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isCompleteDialogOpen}
        onOpenChange={(open) => {
          if (isCompleting) return;
          setIsCompleteDialogOpen(open);
          if (!open) setRowToComplete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar finalización de orden de trabajo
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea finalizar esta orden de trabajo? Esta
              acción actualizará también la solicitud vinculada como finalizada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isCompleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer'
              onClick={handleConfirmCompleteWorkOrder}
              disabled={isCompleting}
            >
              {isCompleting ? 'Finalizando…' : 'Finalizar orden de trabajo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
