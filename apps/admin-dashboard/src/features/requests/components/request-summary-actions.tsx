import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import type { RequestListRow as RequestRow } from '@/types/domain';
import {
  IconDownload,
  IconPencil,
  IconPlayerPlayFilled,
  IconTrash
} from '@tabler/icons-react';

interface RequestSummaryActionsProps {
  selectedRow: RequestRow | null;
  canShowExecuteWorkOrderButton: boolean;
  canApproveSelectedRow: boolean;
  canEditSelectedRow: boolean;
  pendingActionId: string | null;
  isDialogDownloading: boolean;
  dialogActionButtonClass: string;
  onOpenExecuteWorkOrderDialog: (row: RequestRow) => void;
  onWorkOrderAction: (row: RequestRow) => void;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function RequestSummaryActions({
  selectedRow,
  canShowExecuteWorkOrderButton,
  canApproveSelectedRow,
  canEditSelectedRow,
  pendingActionId,
  isDialogDownloading,
  dialogActionButtonClass,
  onOpenExecuteWorkOrderDialog,
  onWorkOrderAction,
  onEdit,
  onDownload,
  onDelete
}: RequestSummaryActionsProps) {
  return (
    <div className='flex items-center gap-1'>
      {selectedRow && canShowExecuteWorkOrderButton ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className={`${dialogActionButtonClass} text-emerald-600 hover:text-emerald-600`}
              onClick={() => {
                if (canApproveSelectedRow) {
                  onOpenExecuteWorkOrderDialog(selectedRow);
                  return;
                }
                onWorkOrderAction(selectedRow);
              }}
              aria-label='Ejecutar orden de trabajo'
              disabled={pendingActionId === selectedRow.id}
            >
              <IconPlayerPlayFilled className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ejecutar orden de trabajo</TooltipContent>
        </Tooltip>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <span className='inline-flex'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className={dialogActionButtonClass}
              onClick={onEdit}
              aria-label='Editar solicitud'
              disabled={!canEditSelectedRow}
            >
              <IconPencil className='h-4 w-4' />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {canEditSelectedRow
            ? 'Editar solicitud...'
            : 'No se puede editar una orden de trabajo ya emitida'}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className={`${dialogActionButtonClass} ${
              isDialogDownloading ? 'text-muted-foreground' : ''
            }`}
            onClick={onDownload}
            aria-label='Descargar solicitud'
            disabled={isDialogDownloading}
          >
            <span className='relative inline-flex h-4 w-4 items-center justify-center'>
              <IconDownload className='h-4 w-4' />
              {isDialogDownloading ? (
                <span className='absolute inset-0 inline-flex items-center justify-center'>
                  <span className='border-primary h-3 w-3 animate-spin rounded-full border-2 border-t-transparent' />
                </span>
              ) : null}
            </span>
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
            className={`${dialogActionButtonClass} text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10`}
            onClick={onDelete}
            aria-label='Eliminar solicitud'
          >
            <IconTrash className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Eliminar solicitud</TooltipContent>
      </Tooltip>
    </div>
  );
}
