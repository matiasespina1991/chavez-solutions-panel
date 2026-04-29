import { describe, expect, it } from 'vitest';

import {
  buildRowFromDoc,
  getChangedPatch,
  normalizeForAutocomplete
} from '@/features/services-catalog/lib/services-catalog-panel-model';

describe('services-catalog-panel-model', () => {
  it('builds a normalized row from firestore-like doc', () => {
    const row = buildRowFromDoc('id-1', {
      ID_PARAMETRO: 'pH',
      ID_CONDICION_PARAMETRO: 'ACREDITADO',
      updatedAt: { toDate: () => new Date('2026-04-29T10:00:00.000Z') }
    });

    expect(row.id).toBe('id-1');
    expect(row.ID_CONFIG_PARAMETRO).toBe('id-1');
    expect(row.ID_PARAMETRO).toBe('pH');
    expect(row.updatedAtISO).toBe('2026-04-29T10:00:00.000Z');
  });

  it('computes changed patch only for edited fields', () => {
    const original = buildRowFromDoc('id-1', { ID_PARAMETRO: 'pH', ID_NORMA: 'N1' });
    const current = { ...original, ID_PARAMETRO: '  pH  ', ID_NORMA: 'N2' };
    const patch = getChangedPatch(current, original);

    expect(patch).toEqual({ ID_NORMA: 'N2' });
  });

  it('normalizes accents and casing for autocomplete', () => {
    expect(normalizeForAutocomplete('Águas Residuales ')).toBe('aguas residuales');
  });
});
