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

interface ServicesCatalogConfirmDialogsProps {
  isDiscardCreateDialogOpen: boolean;
  onSetDiscardCreateDialogOpen: (open: boolean) => void;
  onConfirmDiscardCreateServiceDraft: () => void;
  isBulkDeleteDialogOpen: boolean;
  onSetBulkDeleteDialogOpen: (open: boolean) => void;
  isRowDeleteDialogOpen: boolean;
  onSetRowDeleteDialogOpen: (open: boolean) => void;
  isDeletingService: boolean;
  selectedRowsCount: number;
  onConfirmBulkDeleteRows: () => void;
  onConfirmDeleteRow: () => void;
}

export function ServicesCatalogConfirmDialogs({
  isDiscardCreateDialogOpen,
  onSetDiscardCreateDialogOpen,
  onConfirmDiscardCreateServiceDraft,
  isBulkDeleteDialogOpen,
  onSetBulkDeleteDialogOpen,
  isRowDeleteDialogOpen,
  onSetRowDeleteDialogOpen,
  isDeletingService,
  selectedRowsCount,
  onConfirmBulkDeleteRows,
  onConfirmDeleteRow
}: ServicesCatalogConfirmDialogsProps) {
  return (
    <>
      <AlertDialog
        open={isDiscardCreateDialogOpen}
        onOpenChange={onSetDiscardCreateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar cambios</AlertDialogTitle>
            <AlertDialogDescription>
              Hay información escrita en el formulario. ¿Desea cerrar y perder
              los cambios?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90 dark:bg-red-800 dark:text-white dark:hover:bg-red-700'
              onClick={onConfirmDiscardCreateServiceDraft}
            >
              Descartar y cerrar
            </AlertDialogAction>
            <AlertDialogCancel className='cursor-pointer'>
              Seguir editando
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeletingService) {
            onSetBulkDeleteDialogOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicios seleccionados</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar {selectedRowsCount} servicio
              {selectedRowsCount === 1 ? '' : 's'}? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isDeletingService}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white dark:hover:bg-black/90'
              onClick={onConfirmBulkDeleteRows}
              disabled={isDeletingService || selectedRowsCount === 0}
            >
              {isDeletingService ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isRowDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeletingService) {
            onSetRowDeleteDialogOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar este servicio técnico? Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isDeletingService}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white dark:hover:bg-black/90'
              onClick={onConfirmDeleteRow}
              disabled={isDeletingService}
            >
              {isDeletingService ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
