import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'build', 'coverage', 'tasks-extension']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: {
      // Same hook rules CRA enforced
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['useTaskContext', 'useVault'] }
      ],
      // JSX usage isn't visible to core no-unused-vars without eslint-plugin-react
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/tests/**', '**/*.test.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.vitest }
    }
  },
  {
    files: ['*.config.js', 'public/sw.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.serviceworker }
    }
  }
]);
