'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { type ReactNode, type RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  type SelectedService,
  type SelectedServiceGroup
} from '@/features/configurator/lib/configurator-form-model';
import { type ImportedServiceDocument } from '@/features/configurator/services/configurations';

interface ConfiguratorServicesTabProps {
  readonly groupedServicesForRender: SelectedServiceGroup[];
  readonly isLoadingAvailableServices: boolean;
  readonly handleOpenMatrixSelectorDialog: () => void;
  readonly comboEditServicesButtonClass: string;
  readonly getMatrizLabel: (service: ImportedServiceDocument) => string;
  readonly handleEditGroupServices: (
    group: SelectedServiceGroup,
    matrixLabel: string | null
  ) => void;
  readonly handleUpdateGroupName: (groupId: string, value: string) => void;
  readonly handleOpenRemoveGroupDialog: (group: SelectedServiceGroup) => void;
  readonly serviceUnderlineInputClass: string;
  readonly handleUpdateServiceField: (
    groupId: string,
    serviceId: string,
    field: 'quantity' | 'rangeMin' | 'rangeMax' | 'unitPrice' | 'discountAmount',
    value: string
  ) => void;
  readonly handleOpenRemoveService: (groupId: string, service: SelectedService) => void;
  readonly estimatedCostsSectionRef: RefObject<HTMLDivElement | null>;
  readonly renderEstimatedCostsPanel: () => ReactNode;
  readonly renderTabActions: () => ReactNode;
  readonly shouldShowFloatingEstimatedCosts: boolean;
}

