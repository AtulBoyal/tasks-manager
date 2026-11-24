import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultLock, AUTO_LOCK_MINUTES } from '../../hooks/useVaultLock';
import * as pinVault from '../../utils/pinVault';
import { authService } from '../../services/authService';

vi.mock('react-hot-toast', () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

vi.mock('../../services/authService', () => ({
  authService: { signOut: vi.fn().mockResolvedValue(undefined) }
}));

const USER = 'user-1';
const session = { user: { id: USER, email: 'test@example.com' } };

const renderVault = () => renderHook(() => useVaultLock(session));

describe('useVaultLock', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts locked with no PIN, and creates one with confirmation', async () => {
    const { result } = renderVault();

    expect(result.current.isLocallyUnlocked).toBe(false);
    expect(result.current.hasPin).toBe(false);

    let created;
    await act(async () => {
      created = await result.current.createPin('4821', '4822');
    });
    expect(created).toBe(false);
    expect(pinVault.hasPin(USER)).toBe(false);

    await act(async () => {
      created = await result.current.createPin('4821', '4821');
    });
    expect(created).toBe(true);
    expect(result.current.hasPin).toBe(true);
    expect(result.current.isLocallyUnlocked).toBe(true);
  });

  it('will not overwrite an existing PIN from the create screen', async () => {
    await pinVault.setPin(USER, '4821');
    const { result } = renderVault();

    await act(async () => {
      await result.current.createPin('1111', '1111');
    });

    expect(await pinVault.verifyPin(USER, '4821')).toBe(true);
    expect(result.current.isLocallyUnlocked).toBe(false);
  });

  it('unlocks with the right PIN and stays locked with a wrong one', async () => {
    await pinVault.setPin(USER, '4821');
    const { result } = renderVault();

    await act(async () => {
      await result.current.handleUnlock('0000');
    });
    expect(result.current.isLocallyUnlocked).toBe(false);
    expect(pinVault.getAttempts(USER).failures).toBe(1);

    await act(async () => {
      await result.current.handleUnlock('4821');
    });
    expect(result.current.isLocallyUnlocked).toBe(true);
    expect(pinVault.getAttempts(USER).failures).toBe(0);
  });

  it('refuses to check the PIN during a lockout', async () => {
    await pinVault.setPin(USER, '4821');
    for (let i = 0; i < pinVault.FREE_ATTEMPTS; i++) pinVault.recordFailure(USER);

    const { result } = renderVault();
    expect(result.current.lockedUntil).toBeGreaterThan(Date.now());

    await act(async () => {
      await result.current.handleUnlock('4821');
    });
    expect(result.current.isLocallyUnlocked).toBe(false);
  });

  it('signs out after too many failures', async () => {
    await pinVault.setPin(USER, '4821');
    for (let i = 0; i < pinVault.MAX_ATTEMPTS_BEFORE_SIGNOUT - 1; i++) {
      pinVault.recordFailure(USER, 0); // lockouts already expired
    }

    const { result } = renderVault();

    await act(async () => {
      await result.current.handleUnlock('0000');
    });

    expect(authService.signOut).toHaveBeenCalledTimes(1);
    expect(pinVault.getAttempts(USER).failures).toBe(0);
  });

  it('forgot PIN wipes the vault and signs out', async () => {
    await pinVault.setPin(USER, '4821');
    pinVault.setBiometricCredentialId(USER, 'cred');
    const { result } = renderVault();

    await act(async () => {
      await result.current.forgotPin();
    });

    expect(pinVault.hasPin(USER)).toBe(false);
    expect(pinVault.getBiometricCredentialId(USER)).toBeNull();
    expect(authService.signOut).toHaveBeenCalledTimes(1);
  });

  it('changes the PIN only when the current PIN is correct', async () => {
    await pinVault.setPin(USER, '4821');
    const { result } = renderVault();

    let changed;
    await act(async () => {
      changed = await result.current.changePin('0000', '1357', '1357');
    });
    expect(changed).toBe(false);
    expect(await pinVault.verifyPin(USER, '4821')).toBe(true);

    await act(async () => {
      changed = await result.current.changePin('4821', '1357', '1357');
    });
    expect(changed).toBe(true);
    expect(await pinVault.verifyPin(USER, '1357')).toBe(true);
  });

  it('auto-locks after inactivity', async () => {
    await pinVault.setPin(USER, '4821');
    // Fake timers before unlocking so the auto-lock interval uses them
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const { result } = renderVault();

    await act(async () => {
      await result.current.handleUnlock('4821');
    });
    expect(result.current.isLocallyUnlocked).toBe(true);

    act(() => {
      vi.advanceTimersByTime(AUTO_LOCK_MINUTES * 60 * 1000 + 15 * 1000);
    });

    expect(result.current.isLocallyUnlocked).toBe(false);
  });

  it('activity postpones auto-lock', async () => {
    await pinVault.setPin(USER, '4821');
    // Fake timers before unlocking so the auto-lock interval uses them
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const { result } = renderVault();

    await act(async () => {
      await result.current.handleUnlock('4821');
    });

    act(() => {
      vi.advanceTimersByTime((AUTO_LOCK_MINUTES - 1) * 60 * 1000);
      document.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(result.current.isLocallyUnlocked).toBe(true);
  });
});
