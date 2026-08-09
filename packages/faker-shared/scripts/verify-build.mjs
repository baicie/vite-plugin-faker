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
  const requirePath = packageJson.exports[exportName].require
  if (!requirePath.endsWith('.cjs')) {
    throw new Error(`${exportName} require export must target CommonJS output`)
  }
  if (!existsSync(new URL(`..${requirePath.slice(1)}`, import.meta.url))) {
    throw new Error(`Missing CommonJS output: ${packageDir}/${requirePath}`)
  }
}
