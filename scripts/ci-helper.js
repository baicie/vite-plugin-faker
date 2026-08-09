import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WORKSPACE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const EXPECTED_NODE_ENGINE = '>=20.19.0'
const EXPECTED_REGISTRY = 'https://registry.npmjs.org/'
const EXPECTED_RELEASE_COMMAND =
  'pnpm build && pnpm release:check && pnpm release:smoke && cross-env npm_config_ignore_scripts=true changeset publish'
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

export const PACKAGES = [
  {
    directory: 'packages/faker-shared',
    name: '@baicie/faker-shared',
    dependencies: [],
    formats: ['import', 'require'],
    dualExports: ['./node'],
  },
  {
    directory: 'packages/faker-core',
    name: '@baicie/faker-core',
    dependencies: ['@baicie/faker-shared'],
    formats: ['import', 'require'],
  },
  {
    directory: 'packages/faker-interceptor',
    name: '@baicie/faker-interceptor',
    dependencies: [],
    formats: ['import'],
  },
  {
    directory: 'packages/faker-ui',
    name: '@baicie/faker-ui',
    dependencies: ['@baicie/faker-shared'],
    formats: ['import'],
  },
  {
    directory: 'packages/vite-plugin-faker',
    name: '@baicie/vite-plugin-faker',
    dependencies: [
      '@baicie/faker-core',
      '@baicie/faker-interceptor',
      '@baicie/faker-shared',
      '@baicie/faker-ui',
    ],
    formats: ['import'],
  },
  {
    directory: 'packages/webpack-plugin-faker',
    name: '@baicie/webpack-plugin-faker',
    dependencies: [
      '@baicie/faker-core',
      '@baicie/faker-interceptor',
      '@baicie/faker-shared',
      '@baicie/faker-ui',
    ],
    formats: ['import', 'require'],
  },
]

const DEPENDENCY_FIELDS = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'devDependencies',
]

export function validateReleaseCommand(manifest, errors) {
  if (
    !manifest.scripts ||
    manifest.scripts.release !== EXPECTED_RELEASE_COMMAND
  ) {
    errors.push(
      `package.json: scripts.release must be ${EXPECTED_RELEASE_COMMAND}`,
    )
  }
}

function readManifest(packageDefinition, errors) {
  const manifestPath = path.join(
    WORKSPACE_ROOT,
    packageDefinition.directory,
    'package.json',
  )

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    errors.push(
      `${packageDefinition.directory}: cannot read package.json (${error.message})`,
    )
    return null
  }
}

function hasDistEntry(files) {
  return (
    Array.isArray(files) &&
    files.some(file => file === 'dist' || file.startsWith('dist/'))
  )
}

function sorted(values) {
  return values.slice().sort()
}

function arraysEqual(left, right) {
  return (
    left.length === right.length && left.every((value, i) => value === right[i])
  )
}

function validateDualExport(packageDefinition, manifest, exportName, errors) {
  const prefix = packageDefinition.directory
  const exportEntry = manifest.exports && manifest.exports[exportName]
  const exportLabel = `exports[${JSON.stringify(exportName)}]`

  if (!exportEntry || typeof exportEntry !== 'object') {
    errors.push(`${prefix}: ${exportLabel} must be an object`)
    return
  }

  if (typeof exportEntry.types === 'string') {
    errors.push(
      `${prefix}: ${exportLabel} must define types inside import and require`,
    )
  }

  for (const format of ['import', 'require']) {
    const condition = exportEntry[format]

    if (!condition) {
      errors.push(`${prefix}: ${exportLabel} must define ${format}`)
      continue
    }
    if (typeof condition !== 'object') {
      if (format === 'require' && !condition.endsWith('.cjs')) {
        errors.push(`${prefix}: ${exportLabel}.require must target a .cjs file`)
      }
      errors.push(
        `${prefix}: ${exportLabel}.${format} must define conditional types and default`,
      )
      continue
    }

    const expectedTypesExtension = format === 'require' ? '.d.cts' : '.d.ts'
    const expectedDefaultExtension = format === 'require' ? '.cjs' : '.js'

    if (
      typeof condition.types !== 'string' ||
      !condition.types.endsWith(expectedTypesExtension)
    ) {
      errors.push(
        `${prefix}: ${exportLabel}.${format}.types must target a ${expectedTypesExtension} file`,
      )
    }
    if (
      typeof condition.default !== 'string' ||
      !condition.default.endsWith(expectedDefaultExtension)
    ) {
      errors.push(
        `${prefix}: ${exportLabel}.${format}.default must target a ${expectedDefaultExtension} file`,
      )
    }
  }
}

