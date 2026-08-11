import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config'
import { replaceRuntimePlaceholders } from '../src/middlewares/route'

describe('webpack runtime asset placeholders', function () {
  it('injects the standalone WebSocket transport into UI assets', function () {
    const transformed = replaceRuntimePlaceholders(
      'const hotContext = __FAKER_HOT_CONTEXT__',
      resolveConfig({ uiOptions: { mode: 'button' } }),
    )

    expect(transformed).toBe('const hotContext = undefined')
  })
})
