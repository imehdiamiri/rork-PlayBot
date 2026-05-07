const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

// Pre-bundle env safety guard. We can't add a `prebuild` script to
// package.json (managed file), so we run the check on every Metro start /
// EAS build bundling pass. Throwing here aborts the build before any client
// JS is produced, which is exactly what we want for leaked AI secrets.
try {
  require("./scripts/check-env.js");
} catch (e) {
  console.error("[metro] env safety check failed:", e && e.message ? e.message : e);
  process.exit(1);
}

const config = getDefaultConfig(__dirname);

module.exports = withRorkMetro(config);
