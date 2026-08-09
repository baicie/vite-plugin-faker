import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createCjsDeclarations } from '../create-cjs-declarations.js'

const temporaryDirectories = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('createCjsDeclarations', () => {
  it('creates a CommonJS wrapper around the ESM declarations', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'faker-dcts-'))
    temporaryDirectories.push(directory)
    writeFileSync(
      path.join(directory, 'index.d.ts'),
      'export declare const value: string;\n//# sourceMappingURL=index.d.ts.map',
    )
    createCjsDeclarations(directory)

    const declaration = readFileSync(
      path.join(directory, 'index.d.cts'),
      'utf8',
    )
    expect(declaration).toContain('typeof import("./index.js"')
    expect(declaration).toContain('"resolution-mode": "import"')
  })
})
