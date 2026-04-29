import { describe, expect, it } from 'vitest';

import {
  buildClientRowFromDoc,
  getChangedClientPatch,
  normalizeClientDraft,
  normalizeClientEmail,
  normalizeClientTaxId,
  normalizeForSearch
} from '@/features/clients/lib/client-panel-model';

describe('client-panel-model', () => {
  it('builds a normalized client row from firestore-like data', () => {
    const row = buildClientRowFromDoc('client-1', {
      businessName: '  ACME S.A.  ',
      taxId: '179-000-0001',
      email: 'Ventas@Acme.COM',
      updatedAt: { toDate: () => new Date('2026-04-29T10:00:00.000Z') }
    });

    expect(row.id).toBe('client-1');
    expect(row.businessName).toBe('  ACME S.A.  ');
    expect(row.taxIdNormalized).toBe('1790000001');
    expect(row.emailNormalized).toBe('ventas@acme.com');
    expect(row.updatedAtISO).toBe('2026-04-29T10:00:00.000Z');
  });

  it('trims draft values before save', () => {
    expect(
      normalizeClientDraft({
        businessName: ' ACME ',
        taxId: ' 179 ',
        contactName: ' Ana ',
        contactRole: ' Asesor comercial ',
        email: ' ventas@acme.com ',
        phone: ' 099 ',
        city: ' Quito ',
        address: ' Av. Lugones 123 '
      })
    ).toEqual({
      businessName: 'ACME',
      taxId: '179',
      contactName: 'Ana',
      contactRole: 'Asesor comercial',
      email: 'ventas@acme.com',
      phone: '099',
      city: 'Quito',
      address: 'Av. Lugones 123'
    });
  });

  it('computes changed patches only for edited fields', () => {
    const original = buildClientRowFromDoc('client-1', {
      businessName: 'ACME',
      city: 'Quito'
    });
    const current = {
      ...original,
      businessName: '  ACME  ',
      city: 'Guayaquil'
    };

    expect(getChangedClientPatch(current, original)).toEqual({
      city: 'Guayaquil'
    });
  });

  it('normalizes tax id, email, and search text', () => {
    expect(normalizeClientTaxId('179-000 000.001')).toBe('179000000001');
    expect(normalizeClientEmail(' Ventas@ACME.com ')).toBe('ventas@acme.com');
    expect(normalizeForSearch('Razón Social')).toBe('razon social');
  });
});
