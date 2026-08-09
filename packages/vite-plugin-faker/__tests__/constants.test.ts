import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { INTERCEPTOR_PATH, UI_CSS, UI_ENTRY } from '../src/constants'

const require = createRequire(import.meta.url)

describe('plugin asset resolution', () => {
  it('resolves assets from the installed package graph', () => {
    expect(UI_ENTRY).toBe(require.resolve('@baicie/faker-ui/dist/index.js'))
    expect(UI_CSS).toBe(require.resolve('@baicie/faker-ui/dist/index.css'))
    expect(INTERCEPTOR_PATH).toBe(
      require.resolve('@baicie/faker-interceptor/dist/interceptor.js'),
    )
    expect(existsSync(UI_ENTRY)).toBe(true)
    expect(existsSync(UI_CSS)).toBe(true)
    expect(existsSync(INTERCEPTOR_PATH)).toBe(true)
  })
})
