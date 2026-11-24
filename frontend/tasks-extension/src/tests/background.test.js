import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = {
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn()
};

vi.mock('../supabaseClient', () => ({
  createSupabaseClient: vi.fn(() => ({ auth }))
}));

// Loads background.js fresh and returns the registered message listener
const loadListener = async () => {
  vi.resetModules();
  await import('../background.js');
  return chrome.runtime.onMessage.addListener.mock.calls[0][0];
};

// Calls the listener and waits for its async sendResponse
const send = (listener, message, sender = { id: chrome.runtime.id }) =>
  new Promise((resolve) => {
    const keepOpen = listener(message, sender, resolve);
    if (!keepOpen) resolve(undefined);
  });

describe('background sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://example.supabase.co/auth/v1/authorize?provider=google' },
      error: null
    });
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it('ignores messages from other extensions', async () => {
    const listener = await loadListener();

    const response = await send(listener, { type: 'SIGN_IN' }, { id: 'someone-else' });

    expect(response).toBeUndefined();
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('runs the PKCE flow and exchanges the returned code', async () => {
    chrome.identity.launchWebAuthFlow.mockResolvedValue(
      'https://test-extension-id.chromiumapp.org/?code=abc123'
    );
    const listener = await loadListener();

    const response = await send(listener, { type: 'SIGN_IN' });

    expect(response).toEqual({ ok: true });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'google',
      options: expect.objectContaining({
        redirectTo: 'https://test-extension-id.chromiumapp.org/',
        skipBrowserRedirect: true
      })
    }));
    expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledWith({
      url: 'https://example.supabase.co/auth/v1/authorize?provider=google',
      interactive: true
    });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('reports errors returned by the provider', async () => {
    chrome.identity.launchWebAuthFlow.mockResolvedValue(
      'https://test-extension-id.chromiumapp.org/?error=access_denied&error_description=User+cancelled'
    );
    const listener = await loadListener();

    const response = await send(listener, { type: 'SIGN_IN' });

    expect(response).toEqual({ ok: false, error: 'User cancelled' });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('reports a cancelled sign-in window', async () => {
    chrome.identity.launchWebAuthFlow.mockRejectedValue(new Error('The user did not approve access.'));
    const listener = await loadListener();

    const response = await send(listener, { type: 'SIGN_IN' });

    expect(response).toEqual({ ok: false, error: 'The user did not approve access.' });
  });
});
