export default {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/jest/setup.js'],
  testMatch: ['<rootDir>/tests/jest/**/*.test.js'],
  transform: {},
  clearMocks: true,
  collectCoverageFrom: [
    'src/auth/**/*.js',
    'src/services/**/*.js',
    'src/utils/**/*.js',
    '!src/services/emailService.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov'],
};
