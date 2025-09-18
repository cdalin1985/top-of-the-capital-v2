const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // Additional Node.js globals
        execSync: 'readonly', // child_process
        URL: 'readonly' // Built-in URL class
      }
    },
    rules: {
      // Code Quality
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',

      // Performance
      'no-await-in-loop': 'warn',

      // Best practices
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'comma-dangle': ['error', 'never'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],

      // Function complexity
      complexity: ['warn', 10],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', 50],
      'max-params': ['warn', 4]
    }
  },
  // Browser environment for frontend files
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        XMLHttpRequest: 'readonly',
        WebSocket: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        Audio: 'readonly',
        Video: 'readonly',
        Canvas: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        Notification: 'readonly',
        performance: 'readonly',
        crypto: 'readonly',
        MutationObserver: 'readonly',
        // Libraries - need to be added when detected
        io: 'readonly', // Socket.IO
        Chart: 'readonly', // Chart.js
        self: 'readonly' // Service Worker
      }
    },
    rules: {
      'no-console': 'warn', // Allow console in frontend for debugging
      'no-undef': 'error' // Catch undefined variables
    }
  },
  // Service Worker specific globals
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        importScripts: 'readonly',
        registration: 'readonly',
        skipWaiting: 'readonly',
        clients: 'readonly',
        console: 'readonly'
      }
    }
  },
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'max-lines-per-function': 'off'
    }
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    ignores: [
      'node_modules/',
      'generated/',
      'public/vendor/',
      'coverage/',
      '*.min.js',
      'dist/',
      'build/',
      '*.log',
      '*.db',
      '*.sqlite',
      '*.sqlite3',
      '.env*',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'tmp/',
      'temp/',
      '*.backup',
      '*.bak',
      'vendor/',
      'docs/generated/',
      'test-results/',
      '*.lcov',
      'prisma/migrations/'
    ]
  }
];
