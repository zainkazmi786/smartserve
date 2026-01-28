const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// This line is the specific fix for the 'node:sea' error on Windows
config.resolver.unstable_enablePackageExports = false;

module.exports = config;