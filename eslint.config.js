import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  {
    // TypeScript already resolves globals and DOM lib types; no-undef only
    // produces false positives (e.g. HTMLDivElement) on typed code.
    files: ['**/*.ts', '**/*.svelte'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'openspec/'],
  },
];
