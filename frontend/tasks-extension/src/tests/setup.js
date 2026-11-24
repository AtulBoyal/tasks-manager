import '@testing-library/jest-dom/vitest';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount rendered components between tests (no vitest globals here)
afterEach(cleanup);

// Minimal fake of the chrome.* APIs the extension uses
beforeEach(() => {
  globalThis.chrome = {
    runtime: {
      id: 'test-extension-id',
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() }
    },
    identity: {
      getRedirectURL: vi.fn(() => 'https://test-extension-id.chromiumapp.org/'),
      launchWebAuthFlow: vi.fn()
    },
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => {}),
        remove: vi.fn(async () => {})
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      }
    }
  };
});
