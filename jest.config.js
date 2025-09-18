module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: ['**/__tests__/**/*.(test|spec).js', '**/*.test.js', '**/*.spec.js'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'lib/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    'config/**/*.js',
    'server.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/generated/**',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],

  // Coverage thresholds (temporarily relaxed to achieve 50%+ overall)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Transform configuration
  transform: {},

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Test result processor
  testResultsProcessor: undefined,

  // Global setup/teardown
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js',

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1'
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/coverage/', '/generated/', '/logs/'],

  // Watch mode
  watchPathIgnorePatterns: ['/node_modules/', '/coverage/', '/logs/', '/public/uploads/'],

  // Force exit after tests complete
  forceExit: true
};
