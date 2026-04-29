const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('exports contain current proforma/request API and no legacy serviceRequest API', () => {
  const compiledIndexPath = path.resolve(__dirname, '../lib/index.js');
  const compiledIndex = fs.readFileSync(compiledIndexPath, 'utf8');

  assert.match(compiledIndex, /"approveProforma"/);
  assert.match(compiledIndex, /"rejectProforma"/);
  assert.match(compiledIndex, /"createWorkOrder"/);
  assert.match(compiledIndex, /"deleteProforma"/);
  assert.match(compiledIndex, /"createClient"/);
  assert.match(compiledIndex, /"saveClientChanges"/);
  assert.match(compiledIndex, /"deleteClient"/);
  assert.match(compiledIndex, /"backfillClientsFromRequests"/);

  assert.doesNotMatch(compiledIndex, /approveServiceRequest/);
  assert.doesNotMatch(compiledIndex, /rejectServiceRequest/);
  assert.doesNotMatch(compiledIndex, /deleteServiceRequest/);
});
