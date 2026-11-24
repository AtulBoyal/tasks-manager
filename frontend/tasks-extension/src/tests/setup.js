import '@testing-library/jest-dom/vitest';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount rendered components between tests (no vitest globals here)
afterEach(cleanup);

// In-memory chrome.storage.local with the real API's get/set/remove shapes
const createStorageArea = () => {
  const data = {};
  return {
    data,
    get: vi.fn(async (keys) => {
      if (keys == null) return { ...data };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
    }),
    set: vi.fn(async (items) => {
      Object.assign(data, structuredClone(items));
    }),
    remove: vi.fn(async (keys) => {
      (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete data[k]);
    })
  };
};

const listener = () => ({ addListener: vi.fn(), removeListener: vi.fn() });

// Minimal fake of the chrome.* APIs the extension uses
beforeEach(() => {
  const alarms = new Map();

  globalThis.chrome = {
    runtime: {
      id: 'test-extension-id',
      sendMessage: vi.fn(async () => undefined),
      getURL: vi.fn((path) => `chrome-extension://test-extension-id/${path}`),
      onMessage: listener(),
      onInstalled: listener(),
      onStartup: listener()
    },
    identity: {
      getRedirectURL: vi.fn(() => 'https://test-extension-id.chromiumapp.org/'),
      launchWebAuthFlow: vi.fn()
    },
    storage: {
      local: createStorageArea(),
      onChanged: listener()
    },
    alarms: {
      _all: alarms,
      create: vi.fn((name, info) => { alarms.set(name, { name, ...info }); }),
      clear: vi.fn(async (name) => alarms.delete(name)),
      getAll: vi.fn(async () => [...alarms.values()]),
      onAlarm: listener()
    },
    notifications: {
      create: vi.fn(async (id) => id),
      clear: vi.fn(async () => true),
      onClicked: listener()
    },
    tabs: {
      create: vi.fn(async () => ({}))
    }
  };
});
