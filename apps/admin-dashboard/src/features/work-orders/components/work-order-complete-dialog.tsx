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
  open: boolean;
  isCompleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
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
            onClick={onConfirm}
            disabled={isCompleting}
          >
            {isCompleting ? 'Finalizando…' : 'Finalizar orden de trabajo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
