# Tasks Quick Add (Chrome extension)

Add a task to Tasks Manager from any tab: press **Ctrl+Shift+K**
(**Cmd+Shift+K** on Mac) or click the toolbar icon. Type naturally, e.g.
`submit lab friday !urgent #os` or `gym every mon and wed`.

It also shows **desktop reminders** for deadlines (on the due day, 09:00 by
default) and Codeforces contests (60 minutes before by default). Change them
under **⏰ Reminders** in the popup.

## How it works

- **Sign-in:** Google sign-in through Supabase, run by the background service
  worker with `chrome.identity.launchWebAuthFlow` (PKCE). The session is kept in
  `chrome.storage.local`; signing out of the extension does not sign you out
  of the web app.
- **Data:** tasks are inserted directly into Supabase as the signed-in user,
  so the same Row Level Security rules as the web app apply.
- **Tagging:** auto-tags come from the web app's `src/utils/tagEngine.js`
  (imported via the `@shared` alias), so both stay in sync.
- **Reminders:** the background worker syncs every 30 minutes (and on startup,
  sign-in, adding a task or changing settings). It reads upcoming tasks,
  plans reminders (`src/reminders.js`) and sets an exact-time `chrome.alarms`
  alarm per reminder. Each reminder is shown once; contest start times come
  from the Codeforces API and are cached for 6 hours. Reminders only appear
  while Chrome is running.
- **Stable ID:** the `key` in `manifest.json` pins the extension ID to
  `cogdfcnlmeiojefhcjdncmhbnbjnjgde`, which the sign-in redirect depends on.

## Setup

1. Create `tasks-extension/.env`:

   ```env
   VITE_SUPABASE_URL=YOUR_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   # Optional: page opened when a reminder is clicked
   VITE_APP_URL=https://tasks-manager-coral.vercel.app
   ```

2. In Supabase → **Authentication → URL Configuration → Redirect URLs**, add:

   ```
   https://cogdfcnlmeiojefhcjdncmhbnbjnjgde.chromiumapp.org/**
   ```

3. Build and load it:

   ```bash
   npm install
   npm run build
   ```

   Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**
   and choose `tasks-extension/dist`.

## Development

```bash
npm run dev     # rebuilds on change; reload the extension in chrome://extensions
npm run lint
npm test
```

## Publishing to the Chrome Web Store

The store assigns its own extension ID. Before uploading, remove `key` from
`manifest.json`, then add the store ID's `https://<id>.chromiumapp.org/**`
redirect URL in Supabase.
