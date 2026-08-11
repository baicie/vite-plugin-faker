import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PACKAGES } from './ci-helper.js'

const WORKSPACE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const PEER_DEPENDENCY_VERSIONS = {
  '@faker-js/faker': '10.3.0',
  'lodash-es': '4.18.1',
  vite: '7.3.6',
  webpack: '5.105.4',
  'webpack-dev-server': '5.2.6',
}
const PACKAGE_DEFINITIONS = new Map(
  PACKAGES.map(packageDefinition => [
    packageDefinition.name,
    packageDefinition,
  ]),
)

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
  })

  if (result.error || result.status !== 0) {
    const detail = result.error
      ? result.error.message
      : [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`${command} ${args.join(' ')} failed:\n${detail}`)
  }

  return result.stdout
}

function packPackages(tarballDirectory) {
  const tarballs = Object.create(null)

  for (const packageDefinition of PACKAGES) {
    const previousFiles = new Set(readdirSync(tarballDirectory))
    const output = run(
      'pnpm',
      [
        '--dir',
        packageDefinition.directory,
        'pack',
        '--pack-destination',
        tarballDirectory,
        '--json',
      ],
      WORKSPACE_ROOT,
    )
    JSON.parse(output)

    const createdFiles = readdirSync(tarballDirectory).filter(
      file => !previousFiles.has(file) && file.endsWith('.tgz'),
    )
    if (createdFiles.length !== 1) {
      throw new Error(
        `${packageDefinition.name}: expected one tarball, received ${createdFiles.length}`,
      )
    }

    tarballs[packageDefinition.name] = path.join(
      tarballDirectory,
      createdFiles[0],
    )
  }

  return tarballs
}

function writeConsumerManifest(consumerDirectory, name, dependencies) {
  writeFileSync(
    path.join(consumerDirectory, 'package.json'),
    JSON.stringify(
      {
        name,
        private: true,
        type: 'module',
        dependencies,
      },
      null,
      2,
    ),
  )
}

function installConsumer(consumerDirectory) {
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
    consumerDirectory,
  )
}

function createConsumer(consumerDirectory, tarballs) {
  const dependencies = {
    '@types/node': '25.3.5',
    typescript: '5.9.3',
  }

  for (const name of Object.keys(PEER_DEPENDENCY_VERSIONS)) {
    dependencies[name] = PEER_DEPENDENCY_VERSIONS[name]
  }

  for (const packageDefinition of PACKAGES) {
    dependencies[packageDefinition.name] =
      `file:${tarballs[packageDefinition.name]}`
  }

  writeConsumerManifest(consumerDirectory, 'faker-release-smoke', dependencies)
  installConsumer(consumerDirectory)
}

function collectPackageDefinitions(packageDefinition) {
  const collected = []
  const visited = new Set()

  function collect(currentDefinition) {
    if (visited.has(currentDefinition.name)) return
    visited.add(currentDefinition.name)
    collected.push(currentDefinition)

    for (const dependencyName of currentDefinition.dependencies) {
      const dependencyDefinition = PACKAGE_DEFINITIONS.get(dependencyName)
      if (!dependencyDefinition) {
        throw new Error(
          `${currentDefinition.name}: unknown internal dependency ${dependencyName}`,
        )
      }
      collect(dependencyDefinition)
    }
  }

  collect(packageDefinition)
  return collected
}

function addPeerDependencies(dependencies, packageDefinitions) {
  for (const packageDefinition of packageDefinitions) {
    const manifest = JSON.parse(
      readFileSync(
        path.join(WORKSPACE_ROOT, packageDefinition.directory, 'package.json'),
        'utf8',
      ),
    )

    for (const peerName of Object.keys(manifest.peerDependencies || {})) {
      if (
        !Object.prototype.hasOwnProperty.call(
          PEER_DEPENDENCY_VERSIONS,
          peerName,
        )
      ) {
        throw new Error(
          `${packageDefinition.name}: no smoke version configured for peer ${peerName}`,
        )
      }
      dependencies[peerName] = PEER_DEPENDENCY_VERSIONS[peerName]
    }
  }
}

function verifyIsolatedInstallation(
  consumerDirectory,
  packageDefinition,
  tarballs,
) {
  const packageDefinitions = collectPackageDefinitions(packageDefinition)
  const dependencies = Object.create(null)

  for (const dependencyDefinition of packageDefinitions) {
    dependencies[dependencyDefinition.name] =
      `file:${tarballs[dependencyDefinition.name]}`
  }
  addPeerDependencies(dependencies, packageDefinitions)

  writeConsumerManifest(
    consumerDirectory,
    `faker-release-smoke-${path.basename(packageDefinition.directory)}`,
    dependencies,
  )
  writeFileSync(
    path.join(consumerDirectory, 'entry-smoke.mjs'),
    `globalThis.__FAKER_WS_PORT__ = 0
globalThis.__FAKER_LOGGER_OPTIONS__ = {}
globalThis.__MOUNT_TARGET__ = '#app'
globalThis.__FAKER_UI_OPTIONS__ = {}
globalThis.__FAKER_HOT_CONTEXT__ = undefined

import(${JSON.stringify(packageDefinition.name)}).then(packageModule => {
  if (Object.keys(packageModule).length === 0) {
    throw new Error('The package entry has no exports')
  }
})
`,
  )
  installConsumer(consumerDirectory)
  run(process.execPath, ['entry-smoke.mjs'], consumerDirectory)
}

