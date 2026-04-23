'use client';

import { Check, ChevronDown, Search, X } from 'lucide-react';
import { IconFilterPlus } from '@tabler/icons-react';
import { Dispatch, SetStateAction } from 'react';

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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  DIALOG_FILTER_LABELS,
  type DialogFilterKey,
  type DialogFilters,
  type ServiceFilterOption
} from '@/features/configurator/lib/configurator-form-model';
import { ImportedServiceDocument } from '@/features/configurator/services/configurations';

type LockedServiceCursorHint = {
  visible: boolean;
  x: number;
  y: number;
};

interface ConfiguratorServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeComboMatrix: string | null;
  dialogSelectedServiceIds: string[];
  selectedDialogServiceLabels: string[];
  dialogComboTitle: string;
  isAddFilterDropdownOpen: boolean;
  setIsAddFilterDropdownOpen: (open: boolean) => void;
  dialogFilterOptionsByKey: Record<DialogFilterKey, ServiceFilterOption[]>;
  dialogFilters: DialogFilters;
  handleToggleDialogFilterValue: (key: DialogFilterKey, value: string) => void;
  activeDialogFiltersCount: number;
  dialogSearchTerm: string;
  setDialogSearchTerm: (value: string) => void;
  handleClearDialogFilters: () => void;
  isAppliedFiltersExpanded: boolean;
  setIsAppliedFiltersExpanded: Dispatch<SetStateAction<boolean>>;
  handleRemoveDialogFilterValue: (key: DialogFilterKey, value: string) => void;
  filteredAvailableServices: ImportedServiceDocument[];
  areAllVisibleSelected: boolean;
  visibleServiceIds: string[];
  handleSelectAllVisibleToggle: (
    checked: boolean,
    visibleServiceIds: string[]
  ) => void;
  isLoadingAvailableServices: boolean;
  availableServices: ImportedServiceDocument[];
  getMatEnsayoLabel: (service: ImportedServiceDocument) => string;
  dialogLockedServiceIds: string[];
  handleToggleServiceSelection: (serviceId: string) => void;
  lockedServiceCursorHint: LockedServiceCursorHint;
  setLockedServiceCursorHint: Dispatch<SetStateAction<LockedServiceCursorHint>>;
  handleAddServicesToForm: () => void;
}

