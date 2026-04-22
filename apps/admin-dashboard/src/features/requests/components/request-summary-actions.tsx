import {
  DialogHeaderActions,
  type DialogHeaderAction
} from '@/components/ui/dialog-header-actions';
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
  onOpenExecuteWorkOrderDialog,
  onWorkOrderAction,
  onEdit,
  onDownload,
  onDelete
}: RequestSummaryActionsProps) {
  const actions: DialogHeaderAction[] = [];

  if (selectedRow && canShowExecuteWorkOrderButton) {
    actions.push({
      id: 'execute-work-order',
      icon: <IconPlayerPlayFilled className='h-4 w-4' />,
      tooltip: 'Ejecutar orden de trabajo',
      ariaLabel: 'Ejecutar orden de trabajo',
      onClick: () => {
        if (canApproveSelectedRow) {
          onOpenExecuteWorkOrderDialog(selectedRow);
          return;
        }
        onWorkOrderAction(selectedRow);
      },
      disabled: pendingActionId === selectedRow.id,
      className: 'text-emerald-600 hover:text-emerald-600'
    });
  }

  actions.push({
    id: 'edit-request',
    icon: <IconPencil className='h-4 w-4' />,
    tooltip: canEditSelectedRow
      ? 'Editar solicitud...'
      : 'No se puede editar una orden de trabajo ya emitida',
    ariaLabel: 'Editar solicitud',
    onClick: onEdit,
    disabled: !canEditSelectedRow
  });

  actions.push({
    id: 'download-request',
    icon: (
      <span className='relative inline-flex h-4 w-4 items-center justify-center'>
        <IconDownload className='h-4 w-4' />
        {isDialogDownloading ? (
          <span className='absolute inset-0 inline-flex items-center justify-center'>
            <span className='border-primary h-3 w-3 animate-spin rounded-full border-2 border-t-transparent' />
          </span>
        ) : null}
      </span>
    ),
    tooltip: 'Descargar solicitud',
    ariaLabel: 'Descargar solicitud',
    onClick: onDownload,
    disabled: isDialogDownloading,
    className: isDialogDownloading ? 'text-muted-foreground' : undefined
  });

  actions.push({
    id: 'delete-request',
    icon: <IconTrash className='h-4 w-4' />,
    tooltip: 'Eliminar solicitud',
    ariaLabel: 'Eliminar solicitud',
    onClick: onDelete,
    className:
      'text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10'
  });

  return <DialogHeaderActions actions={actions} />;
}
