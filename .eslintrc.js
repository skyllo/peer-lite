module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'prettier',
    'jest'
  ],
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
    'plugin:@typescript-eslint/recommended',
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
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
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-misused-promises": [
      "error", {
        "checksVoidReturn": false
      }
    ],
    'import/prefer-default-export': 'off',
    'react/require-default-props': 'off',
  }
};
