module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['lib/', 'node_modules/'],
  rules: {
    // Long typed unions and inline styles are used throughout the UI code.
    'react-native/no-inline-styles': 'off',
    'prettier/prettier': 'off',
    'no-void': 'off',
    'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
  },
};