export function ConfiguratorServicesTab({
  groupedServicesForRender,
  isLoadingAvailableServices,
  handleOpenMatrixSelectorDialog,
  comboEditServicesButtonClass,
  getMatrizLabel,
  handleEditGroupServices,
  handleUpdateGroupName,
  handleOpenRemoveGroupDialog,
  serviceUnderlineInputClass,
  handleUpdateServiceField,
  handleOpenRemoveService,
  estimatedCostsSectionRef,
  renderEstimatedCostsPanel,
  renderTabActions,
  shouldShowFloatingEstimatedCosts
}: ConfiguratorServicesTabProps) {
  return (
    <TabsContent value='samples' className='mt-4 space-y-4'>
      <Card className='border-0 shadow-none'>
        <CardHeader>
          <CardTitle>Servicios</CardTitle>
        </CardHeader>
        <CardContent className='relative space-y-4 overflow-visible'>
          <div>
            <div className='space-y-4'>
              <div className='space-y-3 rounded-md border p-4'>
                <div className='border-border flex items-center justify-between gap-2 border-b pb-4'>
                  <div>
                    <h4 className='text-sm font-semibold'>Combos de servicios</h4>
                    <p className='text-muted-foreground text-xs'>
                      Agrega uno o varios combos de servicios.
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    className='cursor-pointer'
                    disabled={isLoadingAvailableServices}
                    onClick={handleOpenMatrixSelectorDialog}
                  >
                    <Plus className='h-4 w-4' />
                    Agregar combo
                  </Button>
                </div>

                {groupedServicesForRender.length === 0 ? (
                  <p className='text-muted-foreground text-sm'>
                    No hay combos de servicios agregados.
                  </p>
                ) : (
                  <div className='space-y-4'>
                    {groupedServicesForRender.map((group) => (
                      <div
                        key={group.id}
                        className='bg-primary/15 border-primary/30 relative space-y-3 overflow-hidden rounded-xl border p-3'
                      >
                        <span
                          aria-hidden='true'
                          className='text-primary/35 absolute top-0 left-0 h-4 w-4 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:3px_3px] [clip-path:polygon(0_0,100%_0,0_100%)]'
                        />
                        <div className='flex items-center justify-between gap-3'>
                          <div className='flex w-full items-center justify-between gap-1'>
                            <div className='relative pt-2'>
                              <span className='text-foreground/90 pointer-events-none absolute -top-0.5 left-2 z-10 rounded-sm bg-transparent px-1.5 text-[10px] leading-none font-semibold'>
                                Título del combo
                              </span>
                              <Input
                                value={group.name}
                                className='dark:!bg-background w-[25rem] max-w-[85vw] !bg-white'
                                placeholder='Nombre del combo'
                                onChange={(event) =>
                                  handleUpdateGroupName(
                                    group.id,
                                    event.target.value
                                  )
                                }
                              />
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  className={`mt-2 ml-1 h-8 cursor-pointer border ${comboEditServicesButtonClass}`}
                                  aria-label='Editar combo de servicios'
                                  onClick={() =>
                                    handleEditGroupServices(
                                      group,
                                      group.items[0]
                                        ? getMatrizLabel(group.items[0])
                                        : null
                                    )
                                  }
                                >
                                  <Plus className='h-4 w-4' />
                                  Agregar Servicios
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Editar combo de servicios
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className='mx-1 mt-2 flex items-center gap-1'>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  className='text-destructive hover:text-destructive h-7 w-7 cursor-pointer'
                                  aria-label='Eliminar combo'
                                  onClick={() =>
                                    handleOpenRemoveGroupDialog(group)
                                  }
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar combo</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <div className='space-y-2'>
                          {group.items.map((service) => {
                            const serviceId =
                              service.ID_CONFIG_PARAMETRO || service.id;
                            const scopedServiceId = `${group.id}-${serviceId}`;
                            return (
                              <div
                                key={`${group.id}-${serviceId}`}
                                className='dark:bg-background rounded-xl border bg-white p-6 pt-5'
                              >
                                <div className='flex items-start justify-between gap-2'>
                                  <div className='flex-1 space-y-2'>
                                    <p className='text-sm font-medium'>
                                      {service.ID_PARAMETRO || serviceId}
                                    </p>
                                    <p className='text-muted-foreground text-xs leading-tight'>
                                      {service.ID_MAT_ENSAYO?.trim() ||
                                        'Sin material de ensayo'}
                                    </p>
                                    <p className='text-muted-foreground text-xs leading-tight'>
                                      {service.ID_TABLA_NORMA || 'Sin tabla'}{' '}
                                    </p>
                                    <p className='text-muted-foreground text-xs leading-tight'>
                                      Límite interno:{' '}
                                      {service.LIM_INF_INTERNO || '—'} a{' '}
                                      {service.LIM_SUP_INTERNO || '—'} (
                                      {service.UNIDAD_NORMA ||
                                        service.UNIDAD_INTERNO ||
                                        'Sin unidad'}
                                      )
                                    </p>
                                    <p className='text-muted-foreground text-xs leading-tight'>
                                      {service.ID_TECNICA ||
                                        service.ID_MET_REFERENCIA ||
                                        service.ID_MET_INTERNO ||
                                        'Sin método'}
                                    </p>
                                    <div className='mt-5 grid grid-cols-1 gap-5 md:grid-cols-5 md:gap-6'>
                                      <div className='flex flex-col justify-end space-y-1'>
                                        <label
                                          htmlFor={`quantity-${scopedServiceId}`}
                                          className='text-muted-foreground text-[0.7rem] leading-tight'
                                        >
                                          Cantidad
                                        </label>
                                        <Input
                                          id={`quantity-${scopedServiceId}`}
                                          type='number'
                                          min={1}
                                          value={service.quantity ?? 1}
                                          className={`${serviceUnderlineInputClass} pl-2`}
                                          onChange={(event) =>
                                            handleUpdateServiceField(
                                              group.id,
                                              serviceId,
                                              'quantity',
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                      <div className='flex flex-col justify-end space-y-1'>
                                        <label
                                          htmlFor={`range-min-${scopedServiceId}`}
                                          className='text-muted-foreground text-[0.7rem] leading-tight'
                                        >
                                          Rango mín. (
                                          {service.UNIDAD_NORMA?.trim() ||
                                            service.UNIDAD_INTERNO?.trim() ||
                                            '_'}
                                          )
                                        </label>
                                        <Input
                                          id={`range-min-${scopedServiceId}`}
                                          value={service.rangeMin ?? ''}
                                          className={`${serviceUnderlineInputClass} pl-2`}
                                          placeholder='0.00'
                                          onChange={(event) =>
                                            handleUpdateServiceField(
                                              group.id,
                                              serviceId,
                                              'rangeMin',
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                      <div className='flex flex-col justify-end space-y-1'>
                                        <label
                                          htmlFor={`range-max-${scopedServiceId}`}
                                          className='text-muted-foreground text-[0.7rem] leading-tight'
                                        >
                                          Rango máx. (
                                          {service.UNIDAD_NORMA?.trim() ||
                                            service.UNIDAD_INTERNO?.trim() ||
                                            '_'}
                                          )
                                        </label>
                                        <Input
                                          id={`range-max-${scopedServiceId}`}
                                          value={service.rangeMax ?? ''}
                                          className={`${serviceUnderlineInputClass} pl-2`}
                                          placeholder='0.00'
                                          onChange={(event) =>
                                            handleUpdateServiceField(
                                              group.id,
                                              serviceId,
                                              'rangeMax',
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                      <div className='flex flex-col justify-end space-y-1'>
                                        <label
                                          htmlFor={`price-${scopedServiceId}`}
                                          className='text-muted-foreground text-[0.7rem] leading-tight'
                                        >
                                          Precio (USD)
                                        </label>
                                        <div className='relative'>
                                          <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
                                            $
                                          </span>
                                          <Input
                                            id={`price-${scopedServiceId}`}
                                            type='number'
                                            min={0}
                                            step='0.01'
                                            value={
                                              typeof service.unitPrice ===
                                              'number'
                                                ? service.unitPrice
                                                : ''
                                            }
                                            placeholder='0.00'
                                            className={`${serviceUnderlineInputClass} pl-7`}
                                            onChange={(event) =>
                                              handleUpdateServiceField(
                                                group.id,
                                                serviceId,
                                                'unitPrice',
                                                event.target.value
                                              )
                                            }
                                          />
                                        </div>
                                      </div>
                                      <div className='flex flex-col justify-end space-y-1'>
                                        <label
                                          htmlFor={`discount-${scopedServiceId}`}
                                          className='text-muted-foreground text-[0.7rem] leading-tight'
                                        >
                                          Descuento (USD)
                                        </label>
                                        <div className='relative'>
                                          <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
                                            $
                                          </span>
                                          <Input
                                            id={`discount-${scopedServiceId}`}
                                            type='number'
                                            min={0}
                                            step='0.01'
                                            value={
                                              typeof service.discountAmount ===
                                              'number'
                                                ? service.discountAmount
                                                : ''
                                            }
                                            placeholder='0.00'
                                            className={`${serviceUnderlineInputClass} pl-7`}
                                            onChange={(event) =>
                                              handleUpdateServiceField(
                                                group.id,
                                                serviceId,
                                                'discountAmount',
                                                event.target.value
                                              )
                                            }
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type='button'
                                        variant='ghost'
                                        size='icon'
                                        className='h-7 w-7 cursor-pointer'
                                        aria-label='Eliminar servicio'
                                        onClick={() =>
                                          handleOpenRemoveService(group.id, service)
                                        }
                                      >
                                        <Trash2 className='h-4 w-4' />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Eliminar servicio
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div ref={estimatedCostsSectionRef}>{renderEstimatedCostsPanel()}</div>

              {renderTabActions()}
            </div>
          </div>
          <div className='pointer-events-none absolute top-38 bottom-0 left-[calc(100%+1rem)] hidden w-[320px] min-[1400px]:block'>
            <AnimatePresence initial={false}>
              {shouldShowFloatingEstimatedCosts ? (
                <motion.div
                  key='estimated-costs-floating'
                  className='pointer-events-auto sticky top-16'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                >
                  {renderEstimatedCostsPanel()}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
