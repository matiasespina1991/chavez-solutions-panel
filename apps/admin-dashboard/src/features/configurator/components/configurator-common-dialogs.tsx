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
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface MatrixOption {
  value: string;
  count: number;
}

interface ConfiguratorCommonDialogsProps {
  readonly isMatrixSelectorDialogOpen: boolean;
  readonly setIsMatrixSelectorDialogOpen: (open: boolean) => void;
  readonly matrixOptionsForCombo: MatrixOption[];
  readonly activeComboMatrix: string | null;
  readonly handleSelectComboMatrix: (matrixLabel: string) => void;
  readonly isLoadingAvailableServices: boolean;
  readonly groupToDelete: { id: string; name: string } | null;
  readonly setGroupToDelete: (group: null) => void;
  readonly handleConfirmRemoveGroup: () => void;
  readonly serviceToDelete: { groupId: string; serviceId: string } | null;
  readonly setServiceToDelete: (service: null) => void;
  readonly handleConfirmRemoveService: () => void;
  readonly isSendEmailDialogOpen: boolean;
  readonly setIsSendEmailDialogOpen: (open: boolean) => void;
  readonly recipientEmail: string;
  readonly setRecipientEmail: (value: string) => void;
  readonly referenceLabel: string;
  readonly clientBusinessName: string;
  readonly summaryTotal: number;
  readonly isSendingPreviewEmail: boolean;
  readonly handleSendPreviewEmail: () => void;
  readonly isClearDialogOpen: boolean;
  readonly setIsClearDialogOpen: (open: boolean) => void;
  readonly handleConfirmClearCurrentData: () => void;
}

export function ConfiguratorCommonDialogs({
  isMatrixSelectorDialogOpen,
  setIsMatrixSelectorDialogOpen,
  matrixOptionsForCombo,
  activeComboMatrix,
  handleSelectComboMatrix,
  isLoadingAvailableServices,
  groupToDelete,
  setGroupToDelete,
  handleConfirmRemoveGroup,
  serviceToDelete,
  setServiceToDelete,
  handleConfirmRemoveService,
  isSendEmailDialogOpen,
  setIsSendEmailDialogOpen,
  recipientEmail,
  setRecipientEmail,
  referenceLabel,
  clientBusinessName,
  summaryTotal,
  isSendingPreviewEmail,
  handleSendPreviewEmail,
  isClearDialogOpen,
  setIsClearDialogOpen,
  handleConfirmClearCurrentData
}: ConfiguratorCommonDialogsProps) {
  return (
    <>
      <AlertDialog
        open={isMatrixSelectorDialogOpen}
        onOpenChange={setIsMatrixSelectorDialogOpen}
      >
        <AlertDialogContent className='w-[92vw] max-w-[520px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>Seleccionar matriz del combo</AlertDialogTitle>
            <AlertDialogDescription>
              Elegí la matriz para cargar servicios. Podrás ajustar filtros en
              el siguiente paso.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='max-h-[52vh] space-y-2 overflow-y-auto pr-1'>
            {matrixOptionsForCombo.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                No hay matrices disponibles en el catálogo técnico.
              </p>
            ) : (
              matrixOptionsForCombo.map((option) => (
                <button
                  key={option.value}
                  type='button'
                  className={`flex w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    activeComboMatrix === option.value
                      ? 'border-primary/60 bg-primary/10'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectComboMatrix(option.value)}
                >
                  <span className='truncate'>{option.value}</span>
                  <span className='text-muted-foreground ml-3 shrink-0 text-xs'>
                    {option.count}
                  </span>
                </button>
              ))
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(groupToDelete)}
        onOpenChange={(open) => {
          if (!open) setGroupToDelete(null);
        }}
      >
        <AlertDialogContent className='w-[92vw] max-w-[460px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar combo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar este combo completo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive hover:bg-destructive/90 cursor-pointer text-white'
              onClick={handleConfirmRemoveGroup}
            >
              Eliminar combo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(serviceToDelete)}
        onOpenChange={(open) => {
          if (!open) setServiceToDelete(null);
        }}
      >
        <AlertDialogContent className='w-[92vw] max-w-[460px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar este servicio del combo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive hover:bg-destructive/90 cursor-pointer text-white'
              onClick={handleConfirmRemoveService}
            >
              Eliminar servicio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isSendEmailDialogOpen}
        onOpenChange={setIsSendEmailDialogOpen}
      >
        <AlertDialogContent className='max-w-[34rem]'>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar proforma por email</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará la proforma en PDF con el resumen actual.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='space-y-3'>
            <div className='space-y-1'>
              <label
                htmlFor='send-proforma-email'
                className='text-sm font-medium'
              >
                Email de destino
              </label>
              <Input
                id='send-proforma-email'
                type='email'
                value={recipientEmail}
                placeholder='Email de destino'
                onChange={(event) => setRecipientEmail(event.target.value)}
              />
            </div>
            <div className='space-y-1 rounded-md border p-3 text-sm'>
              <p>
                <span className='font-medium'>Referencia:</span>{' '}
                {referenceLabel}
              </p>
              <p>
                <span className='font-medium'>Cliente:</span>{' '}
                {clientBusinessName || '—'}
              </p>
              <p>
                <span className='font-medium'>Total estimado:</span> $
                {summaryTotal.toFixed(2)}
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isSendingPreviewEmail}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90'
              disabled={isSendingPreviewEmail || isLoadingAvailableServices}
              onClick={handleSendPreviewEmail}
            >
              <span className='inline-flex items-center gap-2'>
                <Send className='h-4 w-4' />
                {isSendingPreviewEmail ? 'Enviando...' : 'Enviar'}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar vaciado de datos</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea vaciar los datos actualmente cargados
              en este configurador? Esta acción eliminará la información en
              curso y no podrá deshacerse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive hover:bg-destructive/90 cursor-pointer text-white'
              onClick={handleConfirmClearCurrentData}
            >
              Vaciar datos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
