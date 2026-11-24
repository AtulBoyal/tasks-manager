import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getLocalDateString, parseLocalDate, formatDate } from '../../utils/formatters';

describe('date helpers (IST, UTC+05:30)', () => {
  const originalTZ = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'Asia/Kolkata';
  });

  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('returns the local date just after midnight, not the UTC date', () => {
    // 00:30 IST on 24 Nov = 19:00 UTC on 23 Nov
    const justAfterMidnight = new Date('2026-11-23T19:00:00Z');

    expect(justAfterMidnight.toISOString().split('T')[0]).toBe('2026-11-23');
    expect(getLocalDateString(justAfterMidnight)).toBe('2026-11-24');
  });

  it('parses YYYY-MM-DD as local midnight', () => {
    const d = parseLocalDate('2026-03-05');

    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(0);
  });

  it('formats date-only and full ISO values', () => {
    expect(formatDate('2026-03-05')).toBe('05-03-2026');
    expect(formatDate('2026-11-23T19:00:00Z')).toBe('24-11-2026');
    expect(formatDate(null)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });
});
