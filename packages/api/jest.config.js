/** @type {import('jest').Config} */
module.exports = {
  displayName: 'api',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '../tsconfig.json' }],
  },
  collectCoverageFrom: ['**/*.ts', '!main.ts', '!**/*.module.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
