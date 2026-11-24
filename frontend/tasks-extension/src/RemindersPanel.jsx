import { useEffect, useState } from 'react';
import {
  getReminderSettings,
  saveReminderSettings,
  CONTEST_LEAD_OPTIONS
} from './reminders';

const fieldClass =
  "px-2 py-1 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-xs text-slate-200 disabled:opacity-50";

export default function RemindersPanel({ onBack }) {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getReminderSettings().then(setSettings);
  }, []);

  if (!settings) return <p className="text-xs text-slate-400">Loading…</p>;

  const update = (patch) => {
    setSettings((current) => ({ ...current, ...patch }));
    setStatus('');
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const saved = await saveReminderSettings(settings);
      setSettings(saved);
      const response = await chrome.runtime.sendMessage({ type: 'SYNC_REMINDERS' }).catch(() => null);
      const count = response?.scheduled ?? 0;
      setStatus(saved.enabled
        ? `Saved · ${count} upcoming reminder${count === 1 ? '' : 's'}`
        : 'Saved · reminders are off');
    } finally {
      setIsSaving(false);
    }
  };

  const off = !settings.enabled;

  return (
    <div className="flex flex-col gap-3 text-xs text-slate-200">
      <label className="flex items-center gap-2 font-semibold text-sm">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="accent-orange-500"
        />
        Desktop reminders
      </label>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="remind-deadlines"
          checked={settings.deadlines}
          disabled={off}
          onChange={(e) => update({ deadlines: e.target.checked })}
          className="accent-orange-500"
        />
        <label htmlFor="remind-deadlines">Deadlines, on the due day at</label>
        <input
          type="time"
          value={settings.deadlineTime}
          disabled={off || !settings.deadlines}
          onChange={(e) => update({ deadlineTime: e.target.value })}
          aria-label="Deadline reminder time"
          className={fieldClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="remind-contests"
          checked={settings.contests}
          disabled={off}
          onChange={(e) => update({ contests: e.target.checked })}
          className="accent-orange-500"
        />
        <label htmlFor="remind-contests">Codeforces contests,</label>
        <select
          value={settings.contestLeadMinutes}
          disabled={off || !settings.contests}
          onChange={(e) => update({ contestLeadMinutes: Number(e.target.value) })}
          aria-label="Minutes before a contest"
          className={fieldClass}
        >
          {CONTEST_LEAD_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>{minutes} min</option>
          ))}
        </select>
        <span>before</span>
      </div>

      <p className="text-[11px] text-slate-500">
        Reminders appear while Chrome is running. Clicking one opens Tasks Manager.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white px-4 py-1.5 rounded-md font-bold text-sm"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-slate-200 hover:underline">
          ← Back
        </button>
      </div>

      {status && <p className="text-[11px] text-emerald-400" role="status">{status}</p>}
    </div>
  );
}
