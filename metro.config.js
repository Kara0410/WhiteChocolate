const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// withNativeWind compiles global.css through PostCSS/Tailwind at bundle time
// and makes the resulting styles available to the className prop at runtime.
module.exports = withNativeWind(config, { input: './global.css' });
