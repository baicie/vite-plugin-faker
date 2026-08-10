import { describe, expect, it } from 'vitest'

import {
  validateManifest,
  validatePackedFiles,
  validateReleaseCommand,
} from '../ci-helper.js'

describe('release command', () => {
  it('rejects publishing that reruns package lifecycle scripts', () => {
    const errors = []

    validateReleaseCommand(
      {
        scripts: {
          release:
            'pnpm build && pnpm release:check && pnpm release:smoke && changeset publish',
        },
      },
      errors,
    )

    expect(errors).toEqual([
      'package.json: scripts.release must be pnpm build && pnpm release:check && pnpm release:smoke && cross-env npm_config_ignore_scripts=true changeset publish',
    ])
  })
})

function createManifest(exports) {
  return {
    name: '@baicie/example',
    version: '1.0.0',
    files: ['dist'],
    engines: {
      node: '>=20.19.0',
    },
    exports,
    publishConfig: {
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    },
  }
}

describe('release manifest validation', () => {
  it('rejects a require condition that points to an ES module', () => {
    const errors = []

    validateManifest(
      {
        directory: 'packages/example',
        name: '@baicie/example',
        dependencies: [],
        formats: ['import', 'require'],
      },
      createManifest({
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
          require: './dist/index.js',
        },
      }),
      new Set(['@baicie/example']),
      errors,
    )

    expect(errors).toContain(
      'packages/example: exports["."].require must target a .cjs file',
    )
  })

  it('requires every declared module format on the root export', () => {
    const errors = []

    validateManifest(
      {
        directory: 'packages/example',
        name: '@baicie/example',
        dependencies: [],
        formats: ['import', 'require'],
      },
      createManifest({
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
        },
      }),
      new Set(['@baicie/example']),
      errors,
    )

    expect(errors).toContain(
      'packages/example: exports["."] must define require',
    )
  })

  it('requires format-specific declarations for dual packages', () => {
    const errors = []

    validateManifest(
      {
        directory: 'packages/example',
        name: '@baicie/example',
        dependencies: [],
        formats: ['import', 'require'],
      },
      createManifest({
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
          require: './dist/index.cjs',
        },
      }),
      new Set(['@baicie/example']),
      errors,
    )

    expect(errors).toContain(
      'packages/example: exports["."].require must define conditional types and default',
    )
  })

  it('requires CommonJS declarations to use the .d.cts extension', () => {
    const errors = []

    validateManifest(
      {
        directory: 'packages/example',
        name: '@baicie/example',
        dependencies: [],
        formats: ['import', 'require'],
      },
      createManifest({
        '.': {
          import: {
            types: './dist/index.d.ts',
            default: './dist/index.js',
          },
          require: {
            types: './dist/index.d.ts',
            default: './dist/index.cjs',
          },
        },
      }),
      new Set(['@baicie/example']),
      errors,
    )

    expect(errors).toContain(
      'packages/example: exports["."].require.types must target a .d.cts file',
    )
  })
})

describe('release tarball validation', () => {
  it('requires license and readme files in the tarball', () => {
    const errors = []

    validatePackedFiles(
      {
        directory: 'packages/example',
        name: '@baicie/example',
      },
      createManifest({
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
        },
      }),
      ['package.json', 'dist/index.d.ts', 'dist/index.js'],
      errors,
    )

    expect(errors).toContain(
      'packages/example: tarball does not include LICENSE',
    )
    expect(errors).toContain(
      'packages/example: tarball does not include README.md',
    )
  })

  it('rejects public manifest entries that are absent from the tarball', () => {
    const errors = []
    const manifest = createManifest({
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.cjs',
      },
    })

    validatePackedFiles(
      {
        directory: 'packages/example',
        name: '@baicie/example',
      },
      manifest,
      ['package.json', 'dist/index.d.ts', 'dist/index.js'],
      errors,
    )

    expect(errors).toContain(
      'packages/example: tarball is missing public entry dist/index.cjs',
    )
  })
})
