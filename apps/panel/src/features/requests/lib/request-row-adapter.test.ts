import { describe, expect, it } from 'vitest';

import { mapRequestSnapshotDocToRow } from '@/features/requests/lib/request-row-adapter';

describe('request-row-adapter', () => {
  it('maps request snapshot into normalized row', () => {
    const docSnap = {
      id: 'req-1',
      data: () => ({
        reference: 'PR-2026-001',
        notes: 'nota',
        isWorkOrder: true,
        matrix: ['AGUAS', ' '],
        status: 'submitted',
        approval: {
          status: 'approved',
          feedback: 'ok',
          approvedBy: { email: 'user@mail.com' }
        },
        pricing: { total: 115, subtotal: 100, taxPercent: 15, validDays: 30 },
        createdAt: { toDate: () => new Date('2026-04-29T10:00:00.000Z') },
        updatedAt: { toDate: () => new Date('2026-04-29T10:00:00.000Z') },
        client: {
          businessName: 'Devbite',
          taxId: '123',
          contactName: 'Matias',
          address: 'Street',
          city: 'Quito',
          email: 'mail@x.com',
          phone: '111'
        },
        samples: {
          agreedCount: 2,
          items: [{ sampleCode: 'M-01', sampleType: 'Agua' }]
        },
        analyses: {
          items: [{ parameterLabelEs: 'pH', unitPrice: 10 }]
        },
        services: {
          items: [{
            serviceId: 'svc-1',
            parameterId: 'p-1',
            parameterLabel: 'pH',
            quantity: 1,
            unitPrice: 10,
            discountAmount: 0
          }]
        }
      })
    } as any;

    const row = mapRequestSnapshotDocToRow(docSnap);

    expect(row.id).toBe('req-1');
    expect(row.reference).toBe('PR-2026-001');
    expect(row.status).toBe('submitted');
    expect(row.approvalStatus).toBe('approved');
    expect(row.approvalActorEmail).toBe('user@mail.com');
    expect(row.total).toBe(115);
    expect(row.serviceItems).toHaveLength(1);
    expect(row.client.businessName).toBe('Devbite');
  });

  it('falls back to legacy analysis items and grouped services when direct services are missing', () => {
    const docSnap = {
      id: 'req-2',
      data: () => ({
        reference: null,
        notes: null,
        isWorkOrder: false,
        matrix: 'invalid',
        status: 'draft',
        pricing: {},
        updatedAt: { toDate: () => new Date('2026-04-29T10:00:00.000Z') },
        client: {},
        samples: { agreedCount: 3, items: [] },
        analyses: {
          items: [{ parameterLabelEs: 'DQO', unitPrice: 12 }]
        },
        services: {
          grouped: [
            {
              name: 'Grupo A',
              items: [
                {
                  serviceId: 'svc-g-1',
                  parameterId: 'p-g-1',
                  parameterLabel: 'Param G',
                  quantity: 2,
                  unitPrice: 20,
                  discountAmount: 1
                }
              ]
            }
          ]
        }
      })
    } as any;

    const row = mapRequestSnapshotDocToRow(docSnap);

    expect(row.reference).toBe('—');
    expect(row.notes).toBe('');
    expect(row.serviceItems).toHaveLength(1);
    expect(row.serviceItems[0].parameterLabel).toBe('DQO');
    expect(row.serviceItems[0].quantity).toBe(3);
    expect(row.serviceGroups).toHaveLength(1);
    expect(row.serviceGroups[0].name).toBe('Grupo A');
  });
});
