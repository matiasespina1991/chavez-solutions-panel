import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';

interface ServicesCatalogToolbarActionsProps {
  selectedRowsCount: number;
  dirtyRowsCount: number;
  hasSingleSelectedRow: boolean;
  isSaving: boolean;
  isCreatingService: boolean;
  isDeletingService: boolean;
  onPrimaryAction: () => void;
  onRequestBulkDelete: () => void;
  onSaveChanges: () => void;
}

export function ServicesCatalogToolbarActions({
  selectedRowsCount,
  dirtyRowsCount,
  hasSingleSelectedRow,
  isSaving,
  isCreatingService,
  isDeletingService,
  onPrimaryAction,
  onRequestBulkDelete,
  onSaveChanges
}: ServicesCatalogToolbarActionsProps) {
  return (
    <div className='flex items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='cursor-pointer'
        onClick={onPrimaryAction}
        disabled={isSaving || isCreatingService || isDeletingService}
      >
        {hasSingleSelectedRow ? (
          <Pencil className='h-4 w-4' />
        ) : selectedRowsCount === 0 && dirtyRowsCount === 0 ? (
          <Plus className='h-4 w-4' />
        ) : null}
        {selectedRowsCount > 1
          ? 'Deseleccionar todos'
          : hasSingleSelectedRow
            ? 'Editar servicio'
            : dirtyRowsCount > 0
              ? 'Deshacer cambios'
              : 'Agregar servicio'}
      </Button>

      {selectedRowsCount > 0 ? (
        <Button
          type='button'
          size='sm'
          className='cursor-pointer bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white dark:hover:bg-black/90'
          onClick={onRequestBulkDelete}
          disabled={isSaving || isCreatingService || isDeletingService}
        >
          <Trash2 className='h-4 w-4' />
          Eliminar servicio(s)
        </Button>
      ) : (
        <Button
          type='button'
          size='sm'
          onClick={onSaveChanges}
          disabled={isSaving || isCreatingService || dirtyRowsCount === 0}
        >
          {isSaving ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Save className='h-4 w-4' />
          )}
          Guardar cambios ({dirtyRowsCount})
        </Button>
      )}
    </div>
  );
}
