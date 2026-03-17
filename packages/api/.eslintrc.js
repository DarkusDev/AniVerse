module.exports = {
  extends: ['../../.eslintrc.js', 'plugin:@typescript-eslint/recommended-requiring-type-checking'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
  },
};
