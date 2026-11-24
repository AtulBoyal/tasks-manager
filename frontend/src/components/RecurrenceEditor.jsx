import { normalizeRule, describeRecurrence, MAX_INTERVAL } from '../utils/recurrence';
import { parseLocalDate } from '../utils/formatters';

const WEEKDAYS = [
  { day: 0, short: 'S', label: 'Sunday' },
  { day: 1, short: 'M', label: 'Monday' },
  { day: 2, short: 'T', label: 'Tuesday' },
  { day: 3, short: 'W', label: 'Wednesday' },
  { day: 4, short: 'T', label: 'Thursday' },
  { day: 5, short: 'F', label: 'Friday' },
  { day: 6, short: 'S', label: 'Saturday' }
];

const UNITS = { daily: 'day', weekly: 'week', monthly: 'month' };

const smallInput =
  "w-16 px-2 py-1 rounded-md border border-orange-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-black dark:text-white text-center outline-none focus:border-orange-500";

const parseNumber = (value) => {
  const number = Number.parseInt(value, 10);
  return Number.isNaN(number) ? '' : number;
};

// Frequency + "every N", weekdays (weekly) and day of month (monthly).
// `rule` holds what the user typed; normalizeRule() fills defaults from the deadline.
export default function RecurrenceEditor({ recurrence, setRecurrence, rule, setRule, lastDate }) {
  const effective = normalizeRule(recurrence, rule, lastDate || null);
  const interval = rule?.interval ?? 1;
  const deadlineDay = lastDate ? parseLocalDate(lastDate).getDate() : null;

  const toggleWeekday = (day) => {
    const current = effective?.weekdays ?? [];
    const weekdays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setRule({ ...rule, weekdays });
  };

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto mt-1 mb-2 bg-white/40 dark:bg-slate-900/40 px-3 py-2 rounded-lg border border-orange-100 dark:border-slate-700 text-sm">
      <label className="font-bold text-[#c57415] dark:text-orange-400 flex items-center gap-2">
        <span>🔁</span> Repeat:
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value)}
          className="ml-1 bg-transparent border-b border-orange-200 dark:border-slate-600 focus:border-orange-500 outline-none text-black dark:text-white font-semibold cursor-pointer"
        >
          <option value="none" className="bg-white dark:bg-slate-800">Never (one-off)</option>
          <option value="daily" className="bg-white dark:bg-slate-800">Daily</option>
          <option value="weekly" className="bg-white dark:bg-slate-800">Weekly</option>
          <option value="monthly" className="bg-white dark:bg-slate-800">Monthly</option>
        </select>
      </label>

      {recurrence !== 'none' && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-700 dark:text-slate-200">
            <label className="flex items-center gap-2">
              every
              <input
                type="number"
                min="1"
                max={MAX_INTERVAL}
                value={interval}
                onChange={(e) => setRule({ ...rule, interval: parseNumber(e.target.value) })}
                aria-label="Repeat every"
                className={smallInput}
              />
              {UNITS[recurrence]}{interval === 1 || interval === '' ? '' : 's'}
            </label>

            {recurrence === 'weekly' && (
              <div role="group" aria-label="Repeat on" className="flex gap-1">
                {WEEKDAYS.map(({ day, short, label }) => {
                  const selected = effective?.weekdays?.includes(day) ?? false;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      aria-pressed={selected}
                      aria-label={label}
                      title={label}
                      className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                        selected
                          ? 'bg-orange-500 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-orange-200 dark:border-slate-600 hover:border-orange-400'
                      }`}
                    >
                      {short}
                    </button>
                  );
                })}
              </div>
            )}

            {recurrence === 'monthly' && (
              <label className="flex items-center gap-2">
                on day
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={rule?.monthDay ?? ''}
                  placeholder={deadlineDay ? String(deadlineDay) : '1'}
                  onChange={(e) => setRule({ ...rule, monthDay: parseNumber(e.target.value) })}
                  aria-label="Day of month"
                  className={smallInput}
                />
              </label>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            {describeRecurrence(recurrence, effective)}
            {recurrence === 'weekly' && !effective?.weekdays && ' · pick days, or set a deadline to use its weekday'}
            {recurrence === 'monthly' && effective?.monthDay > 28 && ' · shorter months use their last day'}
          </p>
        </>
      )}
    </div>
  );
}
