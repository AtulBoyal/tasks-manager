import { createSupabaseClient } from './supabaseClient';

// Google sign-in runs here rather than in the popup: Chrome closes the popup
// as soon as the sign-in window takes focus, which would abandon the flow.
// The resulting session is saved to chrome.storage.local for the popup.

// The popup owns token refresh; this client only performs the sign-in.
const supabase = createSupabaseClient({ autoRefreshToken: false });

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only accept requests from this extension's own pages
  if (sender.id !== chrome.runtime.id) return false;

  if (message?.type === 'SIGN_IN') {
    signInWithGoogle().then(
      () => sendResponse({ ok: true }),
      (error) => {
        console.error('Sign-in failed:', error);
        sendResponse({ ok: false, error: error?.message || 'Sign-in failed' });
      }
    );
    return true; // keep the channel open for the async response
  }

  return false;
});
