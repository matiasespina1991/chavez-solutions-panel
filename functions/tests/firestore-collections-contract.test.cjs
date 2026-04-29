const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { parseConstObjectFromTs } = require('./_helpers.cjs');

test('backend Firestore collections contract is stable and unique', () => {
  const { FIRESTORE_COLLECTIONS } = require('../lib/constants/firestore.js');

  assert.ok(FIRESTORE_COLLECTIONS, 'FIRESTORE_COLLECTIONS should exist');
  assert.equal(FIRESTORE_COLLECTIONS.REQUESTS, 'requests');
  assert.equal(FIRESTORE_COLLECTIONS.WORK_ORDERS, 'work_orders');
  assert.equal(FIRESTORE_COLLECTIONS.SERVICES, 'services');
  assert.equal(FIRESTORE_COLLECTIONS.CLIENTS, 'clients');
  assert.equal(FIRESTORE_COLLECTIONS.MAIL_OUTBOX, 'mail_outbox');

  const values = Object.values(FIRESTORE_COLLECTIONS);
  const uniqueValues = new Set(values);
  assert.equal(
    uniqueValues.size,
    values.length,
    'Collection values must not be duplicated'
  );
});

test('frontend and backend collection constants stay synchronized', () => {
  const {
    FIRESTORE_COLLECTIONS: backendCollections,
  } = require('../lib/constants/firestore.js');

  const frontendFile = path.resolve(
    __dirname,
    '../../apps/panel/src/constants/firestore.ts'
  );
  const frontendCollections = parseConstObjectFromTs(
    frontendFile,
    'FIRESTORE_COLLECTIONS'
  );

  assert.deepEqual(
    frontendCollections,
    backendCollections,
    'Frontend and backend Firestore collection maps must match exactly'
  );
});
