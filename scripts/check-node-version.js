#!/usr/bin/env node
const MIN_VERSION = 12;
const RECOMMENDED_VERSION = 18;
const [major] = process.versions.node.split('.').map(Number);

if (Number.isNaN(major) || major < MIN_VERSION) {
  console.error(
    `This project requires Node.js ${MIN_VERSION}.22 or newer (detected ${process.versions.node}).\n` +
      'Vite 2 does not support Node 10 or earlier.\n' +
      'Please upgrade Node.js (both x86_64 and arm64 builds are available at https://nodejs.org) \n' +
      'or use a version manager like nvm to install a supported version before running the client scripts.\n'
  );
  process.exit(1);
}

if (major < RECOMMENDED_VERSION) {
  console.warn(
    `Warning: Node.js ${process.versions.node} is supported, but Node ${RECOMMENDED_VERSION}+ is recommended ` +
      'for best dev-server performance and compatibility on both x86_64 and arm64.\n'
  );
}
