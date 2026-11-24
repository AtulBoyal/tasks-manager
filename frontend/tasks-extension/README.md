# Tasks Quick Add (Chrome extension)

Add a task to Tasks Manager from any tab: press **Ctrl+Shift+K**
(**Cmd+Shift+K** on Mac) or click the toolbar icon.

## How it works

- **Sign-in:** Google sign-in through Supabase, run by the background service
  worker with `chrome.identity.launchWebAuthFlow` (PKCE). The session is kept in
  `chrome.storage.local`; signing out of the extension does not sign you out
  of the web app.
- **Data:** tasks are inserted directly into Supabase as the signed-in user,
  so the same Row Level Security rules as the web app apply.
- **Tagging:** auto-tags come from the web app's `src/utils/tagEngine.js`
  (imported via the `@shared` alias), so both stay in sync.
- **Stable ID:** the `key` in `manifest.json` pins the extension ID to
  `cogdfcnlmeiojefhcjdncmhbnbjnjgde`, which the sign-in redirect depends on.

## Setup

1. Create `tasks-extension/.env`:

   ```env
   VITE_SUPABASE_URL=YOUR_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
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
