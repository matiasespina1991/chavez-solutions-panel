'use client';

import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { Button } from '@/components/ui/button';
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
import { IconDotsVertical, IconPlayerPauseFilled, IconPlayerPlayFilled } from '@tabler/icons-react';
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
  isWorkOrder: boolean;
  matrix: ServiceRequestMatrix;
  status: ServiceRequestStatus;
  clientBusinessName: string;
  agreedCount: number;
  analysesCount: number;
  total: number;
  updatedAtLabel: string;
}

const matrixLabelMap: Record<ServiceRequestMatrix, string> = {
  water: 'Agua',
  soil: 'Suelo'
};

const statusLabelMap: Record<ServiceRequestStatus, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
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
  const [rows, setRows] = useState<ServiceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const handleWorkOrderAction = async (row: ServiceRequestRow) => {
    try {
      setPendingActionId(row.id);

      if (row.isWorkOrder) {
        if (row.status === 'work_order_paused') {
          const result = await resumeWorkOrderFromRequest(row.id);
          toast.success(`Orden de trabajo ${result.workOrderNumber} reanudada`);
        } else {
          const result = await pauseWorkOrderFromRequest(row.id);
          toast.success(`Orden de trabajo ${result.workOrderNumber} pausada`);
        }
      } else {
        const result = await createWorkOrderFromRequest(row.id);
        toast.success(`Orden de trabajo emitida (${result.workOrderNumber})`);
      }
    } catch (error) {
      console.error('[ServiceRequests] action error', error);
      toast.error('No se pudo completar la acción de la orden de trabajo');
    } finally {
      setPendingActionId(null);
    }
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
              ? Number(
                  (value.pricing as { total?: number | null }).total ?? 0
                )
              : 0;

          const agreedCount =
            typeof value.samples === 'object' && value.samples !== null
              ? Number(
                  (value.samples as { agreedCount?: number }).agreedCount ?? 0
                )
              : 0;

          const analysesCount =
            typeof value.analyses === 'object' && value.analyses !== null
              ? Array.isArray(
                  (value.analyses as { items?: unknown[] }).items
                )
                ? ((value.analyses as { items?: unknown[] }).items?.length ?? 0)
                : 0
              : 0;

          const clientBusinessName =
            typeof value.client === 'object' && value.client !== null
              ? String(
                  (value.client as { businessName?: string }).businessName ?? ''
                )
              : '';

          return {
            id: docSnap.id,
            reference: String(value.reference ?? '—'),
            isWorkOrder,
            matrix,
            status,
            clientBusinessName: clientBusinessName || '—',
            agreedCount,
            analysesCount,
            total: Number.isFinite(total) ? total : 0,
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
    return <DataTableSkeleton columnCount={10} rowCount={8} filterCount={0} />;
  }

  if (!hasRows) {
    return (
      <div className='rounded-md border p-8 text-center text-sm text-muted-foreground'>
        Aún no hay solicitudes de servicio registradas.
      </div>
    );
  }

  return (
    <div className='overflow-x-auto rounded-md border'>
      <table className='w-full min-w-[980px] text-left text-sm'>
        <thead className='bg-muted text-muted-foreground'>
          <tr>
            <th className='px-4 py-3'>Referencia</th>
            <th className='px-4 py-3 text-center'>OT</th>
            <th className='px-4 py-3'>Matriz</th>
            <th className='px-4 py-3'>Cliente</th>
            <th className='px-4 py-3 text-right'>Muestras</th>
            <th className='px-4 py-3 text-right'>Análisis</th>
            <th className='px-4 py-3'>Estado</th>
            <th className='px-4 py-3 text-right'>Total (USD)</th>
            <th className='px-4 py-3'>Última Actualización</th>
            <th className='w-12 px-2 py-3 text-right'></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className='border-t'>
              <td className='px-4 py-3'>{row.reference}</td>
              <td className='px-4 py-3 text-center'>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        row.status === 'work_order_paused'
                          ? 'bg-yellow-400'
                          : row.isWorkOrder
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {row.status === 'work_order_paused'
                      ? 'Orden de trabajo pausada'
                      : row.isWorkOrder
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
              <td className='px-4 py-3 text-right'>
                {row.total.toFixed(2).replace('.', ',')}
              </td>
              <td className='px-4 py-3'>{row.updatedAtLabel}</td>
              <td className='w-12 px-2 py-3 text-right'>
                <div className='flex justify-end'>
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
                      <DropdownMenuItem className='cursor-pointer transition-colors duration-150'>
                        Ver solicitud
                      </DropdownMenuItem>
                      <DropdownMenuItem className='cursor-pointer transition-colors duration-150'>
                        Editar solicitud...
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={`cursor-pointer justify-start transition-colors duration-150 ${
                          row.status === 'work_order_paused'
                            ? 'text-emerald-600 focus:text-emerald-600'
                            : 'text-destructive focus:text-destructive'
                        }`}
                        onClick={() => handleWorkOrderAction(row)}
                        disabled={pendingActionId === row.id}
                      >
                        {row.isWorkOrder ? row.status === 'work_order_paused' ? (
                          <span className='inline-flex items-center justify-start gap-0'>
                            <IconPlayerPlayFilled
                              className='h-[0.64rem] w-[0.64rem] text-emerald-600'
                              style={{ transform: 'scale(0.9)', marginRight: '5px' }}
                            />
                            <span>Reanudar orden de trabajo</span>
                          </span>
                        ) : (
                          <span className='inline-flex items-center justify-start gap-0'>
                            <IconPlayerPauseFilled
                              className='h-[0.64rem] w-[0.64rem] text-destructive'
                              style={{ transform: 'scale(0.9)', marginRight: '5px' }}
                            />
                            <span>Pausar orden de trabajo</span>
                          </span>
                        ) : (
                          'Emitir orden de trabajo'
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
