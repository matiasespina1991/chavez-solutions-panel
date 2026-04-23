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
import { getWorkOrderStatusDisplayLabel } from '@/features/work-orders/lib/work-order-status';
import type { WorkOrderListRow as WorkOrderRow } from '@/types/domain';
import { IconDotsVertical } from '@tabler/icons-react';
import type { WorkOrderSortKey } from '@/features/work-orders/hooks/use-work-orders-list-view-model';

interface WorkOrdersListTableProps {
  visibleRows: WorkOrderRow[];
  hasVisibleRows: boolean;
  pendingActionId: string | null;
  onSort: (key: WorkOrderSortKey) => void;
  getSortIndicator: (key: WorkOrderSortKey) => string;
  onOpenSummary: (row: WorkOrderRow) => void;
  onOpenLabAnalysis: (row: WorkOrderRow) => void;
  onOpenCompleteDialog: (row: WorkOrderRow) => void;
}

export function WorkOrdersListTable({
  visibleRows,
  hasVisibleRows,
  pendingActionId,
  onSort,
  getSortIndicator,
  onOpenSummary,
  onOpenLabAnalysis,
  onOpenCompleteDialog
}: WorkOrdersListTableProps) {
  return (
    <div className='max-w-full overflow-x-hidden rounded-md border'>
      <div className='max-h-[calc(100vh-240px)] overflow-x-hidden overflow-y-auto'>
        <table className='w-full table-fixed text-left text-sm'>
          <thead className='bg-muted text-muted-foreground sticky top-0 z-10'>
            <tr>
              <th className='w-[8rem] px-3 py-3 md:w-[11rem] md:px-4'>
                <button
                  type='button'
                  className='cursor-pointer select-none'
                  onClick={() => onSort('reference')}
                >
                  Referencia{getSortIndicator('reference')}
                </button>
              </th>
              <th className='w-[8rem] px-3 py-3 md:w-[11rem] md:px-4'>
                <button
                  type='button'
                  className='cursor-pointer select-none'
                  onClick={() => onSort('status')}
                >
                  Estado{getSortIndicator('status')}
                </button>
              </th>
              <th className='w-[8rem] px-3 py-3 md:w-[10rem] md:px-4'>
                <button
                  type='button'
                  className='cursor-pointer select-none'
                  onClick={() => onSort('client')}
                >
                  Cliente{getSortIndicator('client')}
                </button>
              </th>
              <th className='w-[4.5rem] px-3 py-3 text-right md:px-4'>
                <button
                  type='button'
                  className='cursor-pointer select-none'
                  onClick={() => onSort('samples')}
                >
                  Servicios{getSortIndicator('samples')}
                </button>
              </th>
              <th className='w-[5.5rem] px-3 py-3 text-right md:w-[6rem] md:px-4'>
                <button
                  type='button'
                  className='cursor-pointer select-none'
                  onClick={() => onSort('total')}
                >
                  Total{getSortIndicator('total')}
                </button>
              </th>
              <th className='w-[10rem] px-3 py-3 md:w-[19rem] md:px-4'>
                <button
                  type='button'
                  className='cursor-pointer select-none'
                  onClick={() => onSort('updatedAt')}
                >
                  Última Actualización{getSortIndicator('updatedAt')}
                </button>
              </th>
              <th className='min-w-0 px-3 py-3 md:px-4'>
                <button
                  type='button'
                  className='cursor-pointer select-none'
                  onClick={() => onSort('notes')}
                >
                  Notas{getSortIndicator('notes')}
                </button>
              </th>
              <th className='w-10 px-1 py-3 text-right md:w-12 md:px-2'></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
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
                  onClick={() => onOpenSummary(row)}
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
                    {getWorkOrderStatusDisplayLabel(row)}
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
                              onOpenSummary(row);
                            }}
                          >
                            Ver orden de trabajo
                          </DropdownMenuItem>
                          {isWorkOrderCancelled ? null : (
                            <DropdownMenuItem
                              className='cursor-pointer transition-colors duration-150'
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenLabAnalysis(row);
                              }}
                            >
                              Registro de análisis de laboratorio
                            </DropdownMenuItem>
                          )}
                          {isWorkOrderCompleted || isWorkOrderCancelled ? null : (
                            <DropdownMenuItem
                              className='cursor-pointer transition-colors duration-150'
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenCompleteDialog(row);
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
  );
}
