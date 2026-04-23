'use client';

import { ReactNode } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { FormValues, SelectedServiceGroup } from '@/features/configurator/lib/configurator-form-model';
import { ProformaSummaryPanel } from '@/features/proformas/components/proforma-summary-panel';

interface ConfiguratorSummaryTabProps {
  form: UseFormReturn<FormValues>;
  validDaysValue: number | undefined;
  validUntilLabel: string;
  summaryServiceGroups: SelectedServiceGroup[];
  summarySubtotal: number;
  summaryTaxPercent: number;
  summaryTotal: number;
  summaryNotes: string;
  renderTabActions: () => ReactNode;
}

export function ConfiguratorSummaryTab({
  form,
  validDaysValue,
  validUntilLabel,
  summaryServiceGroups,
  summarySubtotal,
  summaryTaxPercent,
  summaryTotal,
  summaryNotes,
  renderTabActions
}: ConfiguratorSummaryTabProps) {
  return (
    <TabsContent value='summary' className='mt-4'>
      <Card className='border-0 p-0 shadow-none'>
        <CardContent className='space-y-5 px-6 py-5'>
          <ProformaSummaryPanel
            typeLabel='Proforma'
            reference={form.getValues('reference') || '—'}
            validDaysLabel={validDaysValue ? `${validDaysValue} días` : '—'}
            validUntilLabel={validUntilLabel}
            client={{
              businessName: form.getValues('client.businessName') || '—',
              taxId: form.getValues('client.taxId') || '—',
              contactName: form.getValues('client.contactName') || '—',
              contactEmail: form.getValues('client.email') || ''
            }}
            groups={summaryServiceGroups.map((group) => ({
              id: group.id,
              name: group.name,
              items: group.items.map((service, index) => ({
                id:
                  service.ID_CONFIG_PARAMETRO ||
                  service.id ||
                  `${group.id}-service-${index}`,
                label:
                  service.ID_PARAMETRO ||
                  service.ID_CONFIG_PARAMETRO ||
                  service.id ||
                  'Servicio',
                quantity: service.quantity ?? 1,
                unitPrice: service.unitPrice ?? null,
                discountAmount: service.discountAmount ?? null
              }))
            }))}
            pricing={{
              subtotal: summarySubtotal,
              taxPercent: summaryTaxPercent,
              total: summaryTotal
            }}
            notes={summaryNotes}
            showTotalUsdSuffix
          />

          {renderTabActions()}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
