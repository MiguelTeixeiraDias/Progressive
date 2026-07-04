/** Pure-logic unit tests (utils only). Uses ts-jest with a node environment so
 *  no React Native / Expo transform is needed. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
};
