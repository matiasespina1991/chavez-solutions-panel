const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mapRequestServicesToPreview
} = require('../lib/utils/requestServicesPreview.js');
const {
  matrixKeyToLabel,
  normalizeMatrixArray,
  formatMatrixLabel
} = require('../lib/utils/matrixLabels.js');

test('mapRequestServicesToPreview normalizes canonical services.items/grouped', () => {
  const input = {
    items: [
      {
        tableLabel: 'TABLA 1',
        parameterLabel: 'Aluminio',
        parameterId: 'AL',
        unit: 'mg/L',
        method: 'ICP',
        rangeMin: '0.10',
        rangeMax: '5.00',
        quantity: 2,
        unitPrice: 10,
        discountAmount: 1
      }
    ],
    grouped: [
      {
        name: 'Combo A',
        items: [
          {
            tableLabel: 'TABLA 2',
            parameterLabel: 'Boro',
            unit: 'mg/L',
            method: 'UV',
            rangeMin: '0.00',
            rangeMax: '3.00',
            quantity: 1,
            unitPrice: 20,
            discountAmount: 0
          }
        ]
      }
    ]
  };

  const result = mapRequestServicesToPreview(input);

  assert.equal(result.services.length, 1);
  assert.deepEqual(result.services[0], {
    table: 'TABLA 1',
    label: 'Aluminio',
    unit: 'mg/L',
    method: 'ICP',
    rangeOffered: '0.10 a 5.00',
    quantity: 2,
    unitPrice: 10,
    discountAmount: 1,
    subtotal: 19
  });

  assert.equal(result.serviceGroups.length, 1);
  assert.equal(result.serviceGroups[0].name, 'Combo A');
  assert.deepEqual(result.serviceGroups[0].items[0], {
    table: 'TABLA 2',
    label: 'Boro',
    unit: 'mg/L',
    method: 'UV',
    rangeOffered: '0.00 a 3.00',
    quantity: 1,
    unitPrice: 20,
    discountAmount: 0,
    subtotal: 20
  });
});

test('mapRequestServicesToPreview supports legacy array services', () => {
  const input = [
    {
      parameterId: 'N',
      parameterLabel: 'Nitrógeno',
      quantity: 1,
      unitPrice: 8
    }
  ];

  const result = mapRequestServicesToPreview(input);

  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].label, 'Nitrógeno');
  assert.equal(result.services[0].subtotal, 8);
  assert.equal(result.serviceGroups.length, 0);
});

test('matrixLabels helpers keep canonical matrix behavior', () => {
  assert.equal(matrixKeyToLabel('water'), 'Agua');
  assert.equal(matrixKeyToLabel('soil'), 'Suelo');
  assert.equal(matrixKeyToLabel('unknown'), 'unknown');

  assert.deepEqual(
    normalizeMatrixArray(['WATER', 'soil', 'soil', 'x', '', null]),
    ['water', 'soil']
  );
  assert.equal(formatMatrixLabel(['water', 'noise']), 'Agua, Ruido');
  assert.equal(formatMatrixLabel([]), '—');
});
