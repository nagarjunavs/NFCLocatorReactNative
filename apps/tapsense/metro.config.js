const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// npm workspaces: dependencies are hoisted to the monorepo root and the library is a symlink
// into packages/, so Metro must watch the root and resolve from its node_modules.
const monorepoRoot = path.resolve(__dirname, '../..');

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(monorepoRoot, 'node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
