import { describe, it, expect } from 'vitest';
import { planReminders, cleanReminderSettings, DEFAULT_REMINDER_SETTINGS } from '../reminders';

// Wednesday 25 Nov 2026, 08:00 local
const NOW = new Date(2026, 10, 25, 8, 0).getTime();
const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).getTime();

const task = (overrides) => ({
  id: 1, name: 'Task', completed: false, archived: false, last_date: null, cf_contest_id: null,
  ...overrides
});

const plan = (tasks, extra = {}) =>
  planReminders({ tasks, settings: DEFAULT_REMINDER_SETTINGS, now: NOW, ...extra });

describe('planReminders: deadlines', () => {
  it('reminds on the due day at the chosen time', () => {
    expect(plan([task({ id: 7, name: 'Submit lab', last_date: '2026-11-27' })])).toEqual([{
      key: 'due:7:2026-11-27',
      when: at(2026, 11, 27, 9),
      title: 'Due today',
      message: 'Submit lab'
    }]);
  });

  it('fires right away if today\'s reminder time already passed', () => {
    const later = new Date(2026, 10, 25, 14, 0).getTime();
    const [reminder] = plan([task({ last_date: '2026-11-25' })], { now: later });

    expect(reminder).toMatchObject({ key: 'due:1:2026-11-25', when: later });
  });

  it('skips overdue, completed, archived and far-off tasks', () => {
    expect(plan([
      task({ id: 1, last_date: '2026-11-24' }),                     // overdue
      task({ id: 2, last_date: '2026-11-26', completed: true }),
      task({ id: 3, last_date: '2026-11-26', archived: true }),
      task({ id: 4, last_date: '2026-12-31' }),                     // beyond 7 days
      task({ id: 5 })                                               // no deadline
    ])).toEqual([]);
  });

  it('uses a new key when the deadline moves, so it is reminded again', () => {
    const [before] = plan([task({ last_date: '2026-11-26' })]);
    const [after] = plan([task({ last_date: '2026-11-28' })]);
    expect(before.key).not.toBe(after.key);
  });

  it('respects the reminder time setting', () => {
    const [reminder] = plan([task({ last_date: '2026-11-26' })], {
      settings: { ...DEFAULT_REMINDER_SETTINGS, deadlineTime: '18:30' }
    });
    expect(reminder.when).toBe(at(2026, 11, 26, 18, 30));
  });
});

describe('planReminders: contests', () => {
  const contestTask = task({ id: 9, name: '🏆 Codeforces: Round 1000', last_date: '2026-11-26', cf_contest_id: 2000 });
  const startsAt = at(2026, 11, 26, 20, 5);
  const contestStarts = { 2000: startsAt / 1000 };

  it('reminds the chosen number of minutes before the start', () => {
    const reminders = plan([contestTask], {
      contestStarts,
      settings: { ...DEFAULT_REMINDER_SETTINGS, deadlines: false, contestLeadMinutes: 30 }
    });

    expect(reminders).toEqual([{
      key: `contest:9:${startsAt}`,
      when: startsAt - 30 * 60 * 1000,
      title: 'Contest in 30 minutes',
      message: '🏆 Codeforces: Round 1000'
    }]);
  });

  it('fires right away with the start time if the lead time already passed', () => {
    const tenMinutesBefore = startsAt - 10 * 60 * 1000;
    const [reminder] = plan([contestTask], {
      contestStarts, now: tenMinutesBefore,
      settings: { ...DEFAULT_REMINDER_SETTINGS, deadlines: false }
    });

    expect(reminder.when).toBe(tenMinutesBefore);
    expect(reminder.title).toMatch(/^Contest starts at /);
  });

  it('skips contests that already started or have no known start', () => {
    expect(plan([contestTask], {
      contestStarts, now: startsAt + 1,
      settings: { ...DEFAULT_REMINDER_SETTINGS, deadlines: false }
    })).toEqual([]);

    expect(plan([contestTask], { settings: { ...DEFAULT_REMINDER_SETTINGS, deadlines: false } })).toEqual([]);
  });

  it('can remind about both the deadline and the contest, in time order', () => {
    expect(plan([contestTask], { contestStarts }).map(r => r.key.split(':')[0])).toEqual(['due', 'contest']);
  });
});

describe('settings', () => {
  it('returns nothing when reminders are off', () => {
    expect(plan([task({ last_date: '2026-11-26' })], {
      settings: { ...DEFAULT_REMINDER_SETTINGS, enabled: false }
    })).toEqual([]);
  });

  it('cleans stored settings', () => {
    expect(cleanReminderSettings({ deadlineTime: '25:99', contestLeadMinutes: 7, enabled: 'yes' }))
      .toEqual({ ...DEFAULT_REMINDER_SETTINGS });
    expect(cleanReminderSettings(null)).toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(cleanReminderSettings({ enabled: false, contestLeadMinutes: '120' }))
      .toMatchObject({ enabled: false, contestLeadMinutes: 120 });
  });
});
