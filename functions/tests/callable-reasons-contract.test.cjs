const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

const extractReasons = (source) => {
  const matches = source.match(/reason:\s*'([A-Z0-9_]+)'/g) ?? [];
  return new Set(matches.map((match) => match.match(/'([A-Z0-9_]+)'/)[1]));
};

test('completeWorkOrder exposes canonical reasons', () => {
  const source = readSource('src/callable/completeWorkOrder.ts');
  const reasons = extractReasons(source);

  assert.ok(reasons.has('WORK_ORDER_IDENTIFIER_REQUIRED'));
  assert.ok(reasons.has('WORK_ORDER_NOT_FOUND_BY_SOURCE_REQUEST'));
  assert.ok(reasons.has('WORK_ORDER_NOT_FOUND'));
  assert.ok(reasons.has('LAB_ANALYSIS_REQUIRED_BEFORE_COMPLETION'));
  assert.ok(reasons.has('WORK_ORDER_SOURCE_REQUEST_MISSING'));
  assert.ok(reasons.has('REQUEST_NOT_FOUND'));
});

test('saveWorkOrderLabAnalysis exposes canonical reasons', () => {
  const source = readSource('src/callable/saveWorkOrderLabAnalysis.ts');
  const reasons = extractReasons(source);

  assert.ok(reasons.has('WORK_ORDER_ID_REQUIRED'));
  assert.ok(reasons.has('LAB_ANALYSIS_MINIMUM_REQUIRED'));
  assert.ok(reasons.has('WORK_ORDER_NOT_FOUND'));
  assert.ok(reasons.has('WORK_ORDER_CANCELLED'));
});

test('pauseWorkOrder and resumeWorkOrder expose canonical reasons', () => {
  const pauseSource = readSource('src/callable/pauseWorkOrder.ts');
  const resumeSource = readSource('src/callable/resumeWorkOrder.ts');
  const pauseReasons = extractReasons(pauseSource);
  const resumeReasons = extractReasons(resumeSource);

  const expected = [
    'REQUEST_ID_REQUIRED',
    'REQUEST_NOT_FOUND',
    'REQUEST_NO_LINKED_WORK_ORDER',
    'WORK_ORDER_NOT_FOUND'
  ];

  for (const reason of expected) {
    assert.ok(pauseReasons.has(reason), `pauseWorkOrder missing ${reason}`);
    assert.ok(resumeReasons.has(reason), `resumeWorkOrder missing ${reason}`);
  }
});

test('deleteProforma exposes canonical reasons', () => {
  const source = readSource('src/callable/deleteProforma.ts');
  const reasons = extractReasons(source);

  assert.ok(reasons.has('REQUEST_ID_REQUIRED'));
  assert.ok(reasons.has('REQUEST_NOT_FOUND'));
});
