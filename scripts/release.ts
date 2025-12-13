import { release } from '@baicie/release'

release({
  repo: 'baicie',
  packages: [
    'cli',
    'release',
    'tools',
    'pkg',
    'polyfill',
    'storage',
    'logger',
    'scripts',
    'napi',
  ],
  linkedPackages: {
    napi: ['napi-browser'],
  },
  toTag: (pkg, version) => `${pkg}@${version}`,
  logChangelog: _pkg => {},
  generateChangelog: _pkg => {},
})
