const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts.push('cjs');

// Clerk (@clerk/expo) imports package "exports" subpaths such as "@clerk/react/internal",
// which only resolve when package exports are enabled.
defaultConfig.resolver.unstable_enablePackageExports = true;

// Restrict resolution to the CommonJS ("require") condition so Firebase v11 keeps
// resolving to its CJS build (prevents "Component auth has not been registered yet").
// "react-native" and "browser" remain so native/web entry points still resolve.
defaultConfig.resolver.unstable_conditionNames = ['require', 'react-native', 'browser'];

module.exports = defaultConfig;