import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const bufferToBase64URLString = (buffer) => {
  const bytes = new Uint8Array(buffer);

  let str = '';

  for (let charCode of bytes) {
    str += String.fromCharCode(charCode);
  }

  const base64String = btoa(str);

  return base64String
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const base64URLStringToBuffer = (
  base64URLString
) => {

  const base64 = base64URLString
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padLength =
    (4 - (base64.length % 4)) % 4;

  const padded = base64.padEnd(
    base64.length + padLength,
    '='
  );

  const binary = atob(padded);

  const buffer = new ArrayBuffer(
    binary.length
  );

  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return buffer;
};

const generateRandomBuffer = (
  length = 32
) => {

  const array = new Uint8Array(length);

  window.crypto.getRandomValues(array);

  return array.buffer;
};

export const useBiometrics = ({
  handleUnlock,
  setEnteredPassword
}) => {

  const [
    hasBiometricSetup,
    setHasBiometricSetup
  ] = useState(false);

  useEffect(() => {

    const credId = localStorage.getItem(
      'biometric_credential_id'
    );

    const savedPass = localStorage.getItem(
      'biometric_password'
    );

    if (
      credId &&
      savedPass &&
      window.PublicKeyCredential
    ) {
      setHasBiometricSetup(true);
    }

  }, []);

  const setupBiometrics = async (
    passwordToSave
  ) => {

    if (!window.PublicKeyCredential) {
      toast.error(
        'Your device/browser does not support biometrics.'
      );
      return;
    }

    try {

      const challenge =
        generateRandomBuffer();

      const userId =
        generateRandomBuffer(16);

      const publicKeyCredentialCreationOptions = {
        challenge,

        rp: {
          name: 'Tasks Manager',
          id: window.location.hostname
        },

        user: {
          id: userId,
          name: 'admin',
          displayName: 'Admin'
        },

        pubKeyCredParams: [
          {
            alg: -7,
            type: 'public-key'
          },
          {
            alg: -257,
            type: 'public-key'
          }
        ],

        authenticatorSelection: {
          authenticatorAttachment:
            'platform',

          userVerification:
            'required'
        },

        timeout: 60000
      };

      const credential =
        await navigator.credentials.create({
          publicKey:
            publicKeyCredentialCreationOptions
        });

      localStorage.setItem(
        'biometric_credential_id',
        bufferToBase64URLString(
          credential.rawId
        )
      );

      localStorage.setItem(
        'biometric_password',
        passwordToSave
      );

      setHasBiometricSetup(true);

      toast.success(
        'Fingerprint successfully registered!'
      );

    } catch (err) {

      console.error(
        'Biometric setup failed:',
        err
      );

      toast.error(
        'Failed to set up fingerprint.'
      );
    }
  };

  const loginWithBiometrics = async () => {

    try {

      const credentialIdString =
        localStorage.getItem(
          'biometric_credential_id'
        );

      const savedPassword =
        localStorage.getItem(
          'biometric_password'
        );

      if (
        !credentialIdString ||
        !savedPassword
      ) {
        throw new Error(
          'No biometrics set up'
        );
      }

      const publicKeyCredentialRequestOptions = {
        challenge:
          generateRandomBuffer(),

        allowCredentials: [
          {
            id:
              base64URLStringToBuffer(
                credentialIdString
              ),

            type: 'public-key'
          }
        ],

        userVerification:
          'required',

        timeout: 60000
      };

      await navigator.credentials.get({
        publicKey:
          publicKeyCredentialRequestOptions
      });

      setEnteredPassword(savedPassword);

      handleUnlock(savedPassword);
      toast.success("Biometric login successful!");

    } catch (err) {

      console.error(
        'Biometric login failed:',
        err
      );
    }
  };

  return {
    hasBiometricSetup,
    setupBiometrics,
    loginWithBiometrics
  };
};