import { toDateOnlyString } from './date-only.util';

describe('toDateOnlyString', () => {
  it('formats Date objects as YYYY-MM-DD (not locale string slice)', () => {
    const date = new Date('2027-05-29T00:00:00+07:00');
    expect(toDateOnlyString(date)).toBe('2027-05-29');
  });

  it('passes through ISO date strings', () => {
    expect(toDateOnlyString('2027-05-29')).toBe('2027-05-29');
    expect(toDateOnlyString('2027-05-29T12:00:00.000Z')).toBe('2027-05-29');
  });

  it('parses YYYYMMDD', () => {
    expect(toDateOnlyString('20270529')).toBe('2027-05-29');
  });

  it('returns null for empty values', () => {
    expect(toDateOnlyString(null)).toBeNull();
    expect(toDateOnlyString('')).toBeNull();
  });
});
