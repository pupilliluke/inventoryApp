const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts.push('cjs');

// Clerk (@clerk/clerk-expo) imports package "exports" subpaths such as
// "@clerk/clerk-react/internal", which only resolve when package exports are enabled.
defaultConfig.resolver.unstable_enablePackageExports = true;

// Restrict resolution to the CommonJS ("require") condition so Firebase v11 keeps
// resolving to its CJS build (prevents "Component auth has not been registered yet").
// Keep "react-native" for native entry points. Scope "browser" to WEB ONLY so the
// device never pulls a library's browser build (Clerk's browser build does a
// window/Origin domain check that hangs auth on native).
defaultConfig.resolver.unstable_conditionNames = ['require', 'react-native'];
defaultConfig.resolver.unstable_conditionsByPlatform = { web: ['browser'] };

module.exports = defaultConfig;