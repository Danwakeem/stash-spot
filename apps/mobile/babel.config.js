module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // In this monorepo, babel-preset-expo is hoisted to root node_modules but
      // expo-router is in apps/mobile/node_modules. The preset's hasModule check
      // can't find expo-router, so the router babel plugin never activates.
      // Explicitly adding it here ensures process.env.EXPO_ROUTER_APP_ROOT is
      // inlined at build time.
      require('babel-preset-expo/build/expo-router-plugin').expoRouterBabelPlugin,
    ],
  };
};
