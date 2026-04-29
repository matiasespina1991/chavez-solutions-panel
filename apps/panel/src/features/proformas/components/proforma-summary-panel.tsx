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
  readonly typeLabel: string;
  readonly reference: string;
  readonly workOrderExecutedByEmail?: string | null;
  readonly validDaysLabel: string;
  readonly validUntilLabel: string;
  readonly client: {
    businessName: string;
    taxId: string;
    contactName: string;
    contactEmail?: string;
  };
  readonly groups: ProformaSummaryServiceGroup[];
  readonly pricing: {
    subtotal: number;
    taxPercent: number;
    total: number;
  };
  readonly notes?: string | null;
  readonly rejectionReason?: string | null;
  readonly showTotalUsdSuffix?: boolean;
}

export function ProformaSummaryPanel({
  typeLabel,
  reference,
  workOrderExecutedByEmail,
  validDaysLabel,
  validUntilLabel,
  client,
  groups,
  pricing,
  notes,
  rejectionReason,
  showTotalUsdSuffix = true
}: ProformaSummaryPanelProps) {
  const taxAmount = (pricing.subtotal * pricing.taxPercent) / 100;
  const normalizedReference = reference?.trim();
  const referenceLabel =
    normalizedReference && normalizedReference.length > 0
      ? normalizedReference
      : '- (borrador)';
  const normalizedExecutedByEmail = workOrderExecutedByEmail?.trim() || '';
  const normalizedContactName = client.contactName?.trim() || '';
  const normalizedContactEmail = client.contactEmail?.trim() || '';
  const contactLabel = normalizedContactName
    ? normalizedContactEmail
      ? `${normalizedContactName} (${normalizedContactEmail})`
      : normalizedContactName
    : '—';

  return (
    <>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='bg-muted/20 space-y-1.5 rounded-md border p-4'>
          <h4 className='text-muted-foreground font-semibold'>Datos Generales</h4>
          <p className='leading-snug'>
            <span className='font-medium'>Tipo:</span> {typeLabel}
          </p>
          <p className='leading-snug'>
            <span className='font-medium'>Referencia:</span> {referenceLabel}
          </p>
          {normalizedExecutedByEmail ? (
            <p className='leading-snug'>
              <span className='font-medium'>
                Orden de trabajo aprobada y ejecutada por:
              </span>{' '}
              {normalizedExecutedByEmail}
            </p>
          ) : null}
          <p className='leading-snug'>
            <span className='font-medium'>Validez:</span> {validDaysLabel}
          </p>
          <p className='leading-snug'>
            <span className='font-medium'>Válida hasta:</span> {validUntilLabel}
          </p>
          {rejectionReason?.trim() ? (
            <p className='leading-snug'>
              <span className='font-medium'>Motivo rechazo:</span>{' '}
              {rejectionReason}
            </p>
          ) : null}
        </div>
        <div className='bg-muted/20 space-y-1.5 rounded-md border p-4'>
          <h4 className='text-muted-foreground font-semibold'>Cliente</h4>
          <p className='leading-snug'>
            <span className='font-medium'>Razón Social:</span>{' '}
            {client.businessName || '—'}
          </p>
          <p className='leading-snug'>
            <span className='font-medium'>RUC:</span> {client.taxId || '—'}
          </p>
          <p className='leading-snug'>
            <span className='font-medium'>Persona de contacto:</span>{' '}
            {contactLabel}
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
                          <td className='p-2'>
                            Subtotal {group.name || `Combo ${groupIndex + 1}`}
                          </td>
                          <td className='p-2' colSpan={3} />
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
