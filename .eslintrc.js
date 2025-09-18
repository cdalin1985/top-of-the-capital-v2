module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:security/recommended',
    'plugin:import/recommended',
    'prettier'
  ],
  plugins: ['security', 'import'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Code Quality
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',

    // Security
    'security/detect-object-injection': 'error',
    'security/detect-sql-injection': 'error',
    'security/detect-xss': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',

    // Import/Export
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always'
      }
    ],
    'import/no-unresolved': 'off', // Prisma generates files

    // Node.js specific
    'node/no-missing-import': 'off',
    'node/no-unpublished-require': 'off',
    'node/no-unsupported-features/es-syntax': 'off',

    // Error handling
    'node/handle-callback-err': 'error',
    'node/no-callback-literal': 'error',

    // Performance
    'no-await-in-loop': 'warn',
    'require-atomic-updates': 'error',

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
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
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
    }
  ],
  ignorePatterns: ['node_modules/', 'generated/', 'public/vendor/', 'coverage/', '*.min.js']
};
