import js from '@eslint/js';
import globals from 'globals';

const appGlobals = Object.fromEntries([
  'NFSecurity', 'NFModules', 'NFStorage', 'NFStudio', 'NFAssets', 'NFApi', 'NF_CONFIG', 'Store', 'EventBus', 'Events',
  'Router', 'UIEnhancements', 'state', 'escapeHTML', 'requireAuth', 'getCurrentUser', 'logout', 'initParticles',
  'initNav', 'showToast', 'initToast', 'updateZoneTheme', 'initPeerCount', 'getNavHTML', 'getFooterHTML', 'getToastHTML',
].map(name => [name, 'readonly']));

export default [
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...appGlobals, module: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['api/**/*.js', 'server/**/*.js', 'vite.config.js', 'playwright.config.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node, ...globals.browser, ...appGlobals } },
  },
];