export function ConfiguratorServicesDialog({
  open,
  onOpenChange,
  activeComboMatrix,
  dialogSelectedServiceIds,
  selectedDialogServiceLabels,
  dialogComboTitle,
  isAddFilterDropdownOpen,
  setIsAddFilterDropdownOpen,
  dialogFilterOptionsByKey,
  dialogFilters,
  handleToggleDialogFilterValue,
  activeDialogFiltersCount,
  dialogSearchTerm,
  setDialogSearchTerm,
  handleClearDialogFilters,
  isAppliedFiltersExpanded,
  setIsAppliedFiltersExpanded,
  handleRemoveDialogFilterValue,
  filteredAvailableServices,
  areAllVisibleSelected,
  visibleServiceIds,
  handleSelectAllVisibleToggle,
  isLoadingAvailableServices,
  availableServices,
  getMatEnsayoLabel,
  dialogLockedServiceIds,
  handleToggleServiceSelection,
  lockedServiceCursorHint,
  setLockedServiceCursorHint,
  handleAddServicesToForm
}: ConfiguratorServicesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='flex h-[88vh] max-h-[88vh] w-[96vw] max-w-[1100px] flex-col overflow-x-hidden sm:max-w-[1100px]'>
        <AlertDialogHeader>
          <div className='flex items-center gap-2'>
            <AlertDialogTitle className='shrink-0'>
              Combo de servicios
            </AlertDialogTitle>
            {activeComboMatrix ? (
              <span className='bg-muted text-muted-foreground inline-flex max-w-[70%] items-center rounded-full border px-2.5 py-1 text-sm'>
                <span className='mr-1 font-medium'>Matriz:</span>
                <span className='truncate' title={activeComboMatrix}>
                  {activeComboMatrix}
                </span>
              </span>
            ) : null}
            {dialogSelectedServiceIds.length > 0 ? (
              <HoverCard openDelay={80} closeDelay={150}>
                <HoverCardTrigger asChild>
                  <span className='inline-flex cursor-default items-center rounded-full border border-black bg-black px-2.5 py-1 text-sm text-white dark:border-white dark:bg-white dark:text-black'>
                    {dialogSelectedServiceIds.length} seleccionados
                  </span>
                </HoverCardTrigger>
                <HoverCardContent
                  align='start'
                  side='bottom'
                  sideOffset={8}
                  className='max-h-[19.2rem] w-[25.4rem] max-w-[25.4rem] overflow-y-auto p-3'
                  onWheel={(event) => event.stopPropagation()}
                >
                  <div className='space-y-1'>
                    <p className='text-xs font-medium'>
                      Servicios seleccionados
                    </p>
                    <ul className='list-disc space-y-0.5 pl-4 text-xs'>
                      {selectedDialogServiceLabels.map((label, index) => (
                        <li key={`${label}-${index}`}>{label}</li>
                      ))}
                    </ul>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ) : (
              <span className='bg-muted text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-1 text-sm'>
                {dialogSelectedServiceIds.length} seleccionados
              </span>
            )}
          </div>
          <AlertDialogDescription className='m-0'>
            Selecciona uno o varios servicios para incluir en el combo "
            {dialogComboTitle}".
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='min-w-0 space-y-3'>
          <div className='flex min-w-0 flex-wrap items-center gap-2'>
            <DropdownMenu
              open={isAddFilterDropdownOpen}
              onOpenChange={setIsAddFilterDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='bg-muted/35 text-foreground hover:bg-muted/55 h-9 gap-1.5 text-xs shadow-none'
                >
                  <IconFilterPlus className='h-3.7 w-3.7' />
                  Agregar filtro
                  <ChevronDown className='h-3.5 w-3.5' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-60'>
                {(Object.keys(DIALOG_FILTER_LABELS) as DialogFilterKey[]).map(
                  (filterKey) => (
                    <DropdownMenuSub key={filterKey}>
                      <DropdownMenuSubTrigger className='text-sm'>
                        <span>{DIALOG_FILTER_LABELS[filterKey]}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent
                        className={`max-h-[27rem] max-w-[84vw] overflow-y-auto ${
                          filterKey === 'tabla' ? 'w-[41rem]' : 'w-[36rem]'
                        }`}
                      >
                        {dialogFilterOptionsByKey[filterKey].map((option) => {
                          const isChecked = dialogFilters[filterKey].includes(
                            option.value
                          );
                          const isUnavailable = option.count === 0;
                          const isDisabled = isUnavailable && !isChecked;

                          const item = (
                            <DropdownMenuCheckboxItem
                              key={`${filterKey}-${option.value}`}
                              checked={isChecked}
                              onCheckedChange={() =>
                                handleToggleDialogFilterValue(
                                  filterKey,
                                  option.value
                                )
                              }
                              className={`w-full pr-2 ${
                                isUnavailable ? 'text-muted-foreground' : ''
                              }`}
                              disabled={isDisabled}
                            >
                              <span
                                className='min-w-0 flex-1 truncate'
                                title={option.value}
                              >
                                {option.value}
                              </span>
                              <span className='text-muted-foreground ml-2 shrink-0 text-xs'>
                                {option.count}
                              </span>
                            </DropdownMenuCheckboxItem>
                          );

                          if (!isUnavailable) return item;

                          return (
                            <Tooltip key={`${filterKey}-${option.value}`}>
                              <TooltipTrigger asChild>
                                <span className='block'>{item}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                No disponible con los filtros actuales
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {activeDialogFiltersCount > 0 || dialogSearchTerm.trim().length > 0 ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='border-border bg-muted/40 text-foreground hover:bg-muted/55 h-9 gap-1.5 text-xs'
                onClick={handleClearDialogFilters}
              >
                <X className='h-2.5 w-2.5' />
                Limpiar filtros
              </Button>
            ) : null}
          </div>

          {activeDialogFiltersCount > 0 ? (
            <div className='space-y-2'>
              <button
                type='button'
                className='inline-flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left'
                onClick={() =>
                  setIsAppliedFiltersExpanded((previous) => !previous)
                }
              >
                <span className='text-foreground/85 text-sm font-medium'>
                  Filtros ({activeDialogFiltersCount})
                </span>
                <span className='bg-border mx-1 h-px flex-1' />
                <ChevronDown
                  className={`text-muted-foreground h-4 w-4 transition-transform ${
                    isAppliedFiltersExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isAppliedFiltersExpanded ? (
                <div className='bg-muted/20 space-y-2 rounded-md border p-3'>
                  {(Object.keys(DIALOG_FILTER_LABELS) as DialogFilterKey[]).map(
                    (filterKey) => {
                      const selectedValues = dialogFilters[filterKey];
                      if (selectedValues.length === 0) return null;

                      return (
                        <div key={filterKey} className='space-y-1'>
                          <p className='text-muted-foreground text-xs font-medium'>
                            {DIALOG_FILTER_LABELS[filterKey]}
                          </p>
                          <div className='flex flex-wrap gap-1.5'>
                            {selectedValues.map((value) => (
                              <span
                                key={`${filterKey}-${value}`}
                                title={value}
                                className='bg-background inline-flex max-w-[24rem] items-center gap-1 rounded-md border px-2 py-1 text-[11px]'
                              >
                                <span className='truncate'>{value}</span>
                                <button
                                  type='button'
                                  aria-label={`Quitar filtro ${value}`}
                                  className='text-muted-foreground hover:text-foreground inline-flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded-sm'
                                  onClick={() =>
                                    handleRemoveDialogFilterValue(
                                      filterKey,
                                      value
                                    )
                                  }
                                >
                                  <X className='h-3 w-3' />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className='mt-1 flex items-center gap-3'>
          <div className='relative min-w-0 flex-1'>
            <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              value={dialogSearchTerm}
              onChange={(event) => setDialogSearchTerm(event.target.value)}
              placeholder='Buscar por parámetro, método, norma, tabla, unidad o material...'
              className='w-full pl-9'
            />
          </div>
          {filteredAvailableServices.length > 1 &&
          filteredAvailableServices.length <= 30 ? (
            <div className='flex shrink-0 items-center gap-2'>
              <label className='text-muted-foreground flex shrink-0 cursor-pointer items-center gap-2 text-xs sm:text-sm'>
                <Checkbox
                  checked={areAllVisibleSelected}
                  onCheckedChange={(checked) =>
                    handleSelectAllVisibleToggle(
                      checked === true,
                      visibleServiceIds
                    )
                  }
                  disabled={filteredAvailableServices.length === 0}
                  className='cursor-pointer'
                />
                Seleccionar todos
              </label>
            </div>
          ) : null}
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
          {isLoadingAvailableServices ? (
            <p className='text-muted-foreground text-sm'>
              Cargando servicios...
            </p>
          ) : availableServices.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              No hay servicios disponibles. Importalos desde Administración.
            </p>
          ) : filteredAvailableServices.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              No hay servicios para los filtros aplicados.
            </p>
          ) : (
            <div className='grid auto-rows-fr grid-cols-2 gap-2 max-[900px]:grid-cols-1'>
              {filteredAvailableServices.map((service) => {
                const serviceId = service.ID_CONFIG_PARAMETRO || service.id;
                const isSelected = dialogSelectedServiceIds.includes(serviceId);
                const isLockedSelection =
                  isSelected && dialogLockedServiceIds.includes(serviceId);

                const cardButton = (
                  <button
                    key={serviceId}
                    type='button'
                    className={`flex h-full w-full items-start justify-start rounded-md border p-3 text-left transition-colors ${
                      isLockedSelection
                        ? 'border-border bg-muted/35 cursor-not-allowed'
                        : isSelected
                          ? 'border-black/60 bg-black/10 dark:border-white/70 dark:bg-white/10'
                          : 'hover:bg-muted/50 border-border'
                    }`}
                    onClick={() => handleToggleServiceSelection(serviceId)}
                    disabled={isLockedSelection}
                  >
                    <div className='flex w-full items-start justify-between gap-2'>
                      <div className='space-y-1'>
                        <p className='text-sm font-medium'>
                          {service.ID_PARAMETRO || serviceId}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {getMatEnsayoLabel(service)}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {service.ID_TABLA_NORMA || 'Sin tabla'}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          Límite interno: {service.LIM_INF_INTERNO || '—'} a{' '}
                          {service.LIM_SUP_INTERNO || '—'} (
                          {service.UNIDAD_NORMA ||
                            service.UNIDAD_INTERNO ||
                            'Sin unidad'}
                          )
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {service.ID_TECNICA ||
                            service.ID_MET_REFERENCIA ||
                            service.ID_MET_INTERNO ||
                            'Sin método'}
                        </p>
                      </div>
                      {isSelected ? (
                        <span
                          className={`inline-flex aspect-square size-[1.125rem] shrink-0 items-center justify-center self-start rounded-full leading-none ${
                            isLockedSelection
                              ? 'bg-muted-foreground/60 text-white'
                              : 'bg-black/90 text-white dark:bg-white/80 dark:text-black'
                          }`}
                        >
                          <Check className='h-2.5 w-2.5' strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>
                  </button>
                );

                if (isLockedSelection) {
                  return (
                    <span
                      key={serviceId}
                      className='block h-full'
                      onMouseEnter={(event) =>
                        setLockedServiceCursorHint({
                          visible: true,
                          x: event.clientX,
                          y: event.clientY
                        })
                      }
                      onMouseMove={(event) =>
                        setLockedServiceCursorHint({
                          visible: true,
                          x: event.clientX,
                          y: event.clientY
                        })
                      }
                      onMouseLeave={() =>
                        setLockedServiceCursorHint((prev) => ({
                          ...prev,
                          visible: false
                        }))
                      }
                    >
                      {cardButton}
                    </span>
                  );
                }

                return (
                  <div key={serviceId} className='h-full'>
                    {cardButton}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {lockedServiceCursorHint.visible ? (
          <div
            className='bg-popover text-popover-foreground pointer-events-none fixed z-[120] rounded-md border px-2 py-1 text-xs shadow-md'
            style={{
              left: `${lockedServiceCursorHint.x + -230}px`,
              top: `${lockedServiceCursorHint.y + 10}px`
            }}
          >
            Servicio ya agregado al combo
          </div>
        ) : null}

        <AlertDialogFooter>
          <div className='text-muted-foreground mr-auto text-xs sm:text-sm'>
            {filteredAvailableServices.length} resultados
          </div>
          <AlertDialogCancel className='cursor-pointer'>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className='cursor-pointer bg-black text-white hover:bg-black/90'
            onClick={handleAddServicesToForm}
            disabled={
              isLoadingAvailableServices ||
              availableServices.length === 0 ||
              dialogSelectedServiceIds.length === 0
            }
          >
            Agregar seleccionados
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
