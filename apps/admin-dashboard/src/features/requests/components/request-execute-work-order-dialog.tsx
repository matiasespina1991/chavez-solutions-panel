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
import type { RequestListRow as RequestRow } from '@/types/domain';

interface RequestExecuteWorkOrderDialogProps {
  open: boolean;
  rowToExecuteWorkOrder: RequestRow | null;
  pendingActionId: string | null;
  approverLabel: string;
  nowLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function RequestExecuteWorkOrderDialog({
  open,
  rowToExecuteWorkOrder,
  pendingActionId,
  approverLabel,
  nowLabel,
  onOpenChange,
  onConfirm
}: RequestExecuteWorkOrderDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar ejecución de orden de trabajo</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Desea aprobar esta proforma y dar ejecución a una orden de
            trabajo?
          </AlertDialogDescription>
          <div className='bg-muted/30 mt-2 space-y-2 rounded-md border p-3 text-sm'>
            <p>
              <span className='text-muted-foreground'>Proforma:</span>{' '}
              <span className='font-medium'>
                {rowToExecuteWorkOrder?.reference ?? '—'}
              </span>
            </p>
            <p>
              <span className='text-muted-foreground'>Aprobador:</span>{' '}
              <span className='font-medium'>{approverLabel}</span>
            </p>
            <p>
              <span className='text-muted-foreground'>Fecha:</span>{' '}
              <span className='font-medium'>{nowLabel}</span>
            </p>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className='cursor-pointer'
            disabled={
              !!rowToExecuteWorkOrder &&
              pendingActionId === rowToExecuteWorkOrder.id
            }
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className='cursor-pointer bg-emerald-600 text-white hover:bg-emerald-600/90 disabled:bg-emerald-600 disabled:text-white'
            onClick={onConfirm}
            disabled={
              !rowToExecuteWorkOrder ||
              pendingActionId === rowToExecuteWorkOrder.id
            }
          >
            {rowToExecuteWorkOrder &&
            pendingActionId === rowToExecuteWorkOrder.id
              ? 'Ejecutando…'
              : 'Aprobar y ejecutar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
