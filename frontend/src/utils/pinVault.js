// Device-local storage for the Vault PIN, failed-attempt tracking and the
// biometric credential id.
//
// What this protects against: someone casually opening the app on an
// unlocked device, or reading localStorage and learning the PIN (which may be
// reused elsewhere). It is a privacy lock, not encryption: task data lives in
// Supabase and is protected by Google sign-in + Row Level Security.

const PBKDF2_ITERATIONS = 310000;
const SALT_BYTES = 16;

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 12;

// Attempts before a temporary lockout, and before signing out entirely
export const FREE_ATTEMPTS = 5;
export const MAX_ATTEMPTS_BEFORE_SIGNOUT = 10;
const BASE_LOCKOUT_MS = 30 * 1000;
const MAX_LOCKOUT_MS = 15 * 60 * 1000;

const keys = {
  pin: (userId) => `vault_pin_v2_${userId}`,
  attempts: (userId) => `vault_attempts_${userId}`,
  biometric: (userId) => `vault_biometric_${userId}`,
  legacyUserPin: (userId) => `app_pin_${userId}`,
  legacyGlobalPin: 'app_pin',
  legacyBiometricId: 'biometric_credential_id',
  legacyBiometricPin: 'biometric_password'
};

// localStorage can throw (private mode, blocked storage)
const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('Vault storage write failed:', error);
    throw new Error('Could not save to this device. Is storage blocked?', { cause: error });
  }
};

const remove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

const readJson = (key) => {
  const raw = read(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

const fromBase64 = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

const derive = async (pin, salt, iterations) => {
  const subtle = window.crypto?.subtle;
  if (!subtle) {
    throw new Error('Secure crypto is unavailable (the app must run over HTTPS).');
  }

  const baseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    baseKey,
    256
  );

  return toBase64(bits);
};

const constantTimeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

const getLegacyPin = (userId) =>
  read(keys.legacyUserPin(userId)) ?? read(keys.legacyGlobalPin);

const removeLegacyPin = (userId) => {
  remove(keys.legacyUserPin(userId));
  remove(keys.legacyGlobalPin);
};

// ---------- PIN ----------

export const validatePinFormat = (pin) => {
  if (typeof pin !== 'string' || pin.trim() !== pin) {
    return 'PIN cannot start or end with spaces.';
  }
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
    return `PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} characters.`;
  }
  return null;
};

export const hasPin = (userId) =>
  !!userId && (!!readJson(keys.pin(userId)) || getLegacyPin(userId) !== null);

const storeHashedPin = async (userId, pin) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);

  write(keys.pin(userId), JSON.stringify({
    v: 2,
    salt: toBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    hash
  }));

  removeLegacyPin(userId);
};

export const setPin = async (userId, pin) => {
  const formatError = validatePinFormat(pin);
  if (formatError) throw new Error(formatError);

  await storeHashedPin(userId, pin);
};

// Returns true if the PIN matches. Plain-text PINs from older versions are
// moved to a hash on the first successful check (skipping format rules, so
// an old short PIN keeps working until the user changes it).
export const verifyPin = async (userId, pin) => {
  const record = readJson(keys.pin(userId));

  if (record?.v === 2) {
    const hash = await derive(pin, fromBase64(record.salt), record.iterations);
    return constantTimeEqual(hash, record.hash);
  }

  const legacy = getLegacyPin(userId);
  if (legacy !== null && legacy === pin) {
    await storeHashedPin(userId, pin);
    return true;
  }

  return false;
};

// ---------- Failed attempts ----------

export const getAttempts = (userId) => {
  const data = readJson(keys.attempts(userId));
  return {
    failures: data?.failures ?? 0,
    lockedUntil: data?.lockedUntil ?? 0
  };
};

export const recordFailure = (userId, now = Date.now()) => {
  const failures = getAttempts(userId).failures + 1;

  let lockedUntil = 0;
  if (failures >= FREE_ATTEMPTS) {
    const lockoutMs = Math.min(
      BASE_LOCKOUT_MS * 2 ** (failures - FREE_ATTEMPTS),
      MAX_LOCKOUT_MS
    );
    lockedUntil = now + lockoutMs;
  }

  write(keys.attempts(userId), JSON.stringify({ failures, lockedUntil }));

  return {
    failures,
    lockedUntil,
    shouldSignOut: failures >= MAX_ATTEMPTS_BEFORE_SIGNOUT
  };
};

export const resetAttempts = (userId) => remove(keys.attempts(userId));

// ---------- Biometrics ----------

export const getBiometricCredentialId = (userId) =>
  userId ? read(keys.biometric(userId)) : null;

export const setBiometricCredentialId = (userId, credentialId) =>
  write(keys.biometric(userId), credentialId);

export const clearBiometric = (userId) => remove(keys.biometric(userId));

// Older versions stored the PIN in plain text next to the credential id.
export const removeLegacyBiometricData = () => {
  remove(keys.legacyBiometricId);
  remove(keys.legacyBiometricPin);
};

// ---------- Reset ----------

// Removes everything the vault stores for this user on this device.
export const clearVault = (userId) => {
  remove(keys.pin(userId));
  removeLegacyPin(userId);
  resetAttempts(userId);
  clearBiometric(userId);
};
