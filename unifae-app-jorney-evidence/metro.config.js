const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Melhora performance no Windows — reduz I/O de watch em pastas grandes
config.watchFolders = [];
config.resolver.nodeModulesPaths = [require('path').resolve(__dirname, 'node_modules')];

module.exports = config;