function validateRootExport(packageDefinition, manifest, errors) {
  const prefix = packageDefinition.directory
  const rootExport = manifest.exports && manifest.exports['.']

  if (!rootExport || typeof rootExport !== 'object') {
    errors.push(`${prefix}: exports["."] must be an object`)
    return
  }

  if (packageDefinition.formats.includes('require')) {
    validateDualExport(packageDefinition, manifest, '.', errors)

    for (const exportName of packageDefinition.dualExports || []) {
      validateDualExport(packageDefinition, manifest, exportName, errors)
    }
    return
  }

  for (const format of packageDefinition.formats) {
    if (typeof rootExport[format] !== 'string') {
      errors.push(`${prefix}: exports["."] must define ${format}`)
    }
  }
}

export function validateManifest(
  packageDefinition,
  manifest,
  packageNames,
  errors,
) {
  const prefix = packageDefinition.directory

  if (manifest.name !== packageDefinition.name) {
    errors.push(`${prefix}: expected package name ${packageDefinition.name}`)
  }
  if (manifest.private === true) {
    errors.push(`${prefix}: public package cannot be private`)
  }
  if (!SEMVER_PATTERN.test(manifest.version)) {
    errors.push(`${prefix}: version must be valid SemVer`)
  }
  if (!hasDistEntry(manifest.files)) {
    errors.push(`${prefix}: files must include dist`)
  }
  if (!manifest.publishConfig || manifest.publishConfig.access !== 'public') {
    errors.push(`${prefix}: publishConfig.access must be public`)
  }
  if (
    !manifest.publishConfig ||
    manifest.publishConfig.registry !== EXPECTED_REGISTRY
  ) {
    errors.push(
      `${prefix}: publishConfig.registry must be ${EXPECTED_REGISTRY}`,
    )
  }
  if (!manifest.engines || manifest.engines.node !== EXPECTED_NODE_ENGINE) {
    errors.push(`${prefix}: engines.node must be ${EXPECTED_NODE_ENGINE}`)
  }

  validateRootExport(packageDefinition, manifest, errors)

  const runtimeDependencies = manifest.dependencies || {}
  const actualInternalDependencies = sorted(
    Object.keys(runtimeDependencies).filter(name => packageNames.has(name)),
  )
  const expectedInternalDependencies = sorted(packageDefinition.dependencies)

  if (!arraysEqual(actualInternalDependencies, expectedInternalDependencies)) {
    errors.push(
      `${prefix}: expected internal runtime dependencies ` +
        `[${expectedInternalDependencies.join(', ')}], received ` +
        `[${actualInternalDependencies.join(', ')}]`,
    )
  }

  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = manifest[field] || {}

    for (const name of Object.keys(dependencies)) {
      const specifier = dependencies[name]

      if (specifier.startsWith('workspace:') && !packageNames.has(name)) {
        errors.push(
          `${prefix}: ${field}.${name} points to an unknown workspace package`,
        )
      }
      if (packageNames.has(name) && !specifier.startsWith('workspace:')) {
        errors.push(
          `${prefix}: ${field}.${name} must use the workspace protocol`,
        )
      }
    }
  }
}

