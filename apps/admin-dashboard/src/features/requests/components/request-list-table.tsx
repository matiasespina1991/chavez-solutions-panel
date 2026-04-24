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
  getStatusDisplayLabel,
  hasIssuedWorkOrder,
  isExpiredProforma
} from '@/features/requests/lib/request-status';
import type {
  RequestListSortKey,
  RequestListTableProps
} from '@/features/requests/lib/request-component-types';
import {
  IconDotsVertical,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconTrash
} from '@tabler/icons-react';

export function RequestListTable({
  visibleRows,
  hasVisibleRows,
  pendingActionId,
  isDeleting,
  onSort,
  getSortIndicator,
  onOpenSummary,
  onEdit,
  onExecuteWorkOrder,
  onOpenRejectDialog,
  onToggleWorkOrder,
  onOpenDeleteDialog
}: RequestListTableProps) {
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
              <th className='w-10 px-1 py-3 text-right md:w-12 md:px-2' />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const workOrderIssued = hasIssuedWorkOrder(row);
              const isWorkOrderPaused = row.status === 'work_order_paused';
              const isWorkOrderCompleted = row.status === 'work_order_completed';
              const isDraft = row.status === 'draft';
              const isProformaExpired = isExpiredProforma(row);
              const canApproveProforma =
                row.status === 'submitted' &&
                !workOrderIssued &&
                row.approvalStatus !== 'approved';
              const canRejectProforma =
                row.status === 'submitted' && !workOrderIssued;
              const shouldBlockEmissionByApproval =
                row.status === 'submitted' &&
                !workOrderIssued &&
                row.approvalStatus !== 'approved';

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
                    <span className={isDraft ? 'text-destructive' : ''}>
                      {row.reference}
                    </span>
                    {row.status === 'draft' ? (
                      <span className='text-muted-foreground ml-1 text-xs'>
                        {row.approvalStatus === 'rejected'
                          ? '(rechazada)'
                          : '(borrador)'}
                      </span>
                    ) : null}

                    {isProformaExpired ? <span className='text-muted-foreground ml-1 text-xs'>
                      (vencida)
                    </span> : null}
                  </td>
                  <td
                    className={`w-[8rem] px-3 py-3 md:w-[11rem] md:px-4 ${
                      isProformaExpired ? 'text-destructive' : ''
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
                              onOpenSummary(row);
                            }}
                          >
                            Ver solicitud
                          </DropdownMenuItem>
                          {!isWorkOrderCompleted ? (
                            <>
                              {workOrderIssued && !isWorkOrderPaused ? (
                                <Tooltip delayDuration={2000}>
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
                                    onEdit(row);
                                  }}
                                >
                                  Editar solicitud...
                                </DropdownMenuItem>
                              )}
                              {canApproveProforma ? (
                                <DropdownMenuItem
                                  className='cursor-pointer justify-start text-emerald-600 transition-colors duration-150 focus:text-emerald-600'
                                  disabled={pendingActionId === row.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onExecuteWorkOrder(row);
                                  }}
                                >
                                  Ejecutar orden de trabajo
                                </DropdownMenuItem>
                              ) : null}
                              {canRejectProforma ? (
                                <DropdownMenuItem
                                  className='text-destructive focus:text-destructive cursor-pointer justify-start transition-colors duration-150'
                                  disabled={pendingActionId === row.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onOpenRejectDialog(row);
                                  }}
                                >
                                  Rechazar proforma
                                </DropdownMenuItem>
                              ) : null}
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
                              ) : shouldBlockEmissionByApproval ? (
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
                                    Debe aprobar la proforma antes de emitir la
                                    orden de trabajo
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
                                  disabled={pendingActionId === row.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleWorkOrder(row);
                                  }}
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
                                        <span>Pausar</span>
                                      </span>
                                    )
                                  ) : (
                                    'Emitir orden de trabajo'
                                  )}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className='text-destructive focus:text-destructive cursor-pointer transition-colors duration-150'
                                disabled={isDeleting}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenDeleteDialog(row);
                                }}
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
  );
}
