import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const packageDir = fileURLToPath(new URL('..', import.meta.url))
const declaration = readFileSync(
  new URL('../dist/index.d.ts', import.meta.url),
  'utf8',
)
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
)
const forbiddenModules = ['vite', 'vite/types/hot.js', '@baicie/logger']

for (const moduleName of forbiddenModules) {
  if (
    declaration.includes(`from "${moduleName}"`) ||
    declaration.includes(`from '${moduleName}'`)
  ) {
    throw new Error(`Public declarations must not import ${moduleName}`)
  }
}

for (const exportName of ['.', './node']) {
  const exportEntry = packageJson.exports[exportName]
  const importEntry = exportEntry.import
  const requireEntry = exportEntry.require

  if (!importEntry.default.endsWith('.js')) {
    throw new Error(`${exportName} import export must target ESM output`)
  }
  if (!importEntry.types.endsWith('.d.ts')) {
    throw new Error(`${exportName} import types must target .d.ts output`)
  }
  if (!requireEntry.default.endsWith('.cjs')) {
    throw new Error(`${exportName} require export must target CommonJS output`)
  }
  if (!requireEntry.types.endsWith('.d.cts')) {
    throw new Error(`${exportName} require types must target .d.cts output`)
  }

  for (const exportPath of [
    importEntry.default,
    importEntry.types,
    requireEntry.default,
    requireEntry.types,
  ]) {
    if (!existsSync(new URL(`..${exportPath.slice(1)}`, import.meta.url))) {
      throw new Error(`Missing package output: ${packageDir}/${exportPath}`)
    }
  }
}
