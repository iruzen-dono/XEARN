module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/test/integration/'], // TODO: Fix integration test setup
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
};
