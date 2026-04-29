import { describe, expect, it } from 'vitest';

import {
  isRecord,
  toArray,
  toFiniteNumber,
  toNullableNumber,
  toNullableString,
  toOptionalString,
  toSafeString
} from '@/lib/runtime-guards';

describe('runtime-guards', () => {
  it('validates record values', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord('x')).toBe(false);
  });

  it('normalizes array and string helpers', () => {
    expect(toArray([1, 2])).toEqual([1, 2]);
    expect(toArray('x')).toEqual([]);

    expect(toSafeString('abc')).toBe('abc');
    expect(toSafeString(12)).toBe('12');
    expect(toSafeString(false)).toBe('false');
    expect(toSafeString({}, 'fallback')).toBe('fallback');

    expect(toOptionalString('x')).toBe('x');
    expect(toOptionalString(1)).toBeUndefined();
    expect(toNullableString('x')).toBe('x');
    expect(toNullableString(1)).toBeNull();
  });

  it('normalizes numeric values and fallback', () => {
    expect(toNullableNumber(10)).toBe(10);
    expect(toNullableNumber('10.5')).toBe(10.5);
    expect(toNullableNumber('')).toBeNull();
    expect(toNullableNumber('abc')).toBeNull();

    expect(toFiniteNumber('20', 0)).toBe(20);
    expect(toFiniteNumber(undefined, 7)).toBe(7);
  });
});
