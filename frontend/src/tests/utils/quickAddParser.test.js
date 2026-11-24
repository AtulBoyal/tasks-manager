import { describe, it, expect } from 'vitest';
import { parseQuickAdd } from '../../utils/quickAddParser';

// Wednesday 25 Nov 2026, 10:00 local time
const NOW = new Date(2026, 10, 25, 10, 0);
const parse = (text, now = NOW) => parseQuickAdd(text, now);

describe('parseQuickAdd', () => {
  it('leaves plain text alone', () => {
    expect(parse('Write DBMS report')).toEqual({
      name: 'Write DBMS report',
      factor: null,
      lastDate: null,
      recurrence: 'none',
      recurrenceRule: null,
      tags: [],
      links: []
    });
  });

  it('parses the full example', () => {
    expect(parse('submit lab by friday !urgent #os')).toMatchObject({
      name: 'submit lab',
      factor: 'Urgent',
      lastDate: '2026-11-27',
      tags: ['os']
    });
  });

  describe('dates', () => {
    it.each([
      ['call mom today', '2026-11-25', 'call mom'],
      ['call mom tonight', '2026-11-25', 'call mom'],
      ['call mom tomorrow', '2026-11-26', 'call mom'],
      ['call mom tmrw', '2026-11-26', 'call mom'],
      ['gym friday', '2026-11-27', 'gym'],
      ['gym Fri', '2026-11-27', 'gym'],
      ['gym wednesday', '2026-11-25', 'gym'],          // today counts
      ['gym next friday', '2026-12-04', 'gym'],
      ['review next week', '2026-12-02', 'review'],
      ['pay rent next month', '2026-12-25', 'pay rent'],
      ['ship in 3 days', '2026-11-28', 'ship'],
      ['ship in 2 weeks', '2026-12-09', 'ship'],
      ['ship in 1 month', '2026-12-25', 'ship'],
      ['exam 5 dec', '2026-12-05', 'exam'],
      ['exam Dec 5th', '2026-12-05', 'exam'],
      ['exam on 2026-12-05', '2026-12-05', 'exam'],
      ['renew 10 nov', '2027-11-10', 'renew'],          // passed -> next year
      ['submit lab due tomorrow', '2026-11-26', 'submit lab']
    ])('%s', (text, lastDate, name) => {
      expect(parse(text)).toMatchObject({ lastDate, name });
    });

    it('clamps month arithmetic to the end of the month', () => {
      expect(parse('report next month', new Date(2027, 0, 31)).lastDate).toBe('2027-02-28');
    });

    it('ignores invalid dates', () => {
      expect(parse('exam 2026-02-30')).toMatchObject({ lastDate: null, name: 'exam 2026-02-30' });
      expect(parse('exam 32 dec')).toMatchObject({ lastDate: null, name: 'exam 32 dec' });
    });

    it('treats ALL-CAPS words as acronyms, not weekdays', () => {
      expect(parse('SAT exam prep')).toMatchObject({ lastDate: null, name: 'SAT exam prep' });
    });

    it('does not treat words like "today\'s" or "may" alone as dates', () => {
      expect(parse("review today's notes")).toMatchObject({ lastDate: null });
      expect(parse('I may finish this')).toMatchObject({ lastDate: null, name: 'I may finish this' });
    });

    it('uses only the first date', () => {
      expect(parse('move monday meeting to friday')).toMatchObject({
        lastDate: '2026-11-30',
        name: 'move meeting to friday'
      });
    });

    it('handles trailing punctuation', () => {
      expect(parse('call bank tomorrow, early')).toMatchObject({
        lastDate: '2026-11-26',
        name: 'call bank early'
      });
    });
  });

  describe('priority', () => {
    it.each([
      ['!urgent', 'Urgent'], ['!u', 'Urgent'], ['!HIGH', 'Urgent'],
      ['!normal', 'Normal'], ['!n', 'Normal'], ['!medium', 'Normal'],
      ['!later', 'Later'], ['!l', 'Later'], ['!low', 'Later']
    ])('%s', (token, factor) => {
      expect(parse(`task ${token}`)).toMatchObject({ factor, name: 'task' });
    });

    it('leaves unknown !words in the name', () => {
      expect(parse('wow !amazing')).toMatchObject({ factor: null, name: 'wow !amazing' });
    });
  });

  describe('tags', () => {
    it('collects lower-cased, unique tags', () => {
      expect(parse('study #DBMS #os #dbms')).toMatchObject({ tags: ['dbms', 'os'], name: 'study' });
    });

    it('ignores a lone #', () => {
      expect(parse('item # 5')).toMatchObject({ tags: [], name: 'item # 5' });
    });
  });

  describe('recurrence', () => {
    it.each([
      ['stretch every day', 'daily'],
      ['stretch everyday', 'daily'],
      ['review every week', 'weekly'],
      ['budget every month', 'monthly']
    ])('%s', (text, recurrence) => {
      const result = parse(text);
      expect(result.recurrence).toBe(recurrence);
      expect(result.name).toBe(text.split(' ')[0]);
    });

    it('every <weekday> repeats weekly from the coming weekday', () => {
      expect(parse('standup every monday')).toMatchObject({
        recurrence: 'weekly',
        lastDate: '2026-11-30',
        name: 'standup'
      });
    });

    it.each([
      ['water plants every 3 days', 'daily', { interval: 3 }, null],
      ['review every 2 weeks', 'weekly', { interval: 2 }, null],
      ['pay rent every 1 month', 'monthly', { interval: 1 }, null],
      // Wednesday 25 Nov: the earliest listed day becomes the first deadline
      ['gym every mon and wed', 'weekly', { interval: 1, weekdays: [1, 3] }, '2026-11-25'],
      ['gym every mon,wed,fri', 'weekly', { interval: 1, weekdays: [1, 3, 5] }, '2026-11-25'],
      ['standup every weekday', 'weekly', { interval: 1, weekdays: [1, 2, 3, 4, 5] }, '2026-11-25'],
      ['long run every weekend', 'weekly', { interval: 1, weekdays: [0, 6] }, '2026-11-28']
    ])('%s', (text, recurrence, recurrenceRule, lastDate) => {
      const result = parse(text);
      expect(result).toMatchObject({ recurrence, recurrenceRule, lastDate });
      expect(result.name).not.toMatch(/every/);
    });

    it('combines an interval with a deadline weekday', () => {
      expect(parse('review every 2 weeks friday')).toMatchObject({
        name: 'review',
        recurrence: 'weekly',
        recurrenceRule: { interval: 2, weekdays: [5] },
        lastDate: '2026-11-27'
      });
    });

    it('stops a weekday list at the first other word', () => {
      expect(parse('gym every monday and call mom')).toMatchObject({
        name: 'gym and call mom',
        recurrenceRule: { interval: 1, weekdays: [1] }
      });
    });

    it('ignores out-of-range intervals', () => {
      expect(parse('backup every 999 days')).toMatchObject({ recurrence: 'none', name: 'backup every 999 days' });
    });

    it('leaves "every" alone when not followed by a period', () => {
      expect(parse('read every chapter')).toMatchObject({ recurrence: 'none', name: 'read every chapter' });
    });
  });

  describe('links', () => {
    it('extracts URLs with the hostname as title', () => {
      expect(parse('read https://www.codeforces.com/blog/entry/1 tomorrow')).toMatchObject({
        name: 'read',
        lastDate: '2026-11-26',
        links: [{ title: 'codeforces.com', url: 'https://www.codeforces.com/blog/entry/1' }]
      });
    });

    it('strips trailing punctuation from URLs', () => {
      expect(parse('see https://example.com/a).').links[0].url).toBe('https://example.com/a');
    });

    it('names a link-only task after the site', () => {
      expect(parse('https://leetcode.com/problems/two-sum')).toMatchObject({
        name: 'leetcode.com',
        links: [{ url: 'https://leetcode.com/problems/two-sum' }]
      });
    });
  });

  it('falls back to the original text if everything was parsed away', () => {
    expect(parse('tomorrow !urgent')).toMatchObject({
      name: 'tomorrow !urgent',
      lastDate: '2026-11-26',
      factor: 'Urgent'
    });
  });

  it('handles empty input', () => {
    expect(parse('')).toMatchObject({ name: '', lastDate: null, tags: [] });
    expect(parse(undefined)).toMatchObject({ name: '' });
  });
});
