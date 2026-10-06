const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Only watch the mobile app directory to avoid Next.js .next chunks crawling
config.watchFolders = [projectRoot];

// Block Metro from crawling Next.js build artifacts, API dist, or docs
config.resolver.blockList = [
  /.*[/\\]apps[/\\]web[/\\]\.next[/\\].*/,
  /.*[/\\]apps[/\\]api[/\\]dist[/\\].*/,
  /.*[/\\]docs[/\\].*/,
];

module.exports = config;
