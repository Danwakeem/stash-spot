const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo (for workspace packages)
config.watchFolders = [monorepoRoot];

// Resolve modules from both the project and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure expo-router's babel plugin receives the routerRoot so it can
// inline process.env.EXPO_ROUTER_APP_ROOT at transform time.
const originalGetTransformOptions = config.transformer?.getTransformOptions;
config.transformer = {
  ...config.transformer,
  getTransformOptions: async (...args) => {
    const original = originalGetTransformOptions
      ? await originalGetTransformOptions(...args)
      : {};
    return {
      ...original,
      transform: {
        ...original?.transform,
        experimentalImportSupport: true,
        inlineRequires: false,
      },
      customTransformOptions: {
        ...original?.customTransformOptions,
        routerRoot: 'app',
      },
    };
  },
};

module.exports = config;
