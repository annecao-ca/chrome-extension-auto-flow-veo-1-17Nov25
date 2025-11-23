const js = require('@eslint/js');
const globals = require('globals');

const browserGlobals = {
  ...globals.browser,
  chrome: 'readonly',
  toastManager: 'readonly'
};

module.exports = [
  {
    ignores: [
      'icons/**',
      '*.md',
      'node_modules/**',
      'dist/**'
    ]
  },
  js.configs.recommended,
  {
    files: [
      'background.js',
      'content.js',
      'button-effects.js',
      'debug-video-finder.js',
      'empty-states.js',
      'i18n.js',
      'loading-utils.js',
      'popup.js',
      'settings.js',
      'utils.js'
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: browserGlobals
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error'
    }
  },
  {
    files: ['button-effects.js', 'empty-states.js', 'loading-utils.js'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        module: 'readonly'
      }
    }
  },
  {
    files: ['popup.js'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        toastManager: 'readonly',
        setSectionLoading: 'readonly',
        setButtonLoading: 'readonly',
        setInputLoading: 'readonly',
        parsePromptsFromFile: 'readonly',
        parsePrompts: 'readonly',
        emptyStateManager: 'readonly',
        EMPTY_STATE_TYPES: 'readonly',
        getText: 'readonly',
        getSettingsFromUI: 'readonly',
        validateSettings: 'readonly',
        loadSettings: 'readonly',
        applySettingsToUI: 'readonly',
        getTimestamp: 'readonly'
      }
    }
  },
  {
    files: ['generate-icons.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    }
  }
];

