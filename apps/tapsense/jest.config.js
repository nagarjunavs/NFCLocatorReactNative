module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/__tests__/**/*.test.[jt]s?(x)'],
  // Use the library sources so tests never depend on a prior `npm run build`.
  moduleNameMapper: {
    '^react-native-nfc-locator$': '<rootDir>/../../packages/react-native-nfc-locator/src',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg)/)',
  ],
};
