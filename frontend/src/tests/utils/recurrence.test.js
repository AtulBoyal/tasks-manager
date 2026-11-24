import { describe, it, expect } from 'vitest';
import {
  normalizeRule,
  describeRecurrence,
  nextOccurrence,
  reopenDates
} from '../../utils/recurrence';
import { getLocalDateString } from '../../utils/formatters';

const d = (iso) => {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
};
const next = (recurrence, rule, anchor, today) =>
  getLocalDateString(nextOccurrence(recurrence, rule, d(anchor), d(today)));

// Reference "today": Wednesday 25 Nov 2026
const TODAY = '2026-11-25';

describe('nextOccurrence', () => {
  describe('daily', () => {
    it.each([
      ['2026-11-24', { interval: 1 }, '2026-11-25'],   // due yesterday -> today
      ['2026-11-10', { interval: 1 }, '2026-11-25'],   // two weeks overdue -> today
      ['2026-11-25', { interval: 1 }, '2026-11-26'],   // today's done -> tomorrow
      ['2026-11-27', { interval: 1 }, '2026-11-28'],   // completed early -> day after
      ['2026-11-20', { interval: 3 }, '2026-11-26'],   // 23 is past, so 26
      ['2026-11-25', null, '2026-11-26']               // no rule = every day
    ])('anchor %s, %j -> %s', (anchor, rule, expected) => {
      expect(next('daily', rule, anchor, TODAY)).toBe(expected);
    });
  });

  describe('weekly', () => {
    it('defaults to the anchor weekday', () => {
      expect(next('weekly', { interval: 1 }, '2026-11-23', TODAY)).toBe('2026-11-30');
    });

    it('catches up instead of landing in the past (old +7 days bug)', () => {
      // Due Mon 2 Nov, three weeks overdue: old logic gave 9 Nov
      expect(next('weekly', { interval: 1 }, '2026-11-02', TODAY)).toBe('2026-11-30');
    });

    it.each([
      ['2026-11-24', '2026-11-25'],   // reopened Tue -> Wed
      [TODAY, '2026-11-25'],          // reopened Wed -> today (Wed)
      ['2026-11-26', '2026-11-30']    // reopened Thu -> next Mon
    ])('Mon & Wed, anchor Mon 23 Nov, today %s -> %s', (today, expected) => {
      expect(next('weekly', { interval: 1, weekdays: [1, 3] }, '2026-11-23', today)).toBe(expected);
    });

    it('every 2 weeks skips the off week', () => {
      // Anchor Wed 25 Nov (week of 22 Nov); week of 29 Nov is skipped
      expect(next('weekly', { interval: 2, weekdays: [1, 3] }, '2026-11-25', '2026-11-26')).toBe('2026-12-07');
    });

    it('every weekday goes from Friday to Monday', () => {
      expect(next('weekly', { interval: 1, weekdays: [1, 2, 3, 4, 5] }, '2026-11-27', '2026-11-28')).toBe('2026-11-30');
    });
  });

  describe('monthly', () => {
    it('clamps to the last day and keeps the rule day afterwards (old Jan 31 bug)', () => {
      // Old logic: 31 Jan + 1 month = 3 Mar
      expect(next('monthly', { interval: 1, monthDay: 31 }, '2027-01-31', '2027-02-01')).toBe('2027-02-28');
      expect(next('monthly', { interval: 1, monthDay: 31 }, '2027-02-28', '2027-03-01')).toBe('2027-03-31');
    });

    it('drifts without a stored day, which is why rules keep monthDay', () => {
      expect(next('monthly', { interval: 1 }, '2027-02-28', '2027-03-01')).toBe('2027-03-28');
    });

    it('every 3 months catches up across a year boundary', () => {
      expect(next('monthly', { interval: 3, monthDay: 15 }, '2026-01-15', TODAY)).toBe('2027-01-15');
    });

    it('handles leap years', () => {
      expect(next('monthly', { interval: 1, monthDay: 29 }, '2028-01-29', '2028-01-30')).toBe('2028-02-29');
    });
  });
});

