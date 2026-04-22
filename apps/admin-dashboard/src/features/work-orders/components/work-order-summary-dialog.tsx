import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { DialogHeaderActions } from '@/components/ui/dialog-header-actions';
import type { WorkOrderListRow as WorkOrderRow } from '@/types/domain';
import { IconDownload, IconPrinter } from '@tabler/icons-react';

interface WorkOrderSummaryDialogProps {
  open: boolean;
  selectedRow: WorkOrderRow | null;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
  onPrint: () => void;
}

const getWorkOrderDialogBanner = (row: WorkOrderRow) => {
  if (row.status === 'completed') {
    return {
      className:
        'mb-[1rem] rounded-md border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300',
      text: 'Orden de trabajo finalizada. ✅'
    };
  }

  if (row.status === 'paused') {
    return {
      className:
        'mb-[1rem] rounded-md border border-yellow-500/40 bg-yellow-400/15 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-300',
      text: 'Orden de trabajo pausada.'
    };
  }

  if (row.status === 'cancelled') {
    return {
      className:
        'mb-[1rem] rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
      text: 'Orden de trabajo cancelada.'
    };
  }

  return null;
};

export function WorkOrderSummaryDialog({
  open,
  selectedRow,
  onOpenChange,
  onDownload,
  onPrint
}: WorkOrderSummaryDialogProps) {
  const actions = [
    {
      id: 'download-work-order',
      icon: <IconDownload className='h-4 w-4' />,
      tooltip: 'Descargar orden de trabajo',
      ariaLabel: 'Descargar orden de trabajo',
      onClick: onDownload
    },
    {
      id: 'print-work-order',
      icon: <IconPrinter className='h-4 w-4' />,
      tooltip: 'Imprimir orden de trabajo',
      ariaLabel: 'Imprimir orden de trabajo',
      onClick: onPrint
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl'
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className='bg-background shrink-0 border-b px-6 py-4 pr-12'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <DialogTitle>Resumen de orden de trabajo</DialogTitle>
              <DialogDescription>
                Vista consolidada de cliente, servicios y costos.
              </DialogDescription>
            </div>
            <DialogHeaderActions actions={actions} />
          </div>
        </DialogHeader>

        {selectedRow && (
          <div className='max-h-[calc(90vh-88px)] overflow-y-auto overscroll-none'>
            <div className='space-y-5 px-6 py-5'>
              {getWorkOrderDialogBanner(selectedRow) ? (
                <div
                  className={`${getWorkOrderDialogBanner(selectedRow)?.className} mx-0 mt-0`}
                >
                  {getWorkOrderDialogBanner(selectedRow)?.text}
                </div>
              ) : null}

              {selectedRow.notes?.trim() ? (
                <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                  <h4 className='text-muted-foreground font-semibold'>Notas</h4>
                  <p className='whitespace-pre-wrap'>{selectedRow.notes}</p>
                </div>
              ) : null}

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                  <h4 className='text-muted-foreground font-semibold'>
                    Datos Generales
                  </h4>
                  <p>
                    <span className='font-medium'>N° OT:</span>{' '}
                    {selectedRow.workOrderNumber}
                  </p>
                  <p>
                    <span className='font-medium'>Referencia origen:</span>{' '}
                    {selectedRow.sourceReference}
                  </p>
                </div>
                <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                  <h4 className='text-muted-foreground font-semibold'>
                    Cliente
                  </h4>
                  <p>
                    <span className='font-medium'>Razón Social:</span>{' '}
                    {selectedRow.client.businessName || '—'}
                  </p>
                  <p>
                    <span className='font-medium'>RUC:</span>{' '}
                    {selectedRow.client.taxId || '—'}
                  </p>
                  <p>
                    <span className='font-medium'>Contacto:</span>{' '}
                    {selectedRow.client.contactName || '—'}
                  </p>
                </div>
              </div>

              <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
                <h4 className='text-muted-foreground font-semibold'>
                  Servicios ({selectedRow.serviceItems.length})
                </h4>
                <div className='space-y-1'>
                  {selectedRow.serviceItems.length > 0 ? (
                    selectedRow.serviceItems.map((service, index) => (
                      <p key={`${service.serviceId}-${index}`} className='text-sm'>
                        {service.parameterLabel}
                      </p>
                    ))
                  ) : (
                    <p className='text-sm'>No hay servicios seleccionados.</p>
                  )}
                </div>
              </div>

              {selectedRow.serviceItems.length > 0 ? (
                <div className='space-y-2 rounded-md border p-4'>
                  <h4 className='text-muted-foreground font-semibold'>
                    Detalle de servicios
                  </h4>
                  <div className='overflow-x-auto rounded-md border'>
                    <table className='w-full text-left text-sm'>
                      <thead className='bg-muted text-muted-foreground'>
                        <tr>
                          <th className='p-2'>Parámetro</th>
                          <th className='p-2 text-right'>Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRow.serviceItems.map((service, index) => (
                          <tr key={`${service.serviceId}-${index}`} className='border-t'>
                            <td className='p-2'>{service.parameterLabel}</td>
                            <td className='p-2 text-right'>{service.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