function writeSmokeFiles(consumerDirectory) {
  writeFileSync(
    path.join(consumerDirectory, 'esm-smoke.mjs'),
    `globalThis.__FAKER_WS_PORT__ = 0
globalThis.__FAKER_LOGGER_OPTIONS__ = {}
globalThis.__MOUNT_TARGET__ = '#app'
globalThis.__FAKER_UI_OPTIONS__ = {}
globalThis.__FAKER_HOT_CONTEXT__ = undefined

Promise.all([
  import('@baicie/faker-shared'),
  import('@baicie/faker-shared/node'),
  import('@baicie/faker-core'),
  import('@baicie/faker-interceptor'),
  import('@baicie/faker-ui'),
  import('@baicie/vite-plugin-faker'),
  import('@baicie/webpack-plugin-faker'),
]).then(modules => {
  if (
    !modules[0].extend ||
    !modules[1].ensureDirSync ||
    !modules[2].DBManager ||
    !modules[3].initInterceptor ||
    !modules[4].fakerUI ||
    !modules[5].viteFaker ||
    !modules[6].webpackFaker
  ) {
    throw new Error('An ESM package entry is missing its expected export')
  }
})
`,
  )

  writeFileSync(
    path.join(consumerDirectory, 'cjs-smoke.cjs'),
    `const shared = require('@baicie/faker-shared')
const sharedNode = require('@baicie/faker-shared/node')
const core = require('@baicie/faker-core')
const webpackPlugin = require('@baicie/webpack-plugin-faker')

if (
  !shared.extend ||
  !sharedNode.ensureDirSync ||
  !core.DBManager ||
  !webpackPlugin.webpackFaker
) {
  throw new Error('A CommonJS package entry is missing its expected export')
}
`,
  )

  writeFileSync(
    path.join(consumerDirectory, 'esm-consumer.mts'),
    `import { extend } from '@baicie/faker-shared'
import { ensureDirSync } from '@baicie/faker-shared/node'
import { DBManager } from '@baicie/faker-core'
import { initInterceptor } from '@baicie/faker-interceptor'
import fakerUI, { fakerUI as createFakerUI } from '@baicie/faker-ui'
import viteFaker, {
  type ViteFakerOptions,
  viteFaker as createViteFaker,
} from '@baicie/vite-plugin-faker'
import { WebpackPluginFaker } from '@baicie/webpack-plugin-faker'

const viteFakerOptions: ViteFakerOptions = {}

void extend
void ensureDirSync
void DBManager
void initInterceptor
void fakerUI
void createFakerUI
void viteFaker
void createViteFaker
void viteFakerOptions
void WebpackPluginFaker
`,
  )

  writeFileSync(
    path.join(consumerDirectory, 'cjs-consumer.cts'),
    `import { extend } from '@baicie/faker-shared'
import { ensureDirSync } from '@baicie/faker-shared/node'
import { DBManager } from '@baicie/faker-core'
import { WebpackPluginFaker } from '@baicie/webpack-plugin-faker'

void extend
void ensureDirSync
void DBManager
void WebpackPluginFaker
`,
  )

  writeFileSync(
    path.join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          esModuleInterop: true,
          module: 'Node16',
          moduleResolution: 'Node16',
          noEmit: true,
          strict: true,
          target: 'ES2022',
          types: ['node'],
        },
        include: ['*.mts', '*.cts'],
      },
      null,
      2,
    ),
  )
}

export function verifyPackageInstallation() {
  const temporaryDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'faker-release-'),
  )
  const tarballDirectory = path.join(temporaryDirectory, 'tarballs')
  const consumerDirectory = path.join(temporaryDirectory, 'consumer')
  const isolatedConsumersDirectory = path.join(
    temporaryDirectory,
    'isolated-consumers',
  )
  mkdirSync(tarballDirectory)
  mkdirSync(consumerDirectory)
  mkdirSync(isolatedConsumersDirectory)

  try {
    const tarballs = packPackages(tarballDirectory)
    createConsumer(consumerDirectory, tarballs)
    writeSmokeFiles(consumerDirectory)
    run(process.execPath, ['esm-smoke.mjs'], consumerDirectory)
    run(process.execPath, ['cjs-smoke.cjs'], consumerDirectory)
    run(
      'pnpm',
      ['exec', 'tsc', '--project', 'tsconfig.json'],
      consumerDirectory,
    )

    for (const packageDefinition of PACKAGES) {
      const isolatedConsumerDirectory = path.join(
        isolatedConsumersDirectory,
        path.basename(packageDefinition.directory),
      )
      mkdirSync(isolatedConsumerDirectory)
      verifyIsolatedInstallation(
        isolatedConsumerDirectory,
        packageDefinition,
        tarballs,
      )
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  verifyPackageInstallation()
  console.info(
    `Packed package smoke tests passed for ${PACKAGES.length} packages.`,
  )
}
