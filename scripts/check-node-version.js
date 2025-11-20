#!/usr/bin/env node
const MIN_VERSION = 18;
const [major] = process.versions.node.split('.').map(Number);

if (Number.isNaN(major) || major < MIN_VERSION) {
  console.error(
    `This project requires Node.js ${MIN_VERSION}.x or newer (detected ${process.versions.node}).\n` +
      'Vite and top-level await in the tooling will fail on older Node releases.\n' +
      'Please upgrade Node.js (both x86_64 and arm64 builds are available at https://nodejs.org) \n' +
      'or use a version manager like nvm to install Node 18+ before running the client scripts.\n'
  );
  process.exit(1);
}