function validateDependencyGraph(manifests, errors) {
  const visiting = Object.create(null)
  const visited = Object.create(null)

  function visit(packageName, pathNames) {
    if (visiting[packageName]) {
      errors.push(
        `internal dependency cycle: ${pathNames.concat(packageName).join(' -> ')}`,
      )
      return
    }
    if (visited[packageName]) return

    visiting[packageName] = true
    const manifest = manifests.get(packageName)
    const dependencies = manifest.dependencies || {}

    for (const dependencyName of Object.keys(dependencies)) {
      if (manifests.has(dependencyName)) {
        visit(dependencyName, pathNames.concat(packageName))
      }
    }

    visiting[packageName] = false
    visited[packageName] = true
  }

  for (const packageName of manifests.keys()) {
    visit(packageName, [])
  }
}

export function validatePackedFiles(
  packageDefinition,
  manifest,
  files,
  errors,
) {
  const publicEntries = new Set()
  const packedFiles = new Set(files)

  for (const requiredFile of ['LICENSE', 'README.md']) {
    if (!packedFiles.has(requiredFile)) {
      errors.push(
        `${packageDefinition.directory}: tarball does not include ${requiredFile}`,
      )
    }
  }

  function addEntry(entry) {
    if (typeof entry !== 'string') return

    const normalizedEntry = entry.startsWith('./') ? entry.slice(2) : entry
    if (normalizedEntry) publicEntries.add(normalizedEntry)
  }

  function addEntries(value) {
    if (typeof value === 'string') {
      addEntry(value)
      return
    }
    if (!value || typeof value !== 'object') return

    for (const key of Object.keys(value)) {
      addEntries(value[key])
    }
  }

  for (const field of ['main', 'module', 'types', 'typings', 'css']) {
    addEntry(manifest[field])
  }
  addEntries(manifest.browser)
  addEntries(manifest.bin)
  addEntries(manifest.exports)

  for (const entry of publicEntries) {
    if (!packedFiles.has(entry)) {
      errors.push(
        `${packageDefinition.directory}: tarball is missing public entry ${entry}`,
      )
    }
  }
}

function validateTarball(packageDefinition, manifest, errors) {
  const result = spawnSync(
    'pnpm',
    ['--dir', packageDefinition.directory, 'pack', '--dry-run', '--json'],
    {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf8',
    },
  )

  if (result.error || result.status !== 0) {
    const detail = result.error ? result.error.message : result.stderr.trim()
    errors.push(`${packageDefinition.directory}: pnpm pack failed (${detail})`)
    return
  }

  let packResult
  try {
    packResult = JSON.parse(result.stdout)
  } catch (error) {
    errors.push(
      `${packageDefinition.directory}: cannot parse pnpm pack output (${error.message})`,
    )
    return
  }

  const files = Array.isArray(packResult.files)
    ? packResult.files.map(file => file.path)
    : []

  if (!files.includes('package.json')) {
    errors.push(
      `${packageDefinition.directory}: tarball does not include package.json`,
    )
  }
  if (!files.some(file => file.startsWith('dist/'))) {
    errors.push(
      `${packageDefinition.directory}: tarball does not include dist files`,
    )
  }

  validatePackedFiles(packageDefinition, manifest, files, errors)
}

function main() {
  const errors = []
  try {
    validateReleaseCommand(
      JSON.parse(
        readFileSync(path.join(WORKSPACE_ROOT, 'package.json'), 'utf8'),
      ),
      errors,
    )
  } catch (error) {
    errors.push(`package.json: cannot read root manifest (${error.message})`)
  }
  const packageNames = new Set(
    PACKAGES.map(packageDefinition => packageDefinition.name),
  )
  const manifests = new Map()

  for (const packageDefinition of PACKAGES) {
    const manifest = readManifest(packageDefinition, errors)
    if (!manifest) continue

    manifests.set(packageDefinition.name, manifest)
    validateManifest(packageDefinition, manifest, packageNames, errors)
  }

  if (manifests.size === PACKAGES.length) {
    validateDependencyGraph(manifests, errors)
  }

  for (const packageDefinition of PACKAGES) {
    const manifest = manifests.get(packageDefinition.name)
    if (manifest) validateTarball(packageDefinition, manifest, errors)
  }

  if (errors.length > 0) {
    console.error('Release validation failed:')
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  console.info(
    `Release validation passed for ${PACKAGES.length} public packages.`,
  )
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main()
}
