module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'prettier',
  ],
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:playwright/playwright-test',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    }
  ],
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
    'import/prefer-default-export': 'off',
    'react/require-default-props': 'off'
  }
};
