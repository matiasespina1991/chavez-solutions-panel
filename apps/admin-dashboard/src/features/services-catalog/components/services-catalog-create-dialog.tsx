import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AUTOCOMPLETE_FIELD_KEYS,
  CREATE_SERVICE_SECTIONS,
  type CreateServiceDraft
} from '@/features/services-catalog/lib/services-catalog-panel-model';
import { Loader2, Pencil, Plus } from 'lucide-react';

interface ServicesCatalogCreateDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingRowId: string | null;
  readonly isCreatingService: boolean;
  readonly createServiceDraft: CreateServiceDraft;
  readonly activeAutocompleteField: keyof CreateServiceDraft | null;
  readonly onFieldChange: (key: keyof CreateServiceDraft, value: string) => void;
  readonly onFieldFocus: (key: keyof CreateServiceDraft) => void;
  readonly onFieldBlur: (key: keyof CreateServiceDraft) => void;
  readonly onSelectAutocomplete: (key: keyof CreateServiceDraft, value: string) => void;
  readonly getAutocompleteMatches: (key: keyof CreateServiceDraft) => string[];
  readonly isFieldInvalid: (key: keyof CreateServiceDraft) => boolean;
  readonly onRequestClose: () => void;
  readonly onSave: () => void;
}

export function ServicesCatalogCreateDialog({
  open,
  onOpenChange,
  editingRowId,
  isCreatingService,
  createServiceDraft,
  activeAutocompleteField,
  onFieldChange,
  onFieldFocus,
  onFieldBlur,
  onSelectAutocomplete,
  getAutocompleteMatches,
  isFieldInvalid,
  onRequestClose,
  onSave
}: ServicesCatalogCreateDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }

        onRequestClose();
      }}
    >
      <DialogContent
        className='w-[min(96vw,1280px)] !max-w-[1280px] overflow-hidden p-0 sm:!max-w-[1280px]'
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className='flex max-h-[90vh] flex-col'>
          <DialogHeader className='border-b px-6 py-5'>
            <DialogTitle className='flex items-center gap-2'>
              {editingRowId ? (
                <Pencil className='text-muted-foreground h-4 w-4' />
              ) : (
                <Plus className='h-4 w-4' />
              )}
              <span>{editingRowId ? 'Editar servicio' : 'Agregar servicio'}</span>
            </DialogTitle>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto px-6 py-5'>
            <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
              {CREATE_SERVICE_SECTIONS.map((section) => (
                <section
                  key={section.title}
                  className='bg-muted/15 rounded-lg border px-4 py-3'
                >
                  <div className='mb-3'>
                    <h3 className='text-sm font-semibold'>{section.title}</h3>
                    <p className='text-muted-foreground text-xs'>
                      {section.description}
                    </p>
                  </div>

                  <div
                    className={
                      section.fieldsGridClass ??
                      'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'
                    }
                  >
                    {section.fields.map((field) => (
                      <div
                        key={field.key}
                        className={`space-y-1.5 ${(field.className ?? '').replace('md:col-span-2', 'md:col-span-2 xl:col-span-2')}`}
                      >
                        <label
                          htmlFor={`new-service-${field.key}`}
                          className='text-foreground/90 text-[11px] font-semibold tracking-[0.02em] uppercase'
                        >
                          {field.label}
                        </label>
                        {field.key === 'ID_CONDICION_PARAMETRO' ? (
                          <Select
                            value={createServiceDraft.ID_CONDICION_PARAMETRO}
                            onValueChange={(value) =>
                              onFieldChange('ID_CONDICION_PARAMETRO', value)
                            }
                          >
                            <SelectTrigger
                              id={`new-service-${field.key}`}
                              className='bg-background/90 h-9 w-full'
                            >
                              <SelectValue placeholder='ACREDITADO' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='ACREDITADO'>ACREDITADO</SelectItem>
                              <SelectItem value='NO ACREDITADO'>
                                NO ACREDITADO
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className='relative'>
                            <Input
                              id={`new-service-${field.key}`}
                              value={createServiceDraft[field.key]}
                              disabled={
                                editingRowId !== null &&
                                field.key === 'ID_CONFIG_PARAMETRO'
                              }
                              placeholder={field.placeholder}
                              className={`bg-background/90 h-9 ${
                                isFieldInvalid(field.key)
                                  ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                                  : ''
                              }`}
                              onChange={(event) =>
                                onFieldChange(field.key, event.target.value)
                              }
                              onFocus={() => {
                                if (AUTOCOMPLETE_FIELD_KEYS.includes(field.key)) {
                                  onFieldFocus(field.key);
                                }
                              }}
                              onBlur={() => onFieldBlur(field.key)}
                            />
                            {AUTOCOMPLETE_FIELD_KEYS.includes(field.key) &&
                              activeAutocompleteField === field.key &&
                              getAutocompleteMatches(field.key).length > 0 && (
                              <div className='bg-popover text-popover-foreground absolute z-50 mt-1 flex max-h-64 w-full flex-col overflow-x-hidden overflow-y-auto rounded-md border shadow-lg'>
                                {getAutocompleteMatches(field.key).map((option) => (
                                  <button
                                    key={option}
                                    type='button'
                                    className='hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block w-full cursor-pointer px-3 py-2 text-left text-sm break-words whitespace-normal'
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      onSelectAutocomplete(field.key, option);
                                    }}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <DialogFooter className='border-t px-6 py-4 sm:justify-between'>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                className='cursor-pointer'
                disabled={isCreatingService}
                onClick={onRequestClose}
              >
                Cancelar
              </Button>
              <Button
                type='button'
                className='cursor-pointer'
                disabled={isCreatingService}
                onClick={onSave}
              >
                {isCreatingService ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : null}
                {editingRowId ? 'Actualizar servicio' : 'Guardar servicio'}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
