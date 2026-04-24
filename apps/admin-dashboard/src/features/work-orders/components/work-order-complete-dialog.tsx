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

interface WorkOrderCompleteDialogProps {
  readonly open: boolean;
  readonly isCompleting: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
}

export function WorkOrderCompleteDialog({
  open,
  isCompleting,
  onOpenChange,
  onConfirm
}: WorkOrderCompleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
          <AlertDialogCancel className='cursor-pointer' disabled={isCompleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className='cursor-pointer'
            disabled={isCompleting}
            onClick={onConfirm}
          >
            {isCompleting ? 'Finalizando…' : 'Finalizar orden de trabajo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
