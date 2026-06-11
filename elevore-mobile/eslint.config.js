/* global __dirname, module, require */
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
      }
    }
  },
  ...compat.extends('expo'),
  {
    rules: {
      'import/no-unresolved': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    }
  }
];
