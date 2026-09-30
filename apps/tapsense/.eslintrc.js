module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Small dynamic layout tweaks are written inline on purpose; `void` marks fire-and-forget promises.
    'react-native/no-inline-styles': 'off',
    'no-void': 'off',
    'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
    'prettier/prettier': 'off',
  },
};
