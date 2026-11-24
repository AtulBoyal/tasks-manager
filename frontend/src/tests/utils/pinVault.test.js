import { describe, it, expect, beforeEach } from 'vitest';
import * as pinVault from '../../utils/pinVault';

const USER = 'user-1';

describe('pinVault', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('PIN storage', () => {
    it('stores a salted hash, never the PIN itself', async () => {
      await pinVault.setPin(USER, '4821');

      const raw = localStorage.getItem(`vault_pin_v2_${USER}`);
      const record = JSON.parse(raw);

      expect(raw).not.toContain('4821');
      expect(record.v).toBe(2);
      expect(record.salt).toBeTruthy();
      expect(record.hash).toBeTruthy();
      expect(pinVault.hasPin(USER)).toBe(true);
    });

    it('uses a different salt each time', async () => {
      await pinVault.setPin(USER, '4821');
      const first = localStorage.getItem(`vault_pin_v2_${USER}`);
      await pinVault.setPin(USER, '4821');
      const second = localStorage.getItem(`vault_pin_v2_${USER}`);

      expect(first).not.toBe(second);
    });

    it('verifies correct and incorrect PINs', async () => {
      await pinVault.setPin(USER, '4821');

      expect(await pinVault.verifyPin(USER, '4821')).toBe(true);
      expect(await pinVault.verifyPin(USER, '4822')).toBe(false);
      expect(await pinVault.verifyPin(USER, '')).toBe(false);
    });

    it('rejects PINs outside the allowed length', async () => {
      await expect(pinVault.setPin(USER, '123')).rejects.toThrow();
      await expect(pinVault.setPin(USER, '1234567890123')).rejects.toThrow();
      expect(pinVault.validatePinFormat(' 1234')).toBeTruthy();
      expect(pinVault.validatePinFormat('1234')).toBeNull();
    });

    it('keeps PINs separate per user', async () => {
      await pinVault.setPin(USER, '4821');

      expect(pinVault.hasPin('someone-else')).toBe(false);
      expect(await pinVault.verifyPin('someone-else', '4821')).toBe(false);
    });
  });

  describe('legacy plain-text PIN migration', () => {
    it('upgrades a per-user plain-text PIN on successful verify', async () => {
      localStorage.setItem(`app_pin_${USER}`, '999');

      expect(pinVault.hasPin(USER)).toBe(true);
      expect(await pinVault.verifyPin(USER, 'wrong')).toBe(false);
      expect(localStorage.getItem(`app_pin_${USER}`)).toBe('999');

      // Short legacy PINs still work after the upgrade
      expect(await pinVault.verifyPin(USER, '999')).toBe(true);
      expect(localStorage.getItem(`app_pin_${USER}`)).toBeNull();
      expect(await pinVault.verifyPin(USER, '999')).toBe(true);
    });

    it('upgrades the old global app_pin key', async () => {
      localStorage.setItem('app_pin', '2468');

      expect(await pinVault.verifyPin(USER, '2468')).toBe(true);
      expect(localStorage.getItem('app_pin')).toBeNull();
    });
  });

  describe('failed attempts', () => {
    it('allows free attempts, then escalates the lockout', () => {
      const now = 1_000_000;

      for (let i = 1; i < pinVault.FREE_ATTEMPTS; i++) {
        expect(pinVault.recordFailure(USER, now).lockedUntil).toBe(0);
      }

      const fifth = pinVault.recordFailure(USER, now);
      expect(fifth.lockedUntil).toBe(now + 30_000);

      const sixth = pinVault.recordFailure(USER, now);
      expect(sixth.lockedUntil).toBe(now + 60_000);
    });

    it('asks for sign-out after the maximum attempts', () => {
      let result;
      for (let i = 0; i < pinVault.MAX_ATTEMPTS_BEFORE_SIGNOUT; i++) {
        result = pinVault.recordFailure(USER);
      }
      expect(result.shouldSignOut).toBe(true);
    });

    it('resets attempts', () => {
      pinVault.recordFailure(USER);
      pinVault.resetAttempts(USER);
      expect(pinVault.getAttempts(USER)).toEqual({ failures: 0, lockedUntil: 0 });
    });
  });

  describe('clearVault', () => {
    it('removes PIN, attempts and biometric data for the user', async () => {
      await pinVault.setPin(USER, '4821');
      pinVault.recordFailure(USER);
      pinVault.setBiometricCredentialId(USER, 'cred');
      localStorage.setItem(`app_pin_${USER}`, 'old');

      pinVault.clearVault(USER);

      expect(pinVault.hasPin(USER)).toBe(false);
      expect(pinVault.getAttempts(USER).failures).toBe(0);
      expect(pinVault.getBiometricCredentialId(USER)).toBeNull();
    });

    it('removes legacy plain-text biometric data', () => {
      localStorage.setItem('biometric_password', '1234');
      localStorage.setItem('biometric_credential_id', 'abc');

      pinVault.removeLegacyBiometricData();

      expect(localStorage.getItem('biometric_password')).toBeNull();
      expect(localStorage.getItem('biometric_credential_id')).toBeNull();
    });
  });
});
