import { describe, expect, it } from 'vitest';

import {
  formatRange,
  mapServiceGroupsToDocument,
  mapStoredServiceGroups,
  mapStoredServicesToSelected,
  mapSelectedServicesToDocument,
  mapServicesToAnalyses,
  normalizeRangeValue,
  parseRangeOffered
} from '@/features/configurator/lib/configurator-service-mappers';

describe('configurator-service-mappers', () => {
  it('normalizes locale decimal/comma ranges', () => {
    expect(normalizeRangeValue('1.234,56')).toBe('1234.56');
    expect(normalizeRangeValue('1,234.56')).toBe('1234.56');
    expect(normalizeRangeValue('1,5')).toBe('1.5');
  });

  it('parses offered range text', () => {
    expect(parseRangeOffered('10 a 20')).toEqual({ rangeMin: '10', rangeMax: '20' });
    expect(parseRangeOffered('—')).toEqual({ rangeMin: '', rangeMax: '' });
    expect(parseRangeOffered('  42  ')).toEqual({ rangeMin: '42', rangeMax: '' });
    expect(formatRange({ rangeMin: '1', rangeMax: '' } as any)).toBe('1');
  });

  it('maps selected services to analyses and document items', () => {
    const selected = [
      {
        id: 'svc-1',
        ID_CONFIG_PARAMETRO: 'cfg-1',
        ID_PARAMETRO: 'pH',
        ID_TABLA_NORMA: 'Tabla A',
        UNIDAD_NORMA: 'mg/L',
        ID_TECNICA: 'Método X',
        quantity: 2,
        rangeMin: '1',
        rangeMax: '10',
        unitPrice: 5,
        discountAmount: 1
      }
    ] as any[];

    const getServiceId = (service: any) => service.ID_CONFIG_PARAMETRO || service.id;

    const analyses = mapServicesToAnalyses(selected as any, getServiceId);
    expect(analyses).toHaveLength(1);
    expect(analyses[0].parameterId).toBe('cfg-1');
    expect(analyses[0].rangeOffered).toBe('1 a 10');

    const docItems = mapSelectedServicesToDocument(selected as any, getServiceId);
    expect(docItems).toHaveLength(1);
    expect(docItems[0]).toMatchObject({
      serviceId: 'svc-1',
      parameterId: 'cfg-1',
      quantity: 2,
      unitPrice: 5,
      discountAmount: 1
    });
  });

  it('maps groups and stored values with fallbacks', () => {
    const getServiceId = (service: any) => service.ID_CONFIG_PARAMETRO || service.id;
    const toSelectedService = (service: any, overrides?: any) => ({
      ...service,
      quantity: overrides?.quantity ?? 1,
      rangeMin: overrides?.rangeMin ?? '',
      rangeMax: overrides?.rangeMax ?? '',
      unitPrice: overrides?.unitPrice ?? null,
      discountAmount: overrides?.discountAmount ?? null
    });

    const groups = mapServiceGroupsToDocument(
      [
        { id: 'g1', name: 'Combo 1', items: [] },
        {
          id: 'g2',
          name: 'Combo 2',
          items: [{ id: 'svc-1', ID_CONFIG_PARAMETRO: 'cfg-1', ID_PARAMETRO: 'pH', quantity: 1, rangeMin: '', rangeMax: '', unitPrice: 1, discountAmount: 0 }]
        }
      ],
      getServiceId
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Combo 2');

    const stored = mapStoredServicesToSelected(
      [{
        serviceId: '',
        parameterId: 'cfg-1',
        parameterLabel: 'pH',
        tableLabel: null,
        unit: null,
        method: null,
        rangeMin: '',
        rangeMax: '',
        quantity: 1,
        unitPrice: null,
        discountAmount: null
      }],
      toSelectedService as any
    );
    expect(stored[0].id).toBe('cfg-1');

    expect(mapStoredServiceGroups(undefined, toSelectedService as any)).toEqual([]);
    const storedGroups = mapStoredServiceGroups(
      [{ name: '   ', items: [{ serviceId: 's1', parameterId: 'p1', parameterLabel: 'A', tableLabel: null, unit: null, method: null, rangeMin: '', rangeMax: '', quantity: 1, unitPrice: 1, discountAmount: 0 }] }],
      toSelectedService as any
    );
    expect(storedGroups[0].name).toBe('Combo 1');
  });
});
