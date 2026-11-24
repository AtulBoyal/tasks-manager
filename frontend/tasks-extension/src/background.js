import { createSupabaseClient } from './supabaseClient';
import { getLocalDateString } from '@shared/formatters';
import { planReminders, getReminderSettings, PLAN_HORIZON_DAYS } from './reminders';

// Background service worker:
//  1. Google sign-in. It runs here rather than in the popup because Chrome
//     closes the popup as soon as the sign-in window takes focus.
//  2. Reminders: a periodic sync plans notifications for upcoming deadlines
//     and Codeforces contests and sets an exact-time alarm for each.

export const APP_URL = import.meta.env.VITE_APP_URL || 'https://tasks-manager-coral.vercel.app';

export const SYNC_ALARM = 'sync-reminders';
const SYNC_PERIOD_MINUTES = 30;
export const REMINDER_PREFIX = 'reminder:';
const CONTEST_CACHE_MS = 6 * 60 * 60 * 1000;
const SHOWN_RETENTION_MS = (PLAN_HORIZON_DAYS + 1) * 24 * 60 * 60 * 1000;

// The popup refreshes tokens while it's open; this client doesn't run a
// refresh timer, but getSession() still refreshes an expired session when a
// reminder sync needs it.
const supabase = createSupabaseClient({ autoRefreshToken: false });

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

const signInWithGoogle = async () => {
  const redirectTo = chrome.identity.getRedirectURL();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' }
    }
  });
  if (error) throw error;

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: data.url,
    interactive: true
  });

  const params = new URL(responseUrl).searchParams;

  const authError = params.get('error_description') || params.get('error');
  if (authError) throw new Error(authError);

  const code = params.get('code');
  if (!code) throw new Error('Sign-in did not return an authorization code.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
};

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

const readStorage = async (key, fallback) =>
  (await chrome.storage.local.get(key))[key] ?? fallback;

const fetchUpcomingTasks = async () => {
  const now = new Date();
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + PLAN_HORIZON_DAYS);

  // RLS limits this to the signed-in user's tasks
  const { data, error } = await supabase
    .from('tasks')
    .select('id, name, last_date, completed, archived, cf_contest_id')
    .eq('completed', false)
    .eq('archived', false)
    .gte('last_date', getLocalDateString(now))
    .lte('last_date', getLocalDateString(horizon));

  if (error) throw error;
  return data ?? [];
};

// { [contestId]: startTimeSeconds } for upcoming contests, cached for 6 hours
const getContestStarts = async () => {
  const cache = await readStorage('cfContestCache', null);
  if (cache && Date.now() - cache.fetchedAt < CONTEST_CACHE_MS) return cache.starts;

  const response = await fetch('https://codeforces.com/api/contest.list?gym=false');
  const body = await response.json();
  if (body?.status !== 'OK') throw new Error('Codeforces API unavailable');

  const starts = Object.fromEntries(
    body.result
      .filter((contest) => contest.phase === 'BEFORE')
      .map((contest) => [contest.id, contest.startTimeSeconds])
  );

  await chrome.storage.local.set({ cfContestCache: { fetchedAt: Date.now(), starts } });
  return starts;
};

const clearReminderAlarms = async () => {
  const alarms = await chrome.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => alarm.name.startsWith(REMINDER_PREFIX))
      .map((alarm) => chrome.alarms.clear(alarm.name))
  );
};

const doSync = async () => {
  await clearReminderAlarms();

  const settings = await getReminderSettings();
  const { data: { session } } = await supabase.auth.getSession();

  if (!settings.enabled || !session) {
    await chrome.storage.local.set({ pendingReminders: {} });
    return 0;
  }

  const tasks = await fetchUpcomingTasks();

  let contestStarts = {};
  if (settings.contests && tasks.some((task) => task.cf_contest_id)) {
    try {
      contestStarts = await getContestStarts();
    } catch (error) {
      console.error('Could not load contest times:', error);
    }
  }

  // Forget old "already shown" entries so storage doesn't grow forever
  const now = Date.now();
  const shown = Object.fromEntries(
    Object.entries(await readStorage('shownReminders', {}))
      .filter(([, shownAt]) => now - shownAt < SHOWN_RETENTION_MS)
  );

  const pending = {};
  for (const reminder of planReminders({ tasks, contestStarts, settings, now })) {
    if (shown[reminder.key]) continue;
    pending[reminder.key] = reminder;
    chrome.alarms.create(`${REMINDER_PREFIX}${reminder.key}`, {
      when: Math.max(reminder.when, now + 1000)
    });
  }

  await chrome.storage.local.set({ pendingReminders: pending, shownReminders: shown });
  return Object.keys(pending).length;
};

// Overlapping syncs (alarm + popup message) share one run
let syncInFlight = null;

export const syncReminders = () => {
  if (!syncInFlight) {
    syncInFlight = doSync()
      .catch((error) => {
        console.error('Reminder sync failed:', error);
        return 0;
      })
      .finally(() => {
        syncInFlight = null;
      });
  }
  return syncInFlight;
};

export const showReminder = async (key) => {
  const pending = await readStorage('pendingReminders', {});
  const shown = await readStorage('shownReminders', {});
  const reminder = pending[key];

  if (!reminder || shown[key]) return;

  await chrome.notifications.create(key, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title: reminder.title,
    message: reminder.message,
    priority: 1
  });

  await chrome.storage.local.set({ shownReminders: { ...shown, [key]: Date.now() } });
};

const startPeriodicSync = () => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_PERIOD_MINUTES });
  return syncReminders();
};

// ---------------------------------------------------------------------------
// Listeners
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(startPeriodicSync);
chrome.runtime.onStartup.addListener(startPeriodicSync);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) {
    syncReminders();
  } else if (alarm.name.startsWith(REMINDER_PREFIX)) {
    showReminder(alarm.name.slice(REMINDER_PREFIX.length));
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: APP_URL });
  chrome.notifications.clear(notificationId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only accept requests from this extension's own pages
  if (sender.id !== chrome.runtime.id) return false;

  if (message?.type === 'SIGN_IN') {
    signInWithGoogle().then(
      () => {
        syncReminders();
        sendResponse({ ok: true });
      },
      (error) => {
        console.error('Sign-in failed:', error);
        sendResponse({ ok: false, error: error?.message || 'Sign-in failed' });
      }
    );
    return true; // keep the channel open for the async response
  }

  if (message?.type === 'SYNC_REMINDERS') {
    syncReminders().then((count) => sendResponse({ ok: true, scheduled: count }));
    return true;
  }

  return false;
});
