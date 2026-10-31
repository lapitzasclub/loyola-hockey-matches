import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'android/**',
      '.wrangler/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // La red solo se toca desde api/transport.ts, que decide directo o proxy.
    // El service worker es el que sirve las peticiones de la página.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/api/transport.ts',
      'src/pwa/sw.ts',
      'src/**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Usa los hooks de queries/ o api/transport.ts.',
        },
        { name: 'XMLHttpRequest', message: 'Usa api/transport.ts.' },
      ],
      'no-restricted-properties': [
        'error',
        ...['globalThis', 'window', 'self'].map((object) => ({
          object,
          property: 'fetch',
          message: 'Usa los hooks de queries/ o api/transport.ts.',
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@capacitor/core',
              importNames: ['CapacitorHttp'],
              message: 'Usa api/transport.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['worker/**/*.ts'],
    languageOptions: { globals: { ...globals.serviceworker } },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
  {
    files: ['scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
  prettier,
);
