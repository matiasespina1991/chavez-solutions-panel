const test = require('node:test');
const assert = require('node:assert/strict');

const {
  dedupeClientSources,
  getClientDedupKey,
  normalizeClientEmail,
  normalizeClientPayload,
  normalizeClientTaxId
} = require('../lib/utils/clients.js');

test('client normalizers trim and normalize tax id/email', () => {
  const payload = normalizeClientPayload({
    businessName: ' ACME ',
    taxId: '179-000 000.001',
    contactName: ' Ana ',
    email: ' Ventas@ACME.com '
  });

  assert.equal(payload.businessName, 'ACME');
  assert.equal(payload.taxIdNormalized, '179000000001');
  assert.equal(payload.emailNormalized, 'ventas@acme.com');
  assert.equal(normalizeClientTaxId('RUC 179.1'), '1791');
  assert.equal(normalizeClientEmail(' INFO@ACME.COM '), 'info@acme.com');
});

test('getClientDedupKey prioritizes tax id over email', () => {
  assert.equal(
    getClientDedupKey({
      taxIdNormalized: '179',
      emailNormalized: 'ventas@acme.com'
    }),
    'tax:179'
  );
  assert.equal(
    getClientDedupKey({
      taxIdNormalized: '',
      emailNormalized: 'ventas@acme.com'
    }),
    'email:ventas@acme.com'
  );
  assert.equal(
    getClientDedupKey({
      taxIdNormalized: '',
      emailNormalized: ''
    }),
    null
  );
});

test('dedupeClientSources skips entries without tax id or email', () => {
  const result = dedupeClientSources([
    {
      businessName: 'ACME',
      taxId: '179',
      email: 'ventas@acme.com'
    },
    {
      businessName: 'ACME duplicated',
      taxId: '179',
      email: 'otra@acme.com'
    },
    {
      businessName: 'Beta',
      email: 'contacto@beta.com'
    },
    {
      businessName: 'No key'
    }
  ]);

  assert.equal(result.clients.length, 2);
  assert.equal(result.clients[0].businessName, 'ACME');
  assert.equal(result.clients[1].businessName, 'Beta');
  assert.equal(result.skippedInvalid, 1);
});
