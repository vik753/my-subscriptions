import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { importX } from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Layer boundaries from CLAUDE.md: domain → nothing; services → domain; store → domain, services;
// screens → ui, store, i18n, theme. `target` is the importing zone, `from` is what it must not import.
const layer = (name) => `./src/${name}`
const boundaries = [
  { target: layer('domain'), from: './src', except: ['./domain'] },
  {
    target: layer('services'),
    from: ['store', 'screens', 'ui', 'i18n', 'theme'].map(layer),
  },
  { target: layer('store'), from: ['screens', 'ui'].map(layer) },
  { target: layer('theme'), from: ['store', 'services', 'screens', 'ui', 'domain'].map(layer) },
  { target: layer('ui'), from: ['store', 'services', 'screens', 'domain'].map(layer) },
  { target: layer('screens'), from: ['services'].map(layer) },
]

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'design_handoff_my_subscriptions',
      'dev-dist',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'import-x/no-default-export': 'error',
      'import-x/no-restricted-paths': ['error', { zones: boundaries }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Tool configs must default-export.
    files: ['*.config.{ts,js}', '.claude/hooks/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: {
      'import-x/no-default-export': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },
  {
    // Domain must stay platform-free: no clock access.
    files: ['src/domain/**/*.ts'],
    ignores: ['src/domain/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Pass `today` as a parameter.',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Pass `today` as a parameter.',
        },
      ],
    },
  },
  prettier,
)
