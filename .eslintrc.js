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
    'airbnb',
    'airbnb-typescript',
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
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
    'import/prefer-default-export': 'off',
    'react/require-default-props': 'off'
  }
};
