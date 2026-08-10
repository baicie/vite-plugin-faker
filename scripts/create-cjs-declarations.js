import { readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function findDeclarations(directory, declarations) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      findDeclarations(entryPath, declarations)
    } else if (entry.name.endsWith('.d.ts')) {
      declarations.push(entryPath)
    }
  }
}

export function createCjsDeclarations(directory) {
  const declarations = []
  findDeclarations(directory, declarations)

  if (declarations.length === 0) {
    throw new Error(`No .d.ts files found in ${directory}`)
  }

  for (const declarationPath of declarations) {
    const cjsDeclarationPath = declarationPath.slice(0, -5) + '.d.cts'
    const esmEntry = './' + path.basename(declarationPath, '.d.ts') + '.js'
    const declaration = `declare const moduleExports: typeof import(${JSON.stringify(esmEntry)}, {
  with: { "resolution-mode": "import" }
})
export = moduleExports
`

    writeFileSync(cjsDeclarationPath, declaration)
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const directory = process.argv[2]

  if (!directory) {
    throw new Error(
      'Usage: node scripts/create-cjs-declarations.js <directory>',
    )
  }

  createCjsDeclarations(path.resolve(directory))
}
