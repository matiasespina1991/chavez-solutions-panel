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

interface RequestDeleteDialogProps {
  open: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function RequestDeleteDialog({
  open,
  isDeleting,
  onOpenChange,
  onConfirm
}: RequestDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar eliminación de solicitud</AlertDialogTitle>
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
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando…' : 'Eliminar Solicitud'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
