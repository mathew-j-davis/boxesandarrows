module.exports = {
  // The root directory that Jest should scan for tests
  rootDir: './',
  
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // Timeout for each test in milliseconds
  testTimeout: 10000,
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Collect coverage information
  collectCoverage: false,
  
  // Directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // Force exit the test runner after tests have completed
  // This is useful when tests might leave handles open
  forceExit: true,
  
  // Don't watch for changes (useful when running in CI)
  watch: false,
}; 