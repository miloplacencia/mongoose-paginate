module.exports = {
  verbose: true,
  testMatch: ['<rootDir>/tests/**/*.spec.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules/'],
  testEnvironment: 'node',
  collectCoverageFrom: ['tests/**/*.js', '!**/node_modules/**'],
};
