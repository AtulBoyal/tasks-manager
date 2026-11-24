import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  getBiometricCredentialId,
  setBiometricCredentialId,
  clearBiometric,
  removeLegacyBiometricData
} from '../utils/pinVault';

// Fingerprint / face unlock via a platform WebAuthn credential.
//
// There is no server to verify the assertion, so this is a local
// "user is present and verified" check, the same strength as the PIN screen.
// It never stores the PIN: a successful check unlocks the vault directly.

const bufferToBase64URL = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

const base64URLToBuffer = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0)).buffer;
};

const randomBytes = (length) =>
  window.crypto.getRandomValues(new Uint8Array(length));

// authenticatorData byte 32 holds the flags; bit 2 (0x04) = user verified
const USER_VERIFIED_FLAG = 0x04;

const wasUserVerified = (assertion) => {
  const data = new Uint8Array(assertion.response.authenticatorData);
  return data.length > 32 && (data[32] & USER_VERIFIED_FLAG) !== 0;
};

export const useBiometrics = ({ userId, email, onVerified }) => {
  const isSupported =
    typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const [credentialId, setCredentialId] = useState(null);

  // Older versions kept the PIN in plain text next to the credential.
  useEffect(() => {
    removeLegacyBiometricData();
  }, []);

  useEffect(() => {
    setCredentialId(getBiometricCredentialId(userId));
  }, [userId]);

  const hasBiometricSetup = isSupported && !!credentialId;

  const setupBiometrics = useCallback(async () => {
    if (!isSupported) {
      toast.error('Your device/browser does not support biometrics.');
      return false;
    }
    if (!userId) return false;

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: randomBytes(32),
          rp: {
            name: 'Tasks Manager',
            id: window.location.hostname
          },
          user: {
            id: randomBytes(16),
            name: email || 'tasks-manager-user',
            displayName: email || 'Tasks Manager user'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'discouraged'
          },
          attestation: 'none',
          timeout: 60000
        }
      });

      if (!credential) throw new Error('No credential returned');

      const id = bufferToBase64URL(credential.rawId);
      setBiometricCredentialId(userId, id);
      setCredentialId(id);

      toast.success('Fingerprint unlock enabled');
      return true;
    } catch (error) {
      console.error('Biometric setup failed:', error);
      toast.error(
        error?.name === 'NotAllowedError'
          ? 'Fingerprint setup was cancelled.'
          : 'Failed to set up fingerprint.'
      );
      return false;
    }
  }, [isSupported, userId, email]);

  const removeBiometrics = useCallback(() => {
    if (!userId) return;
    clearBiometric(userId);
    setCredentialId(null);
    toast.success('Fingerprint unlock removed');
  }, [userId]);

  const loginWithBiometrics = useCallback(async () => {
    if (!credentialId) return;

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          allowCredentials: [
            { id: base64URLToBuffer(credentialId), type: 'public-key' }
          ],
          userVerification: 'required',
          timeout: 60000
        }
      });

      if (!assertion || !wasUserVerified(assertion)) {
        throw new Error('User verification was not performed');
      }

      onVerified();
      toast.success('Biometric unlock successful!');
    } catch (error) {
      console.error('Biometric login failed:', error);
      toast.error(
        error?.name === 'NotAllowedError'
          ? 'Fingerprint not recognised or cancelled.'
          : 'Biometric unlock failed. Use your PIN.'
      );
    }
  }, [credentialId, onVerified]);

  return {
    isSupported,
    hasBiometricSetup,
    setupBiometrics,
    removeBiometrics,
    loginWithBiometrics
  };
};
