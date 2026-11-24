// Parses Quick Add text like "submit lab by friday !urgent #os" into task fields.
// Shared with the browser extension (via the @shared alias), so it must only
// import from this folder.
//
// Supported (case-insensitive):
//   Dates      today, tonight, tomorrow/tmrw, monday..sunday (mon..sun),
//              next <weekday>, next week, next month, in N days/weeks/months,
//              5 dec / dec 5th, 2026-12-05. "by", "on" or "due" before a date
//              is removed with it. ALL-CAPS words (e.g. "SAT") are not dates.
//   Priority   !urgent !u !high | !normal !n !medium | !later !l !low
//   Tags       #tag
//   Recurrence every day / everyday, every week, every month, every 3 days,
//              every 2 weeks, every mon and wed, every mon,wed, every weekday,
//              every weekend
//   Links      http(s):// URLs
// Only the first date and first recurrence are used; other words stay in the name.

import { getLocalDateString } from './formatters';
import { normalizeRule, MAX_INTERVAL } from './recurrence';

const PRIORITIES = {
  '!urgent': 'Urgent', '!u': 'Urgent', '!high': 'Urgent',
  '!normal': 'Normal', '!n': 'Normal', '!medium': 'Normal',
  '!later': 'Later', '!l': 'Later', '!low': 'Later'
};

const WEEKDAYS = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6
};

const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
};

const UNITS = {
  day: 'day', days: 'day', week: 'week', weeks: 'week', month: 'month', months: 'month'
};

const CONNECTORS = new Set(['by', 'on', 'due']);

const FREQUENCY_BY_UNIT = { day: 'daily', week: 'weekly', month: 'monthly' };

// ---------- date helpers (local time) ----------

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Same day next month(s), clamped to the month's last day (Jan 31 -> Feb 28)
const addMonths = (date, months) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
};

// The coming <weekday>, today included
const upcomingWeekday = (today, weekday) =>
  addDays(today, (weekday - today.getDay() + 7) % 7);

const validDate = (year, month, day) => {
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
};

const parseDayNumber = (word) => {
  const match = /^(\d{1,2})(st|nd|rd|th)?$/.exec(word);
  return match ? Number(match[1]) : null;
};

// "5 dec" -> this year's Dec 5, or next year's if it has already passed
const dayMonthDate = (today, day, month) => {
  const thisYear = validDate(today.getFullYear(), month, day);
  if (!thisYear) return null;
  return thisYear < today ? validDate(today.getFullYear() + 1, month, day) : thisYear;
};

const isAcronym = (token) => token.length > 1 && token === token.toUpperCase() && /[A-Z]/.test(token);

// Tries to read a date starting at token i. Returns { date, length } or null.
const matchDateAt = (words, tokens, i, today) => {
  const w = words[i];
  const next = words[i + 1];
  const after = words[i + 2];

  if (w === 'today' || w === 'tonight') return { date: today, length: 1 };
  if (w === 'tomorrow' || w === 'tmrw' || w === 'tmr') return { date: addDays(today, 1), length: 1 };

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(w);
  if (iso) {
    const date = validDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return date ? { date, length: 1 } : null;
  }

  if (w === 'next' && next) {
    if (next === 'week') return { date: addDays(today, 7), length: 2 };
    if (next === 'month') return { date: addMonths(today, 1), length: 2 };
    if (next in WEEKDAYS && !isAcronym(tokens[i + 1])) {
      return { date: addDays(upcomingWeekday(today, WEEKDAYS[next]), 7), length: 2 };
    }
  }

  if (w in WEEKDAYS && !isAcronym(tokens[i])) {
    return { date: upcomingWeekday(today, WEEKDAYS[w]), length: 1 };
  }

  if (w === 'in' && /^\d{1,3}$/.test(next || '') && UNITS[after]) {
    const amount = Number(next);
    const unit = UNITS[after];
    const date = unit === 'day' ? addDays(today, amount)
      : unit === 'week' ? addDays(today, amount * 7)
      : addMonths(today, amount);
    return { date, length: 3 };
  }

  const dayFirst = parseDayNumber(w);
  if (dayFirst !== null && next in MONTHS) {
    const date = dayMonthDate(today, dayFirst, MONTHS[next]);
    return date ? { date, length: 2 } : null;
  }

  const dayAfter = parseDayNumber(next || '');
  if (w in MONTHS && dayAfter !== null) {
    const date = dayMonthDate(today, dayAfter, MONTHS[w]);
    return date ? { date, length: 2 } : null;
  }

  return null;
};

