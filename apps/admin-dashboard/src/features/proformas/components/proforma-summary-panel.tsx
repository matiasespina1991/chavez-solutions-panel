import { Fragment } from 'react';

interface ProformaSummaryServiceItem {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number | null;
  discountAmount: number | null;
}

interface ProformaSummaryServiceGroup {
  id: string;
  name: string;
  items: ProformaSummaryServiceItem[];
}

interface ProformaSummaryPanelProps {
  typeLabel: string;
  matrixLabel: string;
  reference: string;
  validDaysLabel: string;
  validUntilLabel: string;
  client: {
    businessName: string;
    taxId: string;
    contactName: string;
  };
  groups: ProformaSummaryServiceGroup[];
  pricing: {
    subtotal: number;
    taxPercent: number;
    total: number;
  };
  notes?: string | null;
  approvalStatusLabel?: string;
  rejectionReason?: string | null;
  showTotalUsdSuffix?: boolean;
}

export function ProformaSummaryPanel({
  typeLabel,
  matrixLabel,
  reference,
  validDaysLabel,
  validUntilLabel,
  client,
  groups,
  pricing,
  notes,
  approvalStatusLabel,
  rejectionReason,
  showTotalUsdSuffix = true
}: ProformaSummaryPanelProps) {
  const taxAmount = (pricing.subtotal * pricing.taxPercent) / 100;

  return (
    <>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
          <h4 className='text-muted-foreground font-semibold'>Datos Generales</h4>
          <p>
            <span className='font-medium'>Tipo:</span> {typeLabel}
          </p>
          <p>
            <span className='font-medium'>Matrices:</span> {matrixLabel}
          </p>
          <p>
            <span className='font-medium'>Referencia:</span> {reference}
          </p>
          <p>
            <span className='font-medium'>Validez:</span> {validDaysLabel}
          </p>
          <p>
            <span className='font-medium'>Válida hasta:</span> {validUntilLabel}
          </p>
          {approvalStatusLabel ? (
            <p>
              <span className='font-medium'>Aprobación:</span>{' '}
              {approvalStatusLabel}
            </p>
          ) : null}
          {rejectionReason?.trim() ? (
            <p>
              <span className='font-medium'>Motivo rechazo:</span>{' '}
              {rejectionReason}
            </p>
          ) : null}
        </div>
        <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
          <h4 className='text-muted-foreground font-semibold'>Cliente</h4>
          <p>
            <span className='font-medium'>Razón Social:</span>{' '}
            {client.businessName || '—'}
          </p>
          <p>
            <span className='font-medium'>RUC:</span> {client.taxId || '—'}
          </p>
          <p>
            <span className='font-medium'>Contacto:</span>{' '}
            {client.contactName || '—'}
          </p>
        </div>
      </div>

      <div className='space-y-4 rounded-md border p-4'>
        {groups.length > 0 ? (
          <div className='space-y-2'>
            <h4 className='text-muted-foreground font-semibold'>
              Detalle de costos por análisis
            </h4>
            <div className='overflow-x-auto rounded-md border'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-muted text-muted-foreground'>
                  <tr>
                    <th className='p-2'>Parámetro</th>
                    <th className='p-2 text-right'>Muestras</th>
                    <th className='p-2 text-right'>Costo unitario</th>
                    <th className='p-2 text-right'>Descuento</th>
                    <th className='p-2 text-right'>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, groupIndex) => {
                    const groupSubtotal = group.items.reduce((acc, service) => {
                      if (service.unitPrice === null) return acc;
                      return (
                        acc +
                        Math.max(
                          0,
                          service.unitPrice * service.quantity -
                            (service.discountAmount ?? 0)
                        )
                      );
                    }, 0);

                    return (
                      <Fragment key={`group-block-${group.id}-${groupIndex}`}>
                        {group.items.map((service, itemIndex) => {
                          const lineBase =
                            service.unitPrice !== null
                              ? service.unitPrice * service.quantity
                              : null;
                          const lineTotal =
                            lineBase !== null
                              ? Math.max(
                                  0,
                                  lineBase - (service.discountAmount ?? 0)
                                )
                              : null;
                          return (
                            <tr
                              key={`line-${group.id}-${service.id}-${itemIndex}`}
                              className='border-t'
                            >
                              <td className='p-2'>{service.label}</td>
                              <td className='p-2 text-right'>
                                {service.quantity}
                              </td>
                              <td className='p-2 text-right'>
                                {service.unitPrice !== null
                                  ? `$${service.unitPrice.toFixed(2)}`
                                  : '—'}
                              </td>
                              <td className='p-2 text-right'>
                                {service.discountAmount !== null
                                  ? `$${service.discountAmount.toFixed(2)}`
                                  : '—'}
                              </td>
                              <td className='p-2 text-right'>
                                {lineTotal !== null
                                  ? `$${lineTotal.toFixed(2)}`
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className='bg-muted/40 border-t font-medium'>
                          <td className='p-2' colSpan={4}>
                            Subtotal {group.name || `Combo ${groupIndex + 1}`}
                          </td>
                          <td className='p-2 text-right'>
                            ${groupSubtotal.toFixed(2)}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <h4 className='text-muted-foreground font-semibold'>Costos estimados</h4>
        <div className='w-full max-w-xs space-y-1'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Subtotal:</span>
            <span>${pricing.subtotal.toFixed(2)}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>
              IVA ({pricing.taxPercent}%):
            </span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          <div className='mt-1 flex justify-between border-t pt-1 text-lg font-bold'>
            <span>Total:</span>
            <span>
              ${pricing.total.toFixed(2)}
              {showTotalUsdSuffix ? ' USD' : ''}
            </span>
          </div>
        </div>
      </div>

      {notes?.trim() ? (
        <div className='bg-muted/20 space-y-2 rounded-md border p-4'>
          <h4 className='text-muted-foreground font-semibold'>Notas</h4>
          <p className='whitespace-pre-wrap'>{notes}</p>
        </div>
      ) : null}
    </>
  );
}
