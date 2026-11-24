import { useState, useEffect, useRef } from 'react';
import { createSupabaseClient } from './supabaseClient';
import { generateAutoTags } from '@shared/tagEngine';
import { parseQuickAdd } from '@shared/quickAddParser';
import { getLocalDateString, parseLocalDate } from '@shared/formatters';
import { describeRecurrence } from '@shared/recurrence';

// The popup owns token refresh (see supabaseClient.js)
const supabase = createSupabaseClient({ autoRefreshToken: true });

const inputClass =
  "w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-xs placeholder-slate-500";

const PRIORITY_LABELS = { Urgent: '🔴 Urgent', Normal: '🟡 Normal', Later: '🔵 Later' };

// One-line summary of what the typed text sets, e.g. "📅 Fri 27 Nov · 🔴 Urgent · #os"
const describeParsed = (parsed) =>
  [
    parsed.lastDate &&
      `📅 ${parseLocalDate(parsed.lastDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`,
    parsed.factor && PRIORITY_LABELS[parsed.factor],
    parsed.recurrence !== 'none' && `🔁 ${describeRecurrence(parsed.recurrence, parsed.recurrenceRule)}`,
    ...parsed.tags.map((tag) => `#${tag}`),
    ...parsed.links.map((l) => `🔗 ${l.title}`)
  ]
    .filter(Boolean)
    .join(' · ');

// undefined while loading, null when signed out
const useSession = () => {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let active = true;

    const load = () =>
      supabase.auth.getSession().then(({ data }) => {
        if (active) setSession(data.session);
      });

    load();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));

    // The background worker saves the session after Google sign-in
    const onStorageChange = (_changes, area) => {
      if (area === 'local') load();
    };
    chrome.storage.onChanged.addListener(onStorageChange);

    return () => {
      active = false;
      subscription.unsubscribe();
      chrome.storage.onChanged.removeListener(onStorageChange);
    };
  }, []);

  return session;
};

function SignIn() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const signIn = async () => {
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      // Chrome may close this popup while the Google window is open; the
      // background worker finishes the sign-in either way.
      const response = await chrome.runtime.sendMessage({ type: 'SIGN_IN' });
      if (!response?.ok) setErrorMsg(response?.error || 'Sign-in failed.');
    } catch (error) {
      setErrorMsg(error?.message || 'Sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-300">
        Sign in with the Google account you use for Tasks Manager.
      </p>
      <button
        onClick={signIn}
        disabled={isSigningIn}
        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white py-2 rounded-md font-bold text-sm transition-colors"
      >
        {isSigningIn ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {errorMsg && <p className="text-xs text-red-400" role="alert">{errorMsg}</p>}
    </div>
  );
}

function QuickAddForm({ session }) {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Normal');
  const [lastDate, setLastDate] = useState(() => getLocalDateString());
  const [link, setLink] = useState('');
  const [tags, setTags] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = taskName.trim();
    if (!cleanName) return;

    setIsSaving(true);
    setErrorMsg('');

    // Same shape as the web app: [{ title, url }]
    const cleanLink = link.trim();
    const linkArray = cleanLink ? [{ title: cleanLink, url: cleanLink }] : [];

    const manualTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    // Anything typed in the task text ("friday !urgent #os") wins over the
    // form fields; fields fill in whatever the text doesn't specify.
    const parsed = parseQuickAdd(cleanName);

    try {
      // Supabase returns errors instead of throwing them
      const { error } = await supabase.from('tasks').insert([{
        user_id: session.user.id,
        name: parsed.name,
        factor: parsed.factor ?? factor,
        last_date: parsed.lastDate ?? (lastDate || null),
        start_date: null,
        completed: false,
        recurrence: parsed.recurrence,
        recurrence_rule: parsed.recurrenceRule,
        links: [...linkArray, ...parsed.links],
        tags: generateAutoTags(parsed.name, [...manualTags, ...parsed.tags]),
        subtasks: []
      }]);

      if (error) throw error;

      window.close(); // Only close once the task is actually saved
    } catch (error) {
      console.error("Failed to save:", error);
      setErrorMsg(error?.message || 'Failed to save task.');
    } finally {
      setIsSaving(false);
    }
  };

  const signOut = async () => {
    // 'local' signs out only this extension, not the web app
    await supabase.auth.signOut({ scope: 'local' });
  };

  const parsedSummary = taskName.trim() ? describeParsed(parseQuickAdd(taskName)) : '';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="e.g. submit lab friday !urgent #os"
        className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-sm placeholder-slate-400"
        disabled={isSaving}
        required
      />

      {parsedSummary && (
        <p className="-mt-1 text-[11px] text-orange-300" role="status" aria-label="Parsed from text">
          {parsedSummary}
        </p>
      )}

      <div className="flex gap-2">
        <select
          value={factor}
          onChange={(e) => setFactor(e.target.value)}
          className="w-1/2 px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-xs text-slate-200 cursor-pointer"
          disabled={isSaving}
        >
          <option value="Urgent">🔴 Urgent</option>
          <option value="Normal">🟡 Normal</option>
          <option value="Later">🔵 Later</option>
        </select>

        <input
          type="date"
          value={lastDate || ''}
          onChange={(e) => setLastDate(e.target.value)}
          className="w-1/2 px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-xs text-slate-200"
          disabled={isSaving}
        />
      </div>

      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://... (Optional link)"
        className={inputClass}
        disabled={isSaving}
      />

      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Extra tags? (Auto-tags apply automatically)"
        className={inputClass}
        disabled={isSaving}
      />

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2 rounded-md font-bold text-sm transition-colors mt-1"
      >
        {isSaving ? 'Saving...' : 'Add to Tasks'}
      </button>

      {errorMsg && (
        <p className="text-xs text-red-400" role="alert">{errorMsg}</p>
      )}

      <div className="flex justify-between items-center text-[11px] text-slate-500">
        <span className="truncate">{session.user.email}</span>
        <button type="button" onClick={signOut} className="hover:text-red-400 hover:underline">
          Sign out
        </button>
      </div>
    </form>
  );
}

function App() {
  const session = useSession();

  return (
    <div className="w-[320px] p-4 bg-slate-900 text-white font-sans border border-slate-700 shadow-2xl rounded-lg">
      <h2 className="text-sm font-bold text-orange-500 mb-4 flex items-center gap-2">
        <span>⚡</span> Quick Add Task
      </h2>

      {session === undefined ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : session ? (
        <QuickAddForm session={session} />
      ) : (
        <SignIn />
      )}
    </div>
  );
}

export default App;
