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
import { Textarea } from '@/components/ui/textarea';
import type { RequestWorkOrderToggleDialogProps } from '@/features/requests/lib/request-component-types';

export function RequestWorkOrderToggleDialog({
  open,
  isTogglingWorkOrder,
  workOrderToggleAction,
  workOrderToggleNotes,
  onOpenChange,
  onNotesChange,
  onConfirm
}: RequestWorkOrderToggleDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {workOrderToggleAction === 'resume'
              ? 'Confirmar reanudación de orden de trabajo'
              : 'Confirmar pausa de orden de trabajo'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {workOrderToggleAction === 'resume'
              ? '¿Está seguro de que desea reanudar esta orden de trabajo?'
              : '¿Está seguro de que desea pausar esta orden de trabajo?'}
          </AlertDialogDescription>
          <div className='space-y-2 pt-1'>
            <label className='text-sm font-medium'>Notas</label>
            <Textarea
              value={workOrderToggleNotes}
              placeholder='Ingrese notas para la solicitud y la orden de trabajo'
              rows={4}
              disabled={isTogglingWorkOrder}
              onChange={(event) => onNotesChange(event.target.value)}
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className='cursor-pointer'
            disabled={isTogglingWorkOrder}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className='cursor-pointer bg-black text-white hover:bg-black/90 disabled:bg-black disabled:text-white'
            disabled={isTogglingWorkOrder}
            onClick={onConfirm}
          >
            {isTogglingWorkOrder
              ? workOrderToggleAction === 'resume'
                ? 'Reanudando…'
                : 'Pausando…'
              : workOrderToggleAction === 'resume'
                ? 'Reanudar orden de trabajo'
                : 'Pausar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
