module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'prettier',
  ],
  env: {
    browser: true,
    jest: true,
    node: true,
  },
  extends: [
    'airbnb/base',
    'airbnb-typescript/base',
    'plugin:jest-playwright/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    }
  ],
};
