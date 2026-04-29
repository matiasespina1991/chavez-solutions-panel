import { describe, expect, it } from 'vitest';

import {
  createEmptyLabAnalysisRow,
  parseWorkOrderStatus
} from '@/features/lab-analysis/lib/lab-analysis-model';

describe('lab-analysis-model', () => {
  it('parses known and unknown work-order statuses', () => {
    expect(parseWorkOrderStatus('issued')).toBe('issued');
    expect(parseWorkOrderStatus('paused')).toBe('paused');
    expect(parseWorkOrderStatus('SOMETHING_ELSE')).toBe('unknown');
  });

  it('creates empty local analysis row with id', () => {
    const row = createEmptyLabAnalysisRow();
    expect(typeof row.id).toBe('string');
    expect(row.id.length).toBeGreaterThan(0);
    expect(row.parameterLabelEs).toBe('');
    expect(row.resultValue).toBe('');
  });
});
