import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const insert = vi.fn();
const auth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  signOut: vi.fn()
};

vi.mock('../supabaseClient', () => ({
  createSupabaseClient: vi.fn(() => ({
    auth,
    from: vi.fn(() => ({ insert }))
  }))
}));

const { default: App } = await import('../App.jsx');

const session = { user: { id: 'user-1', email: 'me@example.com' } };

describe('popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
    window.close = vi.fn();
  });

  it('asks the background worker to sign in when there is no session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    chrome.runtime.sendMessage.mockResolvedValue({ ok: false, error: 'User cancelled' });

    render(<App />);

    fireEvent.click(await screen.findByText('Sign in with Google'));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SIGN_IN' });
    expect(await screen.findByRole('alert')).toHaveTextContent('User cancelled');
  });

  it('adds a task for the signed-in user with shared auto-tags', async () => {
    auth.getSession.mockResolvedValue({ data: { session } });

    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('What do you need to do?'), {
      target: { value: 'Upsolve codeforces round' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Optional link/), {
      target: { value: 'https://codeforces.com' }
    });
    fireEvent.click(screen.getByText('Add to Tasks'));

    await waitFor(() => expect(window.close).toHaveBeenCalled());

    const [[rows]] = insert.mock.calls;
    expect(rows[0]).toMatchObject({
      user_id: 'user-1',
      name: 'Upsolve codeforces round',
      links: [{ title: 'https://codeforces.com', url: 'https://codeforces.com' }]
    });
    expect(rows[0].tags).toContain('cp');
  });

  it('keeps the popup open and shows the error when saving fails', async () => {
    auth.getSession.mockResolvedValue({ data: { session } });
    insert.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } });

    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText('What do you need to do?'), {
      target: { value: 'Something' }
    });
    fireEvent.click(screen.getByText('Add to Tasks'));

    expect(await screen.findByRole('alert')).toHaveTextContent('row-level security');
    expect(window.close).not.toHaveBeenCalled();
  });

  it('signs out of the extension only', async () => {
    auth.getSession.mockResolvedValue({ data: { session } });

    render(<App />);

    fireEvent.click(await screen.findByText('Sign out'));

    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