describe('normalizeRule', () => {
  it('returns null for one-off or unknown frequencies', () => {
    expect(normalizeRule('none', { interval: 3 })).toBeNull();
    expect(normalizeRule('yearly', { interval: 3 })).toBeNull();
  });

  it('fills weekday and month day from the deadline', () => {
    expect(normalizeRule('weekly', null, '2026-11-25')).toEqual({ interval: 1, weekdays: [3] });
    expect(normalizeRule('monthly', {}, '2027-01-31')).toEqual({ interval: 1, monthDay: 31 });
    expect(normalizeRule('daily', null, '2026-11-25')).toEqual({ interval: 1 });
  });

  it('cleans up user or imported input', () => {
    expect(normalizeRule('weekly', { interval: '2', weekdays: [3, 1, 1, 9, -1, 'x'] }))
      .toEqual({ interval: 2, weekdays: [1, 3] });
    expect(normalizeRule('daily', { interval: 0 })).toEqual({ interval: 1 });
    expect(normalizeRule('daily', { interval: 10000 })).toEqual({ interval: 365 });
    expect(normalizeRule('monthly', { interval: 2, monthDay: 40 }, '2026-11-25'))
      .toEqual({ interval: 2, monthDay: 25 });
    expect(normalizeRule('weekly', 'garbage')).toEqual({ interval: 1 });
  });
});

describe('describeRecurrence', () => {
  it.each([
    ['none', null, ''],
    ['daily', { interval: 1 }, 'Daily'],
    ['daily', { interval: 3 }, 'Every 3 days'],
    ['weekly', null, 'Weekly'],
    ['weekly', { interval: 1, weekdays: [1, 3] }, 'Weekly on Mon, Wed'],
    ['weekly', { interval: 2, weekdays: [5] }, 'Every 2 weeks on Fri'],
    ['weekly', { interval: 1, weekdays: [1, 2, 3, 4, 5] }, 'Weekly on weekdays'],
    ['weekly', { interval: 1, weekdays: [0, 6] }, 'Weekly on weekends'],
    ['monthly', { interval: 1, monthDay: 15 }, 'Monthly on day 15'],
    ['monthly', { interval: 3 }, 'Every 3 months']
  ])('%s %j -> "%s"', (recurrence, rule, expected) => {
    expect(describeRecurrence(recurrence, rule)).toBe(expected);
  });
});

describe('reopenDates', () => {
  const today = d(TODAY);

  it('moves the deadline and shifts the appears-on date by the same amount', () => {
    expect(reopenDates({
      recurrence: 'weekly',
      recurrence_rule: { interval: 1, weekdays: [1] },
      last_date: '2026-11-23',
      start_date: '2026-11-21'
    }, today)).toEqual({ last_date: '2026-11-30', start_date: '2026-11-28' });
  });

  it('works for older tasks without a stored rule', () => {
    expect(reopenDates({ recurrence: 'monthly', recurrence_rule: null, last_date: '2026-10-31' }, today))
      .toEqual({ last_date: '2026-11-30', start_date: null });
  });

  it('hides a deadline-less weekly task until its next occurrence', () => {
    expect(reopenDates({
      recurrence: 'weekly',
      recurrence_rule: { interval: 1 },
      last_date: null,
      completion_date: new Date(2026, 10, 23, 18, 0).toISOString() // Mon
    }, today)).toEqual({ last_date: null, start_date: '2026-11-30' });
  });

  it('shows a deadline-less daily task again straight away', () => {
    expect(reopenDates({
      recurrence: 'daily',
      recurrence_rule: { interval: 1 },
      last_date: null,
      completion_date: new Date(2026, 10, 24, 18, 0).toISOString()
    }, today)).toEqual({ last_date: null, start_date: null });
  });
});
