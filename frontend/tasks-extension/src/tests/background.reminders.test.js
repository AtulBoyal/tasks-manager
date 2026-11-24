import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let session;
let tasks;
const query = {};

vi.mock('../supabaseClient', () => ({
  createSupabaseClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn()
    },
    from: vi.fn(() => query)
  }))
}));

// Supabase-style chain: .select().eq().eq().gte().lte() -> { data, error }
Object.assign(query, {
  select: vi.fn(() => query),
  eq: vi.fn(() => query),
  gte: vi.fn(() => query),
  lte: vi.fn(async () => ({ data: tasks, error: null }))
});

// Wednesday 25 Nov 2026, 08:00 local
const NOW = new Date(2026, 10, 25, 8, 0);
const at = (d, h, min = 0) => new Date(2026, 10, d, h, min).getTime();

const loadBackground = async () => {
  vi.resetModules();
  return import('../background.js');
};

const listenerFor = (api) => api.addListener.mock.calls[0][0];

describe('background reminders', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    session = { user: { id: 'user-1' } };
    tasks = [
      { id: 1, name: 'Submit lab', last_date: '2026-11-26', completed: false, archived: false, cf_contest_id: null }
    ];
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules an exact alarm for each planned reminder', async () => {
    const bg = await loadBackground();

    expect(await bg.syncReminders()).toBe(1);

    expect(chrome.alarms.create).toHaveBeenCalledWith('reminder:due:1:2026-11-26', { when: at(26, 9) });
    expect(chrome.storage.local.data.pendingReminders['due:1:2026-11-26'])
      .toMatchObject({ title: 'Due today', message: 'Submit lab' });
    // RLS-scoped query for upcoming, open tasks only
    expect(query.eq).toHaveBeenCalledWith('completed', false);
    expect(query.eq).toHaveBeenCalledWith('archived', false);
    expect(query.gte).toHaveBeenCalledWith('last_date', '2026-11-25');
  });

  it('replaces old reminder alarms on every sync', async () => {
    const bg = await loadBackground();
    chrome.alarms.create('reminder:due:99:2026-11-26', { when: 1 });

    await bg.syncReminders();

    expect(chrome.alarms.clear).toHaveBeenCalledWith('reminder:due:99:2026-11-26');
    expect([...chrome.alarms._all.keys()]).toEqual(['reminder:due:1:2026-11-26']);
  });

  it('clears everything when signed out or switched off', async () => {
    const bg = await loadBackground();
    session = null;

    expect(await bg.syncReminders()).toBe(0);
    expect(chrome.alarms.create).not.toHaveBeenCalled();
    expect(chrome.storage.local.data.pendingReminders).toEqual({});

    session = { user: { id: 'user-1' } };
    await chrome.storage.local.set({ reminderSettings: { enabled: false } });
    expect(await bg.syncReminders()).toBe(0);
  });

  it('shows a notification once, then never again for that reminder', async () => {
    const bg = await loadBackground();
    await bg.syncReminders();

    const onAlarm = listenerFor(chrome.alarms.onAlarm);
    await onAlarm({ name: 'reminder:due:1:2026-11-26' });
    await vi.waitFor(() => expect(chrome.notifications.create).toHaveBeenCalledTimes(1));

    expect(chrome.notifications.create).toHaveBeenCalledWith('due:1:2026-11-26', expect.objectContaining({
      type: 'basic',
      title: 'Due today',
      message: 'Submit lab',
      iconUrl: 'chrome-extension://test-extension-id/icon.png'
    }));

    // Same alarm again (e.g. duplicate wake-up) -> no second notification
    await bg.showReminder('due:1:2026-11-26');
    expect(chrome.notifications.create).toHaveBeenCalledTimes(1);

    // And the next sync doesn't schedule it again
    chrome.alarms.create.mockClear();
    expect(await bg.syncReminders()).toBe(0);
    expect(chrome.alarms.create).not.toHaveBeenCalled();
  });

  it('reminds before contests using cached Codeforces start times', async () => {
    const start = at(26, 20, 5);
    tasks = [{ id: 5, name: 'Round 1000', last_date: '2026-11-26', completed: false, archived: false, cf_contest_id: 2000 }];
    fetch.mockResolvedValue({
      json: async () => ({ status: 'OK', result: [{ id: 2000, phase: 'BEFORE', startTimeSeconds: start / 1000 }] })
    });
    await chrome.storage.local.set({ reminderSettings: { deadlines: false, contestLeadMinutes: 30 } });

    const bg = await loadBackground();
    await bg.syncReminders();
    await bg.syncReminders();

    expect(fetch).toHaveBeenCalledTimes(1); // second sync uses the cache
    expect(chrome.alarms.create).toHaveBeenCalledWith(`reminder:contest:5:${start}`, { when: start - 30 * 60 * 1000 });
  });

  it('still schedules deadlines if Codeforces is unreachable', async () => {
    tasks = [{ id: 5, name: 'Round', last_date: '2026-11-26', completed: false, archived: false, cf_contest_id: 2000 }];
    fetch.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const bg = await loadBackground();

    expect(await bg.syncReminders()).toBe(1);
  });

  it('starts the periodic sync on install and startup', async () => {
    await loadBackground();

    await listenerFor(chrome.runtime.onInstalled)();
    expect(chrome.alarms.create).toHaveBeenCalledWith('sync-reminders', { periodInMinutes: 30 });
    expect(listenerFor(chrome.runtime.onStartup)).toBe(listenerFor(chrome.runtime.onInstalled));
  });

  it('opens Tasks Manager when a notification is clicked', async () => {
    const bg = await loadBackground();

    listenerFor(chrome.notifications.onClicked)('due:1:2026-11-26');

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: bg.APP_URL });
    expect(chrome.notifications.clear).toHaveBeenCalledWith('due:1:2026-11-26');
  });

  it('answers SYNC_REMINDERS from its own pages only', async () => {
    await loadBackground();
    const onMessage = listenerFor(chrome.runtime.onMessage);

    expect(onMessage({ type: 'SYNC_REMINDERS' }, { id: 'other-extension' }, vi.fn())).toBe(false);

    const response = await new Promise((resolve) => {
      expect(onMessage({ type: 'SYNC_REMINDERS' }, { id: chrome.runtime.id }, resolve)).toBe(true);
    });
    expect(response).toEqual({ ok: true, scheduled: 1 });
  });
});
