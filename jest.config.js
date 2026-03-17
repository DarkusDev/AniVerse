/** @type {import('jest').Config} */
module.exports = {
  projects: ['<rootDir>/packages/*/jest.config.js'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!packages/*/src/main.ts'],
};
