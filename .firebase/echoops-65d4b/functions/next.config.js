// next.config.js
var nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "dev.azure.com",
      "avatars.githubusercontent.com",
      // For GitHub avatars if using GitHub auth
      "lh3.googleusercontent.com"
      // For Google avatars if using Google auth
    ]
  },
  // Correctly place outputFileTracingExcludes at the root level
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild/linux-x64"
    ]
  }
};
module.exports = nextConfig;