// Reads what follows "every" at token j. Returns { recurrence, rule, length } or null.
const matchRecurrenceAt = (words, tokens, j) => {
  const w = words[j];
  if (!w) return null;

  if (FREQUENCY_BY_UNIT[w]) {
    return { recurrence: FREQUENCY_BY_UNIT[w], rule: { interval: 1 }, length: 1 };
  }

  if (w === 'weekday' || w === 'weekdays') {
    return { recurrence: 'weekly', rule: { interval: 1, weekdays: [1, 2, 3, 4, 5] }, length: 1 };
  }
  if (w === 'weekend' || w === 'weekends') {
    return { recurrence: 'weekly', rule: { interval: 1, weekdays: [0, 6] }, length: 1 };
  }

  // every 3 days / every 2 weeks / every 6 months
  const unit = UNITS[words[j + 1]];
  if (/^\d{1,3}$/.test(w) && unit) {
    const interval = Number(w);
    if (interval < 1 || interval > MAX_INTERVAL) return null;
    return { recurrence: FREQUENCY_BY_UNIT[unit], rule: { interval }, length: 2 };
  }

  // every mon / every mon and wed / every mon,wed,fri
  const weekdays = [];
  let k = j;
  while (k < words.length) {
    if (words[k] === 'and' && k > j && words[k + 1]) {
      k++;
      continue;
    }
    const parts = words[k].split(',').filter(Boolean);
    const isDayList = parts.length > 0 && !isAcronym(tokens[k]) && parts.every((part) => part in WEEKDAYS);
    if (!isDayList) break;
    parts.forEach((part) => weekdays.push(WEEKDAYS[part]));
    k++;
  }
  // Don't swallow a trailing "and" that wasn't followed by a day
  while (k > j && words[k - 1] === 'and') k--;

  if (weekdays.length > 0) {
    return { recurrence: 'weekly', rule: { interval: 1, weekdays }, length: k - j };
  }

  return null;
};

const toLink = (token) => {
  const url = token.replace(/[),.;!?]+$/, '');
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return { title: parsed.hostname.replace(/^www\./, ''), url };
  } catch {
    return null;
  }
};

export const parseQuickAdd = (input, now = new Date()) => {
  const original = (input || '').trim();
  const tokens = original.split(/\s+/).filter(Boolean);
  // Lower-cased, trailing punctuation removed ("Friday," -> "friday")
  const words = tokens.map((t) => t.toLowerCase().replace(/[,.;!?]+$/, ''));
  const used = tokens.map(() => false);
  const today = startOfDay(now);

  const result = {
    name: '',
    factor: null,
    lastDate: null,
    recurrence: 'none',
    recurrenceRule: null,
    tags: [],
    links: []
  };

  // Links, priority and tags can appear anywhere
  tokens.forEach((token, i) => {
    if (/^https?:\/\//i.test(token)) {
      const link = toLink(token);
      if (link) {
        result.links.push(link);
        used[i] = true;
      }
      return;
    }

    const priority = PRIORITIES[token.toLowerCase()];
    if (priority) {
      result.factor = priority;
      used[i] = true;
      return;
    }

    const tag = /^#([a-z0-9][\w+-]*)$/i.exec(token);
    if (tag) {
      const value = tag[1].toLowerCase();
      if (!result.tags.includes(value)) result.tags.push(value);
      used[i] = true;
    }
  });

  // Recurrence (first match)
  for (let i = 0; i < tokens.length; i++) {
    if (used[i]) continue;

    if (words[i] === 'everyday') {
      result.recurrence = 'daily';
      used[i] = true;
      break;
    }

    if (words[i] !== 'every') continue;

    const match = matchRecurrenceAt(words, tokens, i + 1);
    if (!match) continue;

    const span = Array.from({ length: match.length + 1 }, (_, k) => i + k);
    if (span.some((k) => used[k])) continue;
    span.forEach((k) => { used[k] = true; });

    result.recurrence = match.recurrence;
    result.recurrenceRule = match.rule;

    // "every mon and wed" is first due on the earliest of those days
    if (match.rule.weekdays && match.rule.weekdays.length < 7) {
      const upcoming = match.rule.weekdays.map((day) => upcomingWeekday(today, day));
      result.lastDate = getLocalDateString(new Date(Math.min(...upcoming)));
    }
    break;
  }

  // Deadline (first match)
  if (!result.lastDate) {
    for (let i = 0; i < tokens.length; i++) {
      if (used[i]) continue;

      const match = matchDateAt(words, tokens, i, today);
      if (!match) continue;

      const span = Array.from({ length: match.length }, (_, k) => i + k);
      if (span.some((k) => k >= tokens.length || used[k])) continue;

      span.forEach((k) => { used[k] = true; });
      if (i > 0 && !used[i - 1] && CONNECTORS.has(words[i - 1])) used[i - 1] = true;

      result.lastDate = getLocalDateString(match.date);
      break;
    }
  }

  result.recurrenceRule = normalizeRule(result.recurrence, result.recurrenceRule, result.lastDate);

  result.name =
    tokens.filter((_, i) => !used[i]).join(' ').trim() ||
    result.links[0]?.title ||
    original;

  return result;
};
