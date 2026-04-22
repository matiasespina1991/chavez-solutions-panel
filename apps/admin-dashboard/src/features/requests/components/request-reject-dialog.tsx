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

interface RequestRejectDialogProps {
  open: boolean;
  isRejecting: boolean;
  rejectFeedback: string;
  onOpenChange: (open: boolean) => void;
  onRejectFeedbackChange: (value: string) => void;
  onConfirm: () => void;
}

export function RequestRejectDialog({
  open,
  isRejecting,
  rejectFeedback,
  onOpenChange,
  onRejectFeedbackChange,
  onConfirm
}: RequestRejectDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rechazar proforma</AlertDialogTitle>
          <AlertDialogDescription>
            Indique el motivo de rechazo para devolver la solicitud a borrador.
          </AlertDialogDescription>
          <div className='space-y-2 pt-1'>
            <label className='text-sm font-medium'>Motivo de rechazo</label>
            <Textarea
              value={rejectFeedback}
              onChange={(event) => onRejectFeedbackChange(event.target.value)}
              placeholder='Escriba el motivo de rechazo'
              rows={4}
              disabled={isRejecting}
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='cursor-pointer' disabled={isRejecting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className='bg-destructive hover:bg-destructive/90 disabled:bg-destructive cursor-pointer text-white disabled:text-white'
            onClick={onConfirm}
            disabled={isRejecting}
          >
            {isRejecting ? 'Rechazando…' : 'Rechazar proforma'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
