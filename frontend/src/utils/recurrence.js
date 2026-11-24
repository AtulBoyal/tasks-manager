// Recurrence rules and next-occurrence calculation.
//
// A task stores its frequency in `recurrence` ('none' | 'daily' | 'weekly' |
// 'monthly') and the details in `recurrence_rule`:
//   { interval: 1..365, weekdays?: [0..6] (weekly, 0 = Sunday), monthDay?: 1..31 (monthly) }
// e.g. "every 2 weeks on Mon and Wed" = weekly + { interval: 2, weekdays: [1, 3] }
//
// Shared with the browser extension (via @shared), so only import from this folder.

import { getLocalDateString, parseLocalDate } from './formatters';

export const FREQUENCIES = ['none', 'daily', 'weekly', 'monthly'];
export const MAX_INTERVAL = 365;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- local-date helpers ----------

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Whole days between two local dates (DST-safe via rounding)
const daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);

const startOfWeek = (date) => addDays(date, -date.getDay()); // Sunday

const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const monthDate = (year, month, day) =>
  new Date(year, month, Math.min(day, lastDayOfMonth(year, month)));

// ---------- rules ----------

const toInt = (value) => (Number.isInteger(value) ? value : Number.parseInt(value, 10));

/**
 * Returns a clean rule for the frequency, or null for one-off tasks.
 * Missing details are filled from the deadline (weekday / day of month), so
 * "monthly on the 31st" keeps its day instead of drifting after February.
 */
export const normalizeRule = (recurrence, rule, lastDate = null) => {
  if (!FREQUENCIES.includes(recurrence) || recurrence === 'none') return null;

  const source = rule && typeof rule === 'object' ? rule : {};
  const deadline = typeof lastDate === 'string' && lastDate ? parseLocalDate(lastDate) : null;

  const interval = toInt(source.interval);
  const result = {
    interval: Number.isInteger(interval) && interval >= 1 ? Math.min(interval, MAX_INTERVAL) : 1
  };

  if (recurrence === 'weekly') {
    const weekdays = [...new Set((Array.isArray(source.weekdays) ? source.weekdays : [])
      .map(toInt)
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
      .sort((a, b) => a - b);

    if (weekdays.length > 0) result.weekdays = weekdays;
    else if (deadline) result.weekdays = [deadline.getDay()];
  }

  if (recurrence === 'monthly') {
    const day = toInt(source.monthDay);
    if (Number.isInteger(day) && day >= 1 && day <= 31) result.monthDay = day;
    else if (deadline) result.monthDay = deadline.getDate();
  }

  return result;
};

/** "Daily", "Every 3 days", "Weekly on Mon, Wed", "Every 2 months on day 31" */
export const describeRecurrence = (recurrence, rule) => {
  if (!FREQUENCIES.includes(recurrence) || recurrence === 'none') return '';

  const interval = rule?.interval > 1 ? rule.interval : 1;
  const unit = { daily: 'day', weekly: 'week', monthly: 'month' }[recurrence];
  const base = interval === 1
    ? recurrence[0].toUpperCase() + recurrence.slice(1)
    : `Every ${interval} ${unit}s`;

  if (recurrence === 'weekly' && rule?.weekdays?.length) {
    const days = rule.weekdays;
    const label =
      days.join() === '1,2,3,4,5' ? 'weekdays'
      : days.join() === '0,6' ? 'weekends'
      : days.map((d) => DAY_NAMES[d]).join(', ');
    return `${base} on ${label}`;
  }

  if (recurrence === 'monthly' && rule?.monthDay) {
    return `${base} on day ${rule.monthDay}`;
  }

  return base;
};

// ---------- next occurrence ----------

/**
 * The first occurrence strictly after `anchor` that is not before `today`.
 * Missed occurrences are skipped, so an overdue task jumps to the next
 * upcoming date instead of another past one.
 */
export const nextOccurrence = (recurrence, rule, anchorDate, todayDate) => {
  const anchor = startOfDay(anchorDate);
  const today = startOfDay(todayDate);
  const interval = rule?.interval >= 1 ? Math.min(rule.interval, MAX_INTERVAL) : 1;
  const earliest = addDays(anchor, 1) > today ? addDays(anchor, 1) : today;

  if (recurrence === 'daily') {
    const steps = Math.ceil(daysBetween(anchor, earliest) / interval);
    return addDays(anchor, Math.max(1, steps) * interval);
  }

  if (recurrence === 'weekly') {
    const weekdays = rule?.weekdays?.length ? rule.weekdays : [anchor.getDay()];
    const anchorWeek = startOfWeek(anchor);

    // Within (interval + 1) weeks of `earliest` there is always a match
    for (let i = 0; i < 7 * (interval + 1); i++) {
      const day = addDays(earliest, i);
      const weekIndex = daysBetween(anchorWeek, startOfWeek(day)) / 7;
      if (weekIndex % interval === 0 && weekdays.includes(day.getDay())) return day;
    }
  }

  if (recurrence === 'monthly') {
    const dayOfMonth = rule?.monthDay ?? anchor.getDate();
    const monthsBehind =
      (earliest.getFullYear() - anchor.getFullYear()) * 12 + (earliest.getMonth() - anchor.getMonth());
    let step = Math.max(1, Math.floor(monthsBehind / interval));

    for (;;) {
      const candidate = monthDate(anchor.getFullYear(), anchor.getMonth() + step * interval, dayOfMonth);
      if (candidate >= earliest) return candidate;
      step++;
    }
  }

  return null;
};

/**
 * New dates for a completed recurring task that is being reopened.
 *  - With a deadline: the deadline moves to the next occurrence and the
 *    "appears on" date moves by the same number of days.
 *  - Without a deadline: the task reappears (start_date) on the next
 *    occurrence after it was completed, or immediately if that's today.
 */
export const reopenDates = (task, todayDate) => {
  const today = startOfDay(todayDate);
  const rule = task.recurrence_rule ?? normalizeRule(task.recurrence, null, task.last_date);

  if (task.last_date) {
    const previous = parseLocalDate(task.last_date);
    const next = nextOccurrence(task.recurrence, rule, previous, today);
    const shift = daysBetween(previous, next);

    return {
      last_date: getLocalDateString(next),
      start_date: task.start_date
        ? getLocalDateString(addDays(parseLocalDate(task.start_date), shift))
        : null
    };
  }

  const completedOn = task.completion_date ? startOfDay(new Date(task.completion_date)) : addDays(today, -1);
  const next = nextOccurrence(task.recurrence, rule, completedOn, today);

  return {
    last_date: null,
    start_date: next > today ? getLocalDateString(next) : null
  };
};
