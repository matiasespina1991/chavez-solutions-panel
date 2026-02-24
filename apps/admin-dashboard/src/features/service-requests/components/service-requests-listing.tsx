'use client';

import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
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
  | 'cancelled';

interface ServiceRequestRow {
  id: string;
  reference: string;
  notes: string;
  isWorkOrder: boolean;
  matrix: ServiceRequestMatrix;
  status: ServiceRequestStatus;
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
}

const matrixLabelMap: Record<ServiceRequestMatrix, string> = {
  water: 'Agua',
  soil: 'Suelo'
};

const statusLabelMap: Record<ServiceRequestStatus, string> = {
  draft: '(Borrador)',
  submitted: 'Proforma enviada',
  converted_to_work_order: 'Convertida a OT',
  work_order_paused: 'Orden de trabajo pausada',
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

  const hasIssuedWorkOrder = (row: ServiceRequestRow) =>
    row.status === 'converted_to_work_order' ||
    row.status === 'work_order_paused';

  const handleWorkOrderAction = async (row: ServiceRequestRow) => {
    if (row.status === 'draft') {
      toast.error('No se puede emitir una orden de trabajo desde un borrador');
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
            client,
            sampleItems,
            analysisItems,
            taxPercent: Number.isFinite(taxPercent) ? taxPercent : 15,
            clientBusinessName: clientBusinessName || '—',
            agreedCount,
            analysesCount,
            total: Number.isFinite(total) ? total : 0,
            subtotal: Number.isFinite(subtotal) ? subtotal : 0,
            updatedAtLabel: formatTimestamp(value.updatedAt)
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

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);

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
    <div className='rounded-md border'>
      <div className='max-h-[calc(100vh-240px)] overflow-auto'>
        <table className='w-full min-w-[1120px] text-left text-sm'>
          <thead className='bg-muted text-muted-foreground sticky top-0 z-10'>
            <tr>
              <th className='px-4 py-3'>Referencia</th>
              <th className='px-4 py-3 text-center'>OT</th>
              <th className='px-4 py-3'>Matriz</th>
              <th className='px-4 py-3'>Cliente</th>
              <th className='px-4 py-3 text-right'>Muestras</th>
              <th className='px-4 py-3 text-right'>Análisis</th>
              <th className='px-4 py-3'>Estado</th>
              <th className='px-4 py-3'>Notas</th>
              <th className='px-4 py-3 text-right'>Total (USD)</th>
              <th className='px-4 py-3'>Última Actualización</th>
              <th className='w-12 px-2 py-3 text-right'></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const workOrderIssued = hasIssuedWorkOrder(row);
              const isWorkOrderPaused = row.status === 'work_order_paused';
              const isDraft = row.status === 'draft';

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
                    {row.reference}
                    {row.status === 'draft' && (
                      <span className='text-muted-foreground ml-1 text-xs'>
                        (borrador)
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            isWorkOrderPaused
                              ? 'bg-yellow-400'
                              : workOrderIssued
                                ? 'bg-emerald-500'
                                : 'bg-red-500'
                          }`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {isWorkOrderPaused
                          ? 'Orden de trabajo pausada'
                          : workOrderIssued
                            ? 'Orden de trabajo emitida'
                            : 'Sin orden de trabajo'}
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className='px-4 py-3'>{matrixLabelMap[row.matrix]}</td>
                  <td className='px-4 py-3'>{row.clientBusinessName}</td>
                  <td className='px-4 py-3 text-right'>{row.agreedCount}</td>
                  <td className='px-4 py-3 text-right'>{row.analysesCount}</td>
                  <td className='px-4 py-3'>{statusLabelMap[row.status]}</td>
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
                    {row.total.toFixed(2).replace('.', ',')}
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
                          <DropdownMenuItem
                            className={`cursor-pointer justify-start transition-colors duration-150 ${
                              isDraft
                                ? 'text-muted-foreground focus:text-muted-foreground cursor-not-allowed opacity-60'
                                : !workOrderIssued
                                  ? 'text-foreground focus:text-foreground'
                                  : isWorkOrderPaused
                                    ? 'text-emerald-600 focus:text-emerald-600'
                                    : 'text-destructive focus:text-destructive'
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleWorkOrderAction(row);
                            }}
                            disabled={pendingActionId === row.id || isDraft}
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className='max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl'>
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
                      className='h-8 w-8 cursor-pointer p-0'
                      onClick={handleDialogEdit}
                      aria-label='Editar solicitud'
                    >
                      <IconPencil className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar solicitud</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 cursor-pointer p-0'
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
                      className='h-8 w-8 cursor-pointer p-0'
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
                      className='text-destructive hover:text-destructive h-8 w-8 cursor-pointer p-0'
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
