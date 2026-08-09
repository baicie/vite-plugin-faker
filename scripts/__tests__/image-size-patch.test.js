import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const browserRequire = createRequire(
  path.resolve('packages/browser-extension/package.json'),
)
const webExtEntry = browserRequire.resolve('web-ext')
const webExtRequire = createRequire(webExtEntry)
const addonsLinterEntry = webExtRequire.resolve('addons-linter')
const addonsLinterRequire = createRequire(addonsLinterEntry)
const imageSizeCjsEntry = addonsLinterRequire.resolve('image-size')
const imageSizePackageRoot = path.dirname(path.dirname(imageSizeCjsEntry))
const imageSizeEsmUrl = pathToFileURL(
  path.join(imageSizePackageRoot, 'dist/index.mjs'),
).href

function resolveParser(name) {
  return addonsLinterRequire.resolve(`image-size/types/${name}`)
}

function expectScriptToReturn(script, nodeOptions = []) {
  const result = spawnSync(process.execPath, [...nodeOptions, '-e', script], {
    stdio: 'pipe',
    timeout: 2000,
  })

  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
}

function createIcnsInput() {
  const input = Buffer.alloc(16)
  input.write('icns', 0)
  input.writeUInt32BE(16, 4)
  input.write('ic07', 8)
  input.writeUInt32BE(0, 12)
  return input
}

function createJxlInput() {
  const input = Buffer.alloc(36)
  input.writeUInt32BE(12, 0)
  input.write('JXL ', 4)
  input.writeUInt32BE(16, 12)
  input.write('ftyp', 16)
  input.write('jxl ', 20)
  input.writeUInt32BE(0, 28)
  input.write('jxlp', 32)
  return input
}

function createHeifInput() {
  const input = Buffer.alloc(64)
  input.writeUInt32BE(16, 0)
  input.write('ftyp', 4)
  input.write('avif', 8)
  input.writeUInt32BE(48, 16)
  input.write('meta', 20)
  input.writeUInt32BE(36, 28)
  input.write('iprp', 32)
  input.writeUInt32BE(28, 36)
  input.write('ipco', 40)
  input.writeUInt32BE(0, 44)
  input.write('ispe', 48)
  input.writeUInt32BE(1, 56)
  input.writeUInt32BE(1, 60)
  return input
}

const maliciousInputs = [
  {
    format: 'ICNS',
    parserName: 'ICNS',
    subpath: 'icns',
    input: createIcnsInput(),
  },
  { format: 'JXL', parserName: 'JXL', subpath: 'jxl', input: createJxlInput() },
  {
    format: 'HEIF',
    parserName: 'HEIF',
    subpath: 'heif',
    input: createHeifInput(),
  },
]

describe.each(maliciousInputs)('$format parser safety patch', scenario => {
  const serializedInput = JSON.stringify([...scenario.input])

  it('returns through the CommonJS main entry used by addons-linter', () => {
    expectScriptToReturn(`
      const imageSize = require(${JSON.stringify(imageSizeCjsEntry)}).default
      try {
        imageSize(Buffer.from(${serializedInput}))
      } catch {}
    `)
  })

  it('returns through the ESM main entry', () => {
    expectScriptToReturn(
      `
        import imageSize from ${JSON.stringify(imageSizeEsmUrl)}
        try {
          imageSize(Buffer.from(${serializedInput}))
        } catch {}
      `,
      ['--input-type=module'],
    )
  })

  it('returns through the parser subpath', () => {
    const parserPath = resolveParser(scenario.subpath)
    expectScriptToReturn(`
      const { ${scenario.parserName} } = require(${JSON.stringify(parserPath)})
      try {
        ${scenario.parserName}.calculate(Buffer.from(${serializedInput}))
      } catch {}
    `)
  })
})
