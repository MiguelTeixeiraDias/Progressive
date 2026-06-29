// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo SDK 54 enables package exports, which makes Metro resolve zustand's ESM
// build (zustand/esm/middleware.mjs). That file uses `import.meta.env` (Redux
// devtools dev check), and Metro bundles the web target as a classic script, so
// `import.meta` throws "Cannot use 'import.meta' outside a module" and the app
// fails to mount. Disable package exports *only* for zustand/middleware so it
// falls back to the CJS build (zustand/middleware.js); everything else (incl.
// @supabase/supabase-js) keeps package-exports resolution.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand/middleware') {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
