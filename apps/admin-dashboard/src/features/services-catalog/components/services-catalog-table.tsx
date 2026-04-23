import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
  Undo2
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  AUTOCOMPLETE_FIELD_KEYS,
  PAGE_SIZE,
  type CreateServiceDraft,
  type EditableFieldKey,
  type ServiceCatalogRow,
  type SortDirection,
  type SortableCatalogFieldKey
} from '@/features/services-catalog/lib/services-catalog-panel-model';

interface ServicesCatalogTableProps {
  hideColumnsFromTechnique: boolean;
  visibleEditableColumns: Array<{
    key: EditableFieldKey;
    label: string;
    minWidth: string;
  }>;
  allPageSelected: boolean;
  hasSomePageSelected: boolean;
  onTogglePageSelection: (checked: boolean) => void;
  onSortBy: (key: SortableCatalogFieldKey) => void;
  renderSortIcon: (key: SortableCatalogFieldKey) => ReactNode;
  isLoading: boolean;
  pageRows: ServiceCatalogRow[];
  dirtySet: Set<string>;
  selectedRowIdsSet: Set<string>;
  onToggleRowSelection: (rowId: string, checked: boolean) => void;
  onCellChange: (rowId: string, field: EditableFieldKey, value: string) => void;
  activeTableAutocomplete: {
    rowId: string;
    field: keyof CreateServiceDraft;
  } | null;
  onCellFocus: (rowId: string, field: keyof CreateServiceDraft) => void;
  onCellBlur: (field: keyof CreateServiceDraft) => void;
  onCloseAutocomplete: () => void;
  getAutocompleteMatches: (key: keyof CreateServiceDraft, query: string) => string[];
  onResetRow: (rowId: string) => void;
  isSaving: boolean;
  isCreatingService: boolean;
  onEditRow: (row: ServiceCatalogRow) => void;
  onDuplicateRow: (row: ServiceCatalogRow) => void;
  onRequestDeleteRow: (row: ServiceCatalogRow) => void;
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function ServicesCatalogTable({
  hideColumnsFromTechnique,
  visibleEditableColumns,
  allPageSelected,
  hasSomePageSelected,
  onTogglePageSelection,
  onSortBy,
  renderSortIcon,
  isLoading,
  pageRows,
  dirtySet,
  selectedRowIdsSet,
  onToggleRowSelection,
  onCellChange,
  activeTableAutocomplete,
  onCellFocus,
  onCellBlur,
  onCloseAutocomplete,
  getAutocompleteMatches,
  onResetRow,
  isSaving,
  isCreatingService,
  onEditRow,
  onDuplicateRow,
  onRequestDeleteRow,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage
}: ServicesCatalogTableProps) {
  return (
    <div className='w-full max-w-full min-w-0 overflow-visible rounded-md border'>
      <Table
        className={
          hideColumnsFromTechnique ? 'min-w-[128rem]' : 'min-w-[170rem]'
        }
      >
        <TableHeader>
          <TableRow>
            <TableHead className='min-w-[2.75rem]'>
              <div className='flex items-center justify-center'>
                <Checkbox
                  className='bg-background cursor-pointer !border-[#9a9a9a] shadow-none dark:!border-[#5f5f5f]'
                  checked={
                    allPageSelected
                      ? true
                      : hasSomePageSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(checked) => onTogglePageSelection(checked === true)}
                  aria-label='Seleccionar filas visibles'
                />
              </div>
            </TableHead>
            <TableHead className='min-w-[6rem]'>
              <button
                type='button'
                className='inline-flex cursor-pointer items-center gap-1.5'
                onClick={() => onSortBy('ID_CONFIG_PARAMETRO')}
              >
                ID Config
                {renderSortIcon('ID_CONFIG_PARAMETRO')}
              </button>
            </TableHead>
            {visibleEditableColumns.map((column) => (
              <TableHead key={column.key} className={column.minWidth}>
                <button
                  type='button'
                  className='inline-flex cursor-pointer items-center gap-1.5'
                  onClick={() => onSortBy(column.key)}
                >
                  {column.label}
                  {renderSortIcon(column.key)}
                </button>
              </TableHead>
            ))}
            <TableHead className='min-w-[5rem] text-right font-bold'>
              Deshacer
            </TableHead>
            <TableHead className='w-[3.5rem] min-w-[3.5rem] text-right'>
              <span className='sr-only'>Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <TableRow key={`skeleton-row-${index}`}>
                <TableCell>
                  <Skeleton className='mx-auto h-4 w-4 rounded-sm' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-6 w-20' />
                </TableCell>
                {visibleEditableColumns.map((column) => (
                  <TableCell key={`skeleton-${index}-${column.key}`}>
                    <Skeleton className='h-8 w-full' />
                  </TableCell>
                ))}
                <TableCell className='w-[3.5rem] min-w-[3.5rem] pl-0 text-right'>
                  <Skeleton className='ml-auto h-8 w-8 rounded-md' />
                </TableCell>
                <TableCell className='text-right'>
                  <Skeleton className='ml-auto h-8 w-8 rounded-md' />
                </TableCell>
              </TableRow>
            ))
          ) : pageRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleEditableColumns.length + 4}
                className='text-muted-foreground py-6 pl-7 text-left text-sm'
              >
                No se encontraron servicios con ese criterio.
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((row) => {
              const isDirty = dirtySet.has(row.id);

              return (
                <TableRow
                  key={row.id}
                  className={
                    isDirty ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                  }
                >
                  <TableCell>
                    <div className='flex items-center justify-center'>
                      <Checkbox
                        className='bg-background cursor-pointer !border-[#9a9a9a] shadow-none dark:!border-[#5f5f5f]'
                        checked={selectedRowIdsSet.has(row.id)}
                        onCheckedChange={(checked) =>
                          onToggleRowSelection(row.id, checked === true)
                        }
                        aria-label={`Seleccionar servicio ${row.ID_CONFIG_PARAMETRO || row.id}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell
                    className='max-w-[6rem] truncate font-mono text-xs'
                    title={row.ID_CONFIG_PARAMETRO || row.id}
                  >
                    {row.ID_CONFIG_PARAMETRO || row.id}
                  </TableCell>

                  {visibleEditableColumns.map((column) => (
                    <TableCell key={`${row.id}-${column.key}`}>
                      {column.key === 'ID_CONDICION_PARAMETRO' ? (
                        <Select
                          value={row.ID_CONDICION_PARAMETRO || 'ACREDITADO'}
                          onValueChange={(value) =>
                            onCellChange(row.id, 'ID_CONDICION_PARAMETRO', value)
                          }
                        >
                          <SelectTrigger className='h-8 w-[5.25rem] min-w-[5.25rem]'>
                            <SelectValue placeholder='Sí' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='ACREDITADO'>Sí</SelectItem>
                            <SelectItem value='NO ACREDITADO'>No</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className='relative'>
                          <Input
                            value={row[column.key]}
                            onChange={(event) =>
                              onCellChange(row.id, column.key, event.target.value)
                            }
                            onFocus={() => {
                              const fieldKey = column.key as keyof CreateServiceDraft;
                              if (!AUTOCOMPLETE_FIELD_KEYS.includes(fieldKey)) {
                                return;
                              }
                              onCellFocus(row.id, fieldKey);
                            }}
                            onBlur={() => {
                              const fieldKey = column.key as keyof CreateServiceDraft;
                              if (!AUTOCOMPLETE_FIELD_KEYS.includes(fieldKey)) {
                                return;
                              }
                              onCellBlur(fieldKey);
                            }}
                            className='h-8'
                          />
                          {AUTOCOMPLETE_FIELD_KEYS.includes(
                            column.key as keyof CreateServiceDraft
                          ) &&
                            activeTableAutocomplete?.rowId === row.id &&
                            activeTableAutocomplete.field ===
                              (column.key as keyof CreateServiceDraft) &&
                            getAutocompleteMatches(
                              column.key as keyof CreateServiceDraft,
                              row[column.key]
                            ).length > 0 && (
                              <div className='bg-popover text-popover-foreground absolute z-50 mt-1 flex max-h-64 w-full flex-col overflow-x-hidden overflow-y-auto rounded-md border shadow-lg'>
                                {getAutocompleteMatches(
                                  column.key as keyof CreateServiceDraft,
                                  row[column.key]
                                ).map((option) => (
                                  <button
                                    key={option}
                                    type='button'
                                    className='hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block w-full cursor-pointer px-3 py-2 text-left text-sm break-words whitespace-normal'
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      onCellChange(row.id, column.key, option);
                                      onCloseAutocomplete();
                                    }}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                      )}
                    </TableCell>
                  ))}

                  <TableCell className='text-right'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-8 px-2'
                          onClick={() => onResetRow(row.id)}
                          disabled={!isDirty}
                        >
                          <Undo2 className='h-4 w-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Deshacer cambios</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className='w-[3.5rem] min-w-[3.5rem] pl-0 text-right'>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 cursor-pointer p-0'
                          disabled={isSaving || isCreatingService}
                        >
                          <span className='sr-only'>Abrir acciones</span>
                          <MoreVertical className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' side='bottom'>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onClick={() => onEditRow(row)}
                        >
                          <Pencil className='h-4 w-4' />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onClick={() => onDuplicateRow(row)}
                        >
                          <Copy className='h-4 w-4' />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='text-destructive focus:text-destructive cursor-pointer'
                          onClick={() => onRequestDeleteRow(row)}
                        >
                          <Trash2 className='text-destructive h-4 w-4' />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-xs'>
          Página {currentPage} de {totalPages}
        </p>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={currentPage <= 1}
            onClick={onPrevPage}
          >
            Anterior
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={currentPage >= totalPages}
            onClick={onNextPage}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
