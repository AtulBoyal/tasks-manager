import { getLocalDateString, parseLocalDate } from '@shared/formatters';

// ---------------------------------------------------------------------------
// Settings (chrome.storage.local)
// ---------------------------------------------------------------------------

export const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  deadlines: true,
  deadlineTime: '09:00',      // local time on the due day
  contests: true,
  contestLeadMinutes: 60
};

export const CONTEST_LEAD_OPTIONS = [15, 30, 60, 120];

const SETTINGS_KEY = 'reminderSettings';

const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const cleanReminderSettings = (raw) => {
  const settings = { ...DEFAULT_REMINDER_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    enabled: settings.enabled !== false,
    deadlines: settings.deadlines !== false,
    deadlineTime: isValidTime(settings.deadlineTime) ? settings.deadlineTime : DEFAULT_REMINDER_SETTINGS.deadlineTime,
    contests: settings.contests !== false,
    contestLeadMinutes: CONTEST_LEAD_OPTIONS.includes(Number(settings.contestLeadMinutes))
      ? Number(settings.contestLeadMinutes)
      : DEFAULT_REMINDER_SETTINGS.contestLeadMinutes
  };
};

export const getReminderSettings = async () =>
  cleanReminderSettings((await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);

export const saveReminderSettings = async (settings) => {
  const clean = cleanReminderSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: clean });
  return clean;
};

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export const PLAN_HORIZON_DAYS = 7;

const atLocalTime = (dateStr, time) => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = parseLocalDate(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
};

const formatClock = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Works out which notifications to show and when.
 * Returns [{ key, when, title, message }] sorted by time. `key` is unique per
 * reminder occurrence, so a reminder that was already shown is never repeated.
 *
 *  - Deadlines: on the due day at settings.deadlineTime. If that time has
 *    passed (e.g. Chrome was closed) it fires now, but only on the due day.
 *  - Contests: contestLeadMinutes before the start, for contests not yet started.
 */
export const planReminders = ({ tasks, contestStarts = {}, settings, now = Date.now() }) => {
  const config = cleanReminderSettings(settings);
  if (!config.enabled) return [];

  const today = getLocalDateString(new Date(now));
  const horizon = now + PLAN_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const reminders = [];

  for (const task of tasks) {
    if (task.completed || task.archived) continue;

    if (config.deadlines && task.last_date && task.last_date >= today) {
      const when = atLocalTime(task.last_date, config.deadlineTime);
      if (when <= horizon) {
        reminders.push({
          key: `due:${task.id}:${task.last_date}`,
          when: Math.max(when, now),
          title: 'Due today',
          message: task.name
        });
      }
    }

    const startSeconds = task.cf_contest_id ? contestStarts[task.cf_contest_id] : null;
    if (config.contests && startSeconds) {
      const start = startSeconds * 1000;
      const when = start - config.contestLeadMinutes * 60 * 1000;
      if (start > now && when <= horizon) {
        reminders.push({
          key: `contest:${task.id}:${start}`,
          when: Math.max(when, now),
          title: when >= now
            ? `Contest in ${config.contestLeadMinutes} minutes`
            : `Contest starts at ${formatClock(start)}`,
          message: task.name
        });
      }
    }
  }

  return reminders.sort((a, b) => a.when - b.when);
};
