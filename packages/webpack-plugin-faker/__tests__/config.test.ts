import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config'

describe('resolveConfig', () => {
  it('disables persisted function source by default', () => {
    const config = resolveConfig({})

    expect(config.allowFunctionHandlerSource).toBe(false)
    expect(config.functionHandlerTimeout).toBe(1000)
  })

  it('accepts explicit persisted function execution settings', () => {
    const config = resolveConfig({
      allowFunctionHandlerSource: true,
      functionHandlerTimeout: 250,
    })

    expect(config.allowFunctionHandlerSource).toBe(true)
    expect(config.functionHandlerTimeout).toBe(250)
  })

  it('does not leak function execution settings into later configs', () => {
    resolveConfig({ allowFunctionHandlerSource: true })

    expect(resolveConfig({}).allowFunctionHandlerSource).toBe(false)
  })

  it('preserves nested ui defaults when overriding one option', () => {
    const config = resolveConfig({ uiOptions: { mode: 'button' } })

    expect(config.uiOptions).toMatchObject({
      mode: 'button',
      timeout: 10000,
    })
  })
})
