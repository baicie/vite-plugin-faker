import { describe, expect, it } from 'vitest'
import type { FunctionMockConfig } from '@baicie/faker-shared'
import {
  DEFAULT_FUNCTION_HANDLER_SOURCE,
  createFunctionMock,
  createStatefulMock,
  getFunctionHandlerSource,
  parseStatefulStates,
} from '../src/tabs/mock/mock-editor-utils'
import type { MockEditorBase } from '../src/tabs/mock/mock-editor-utils'

const base: MockEditorBase = {
  url: '/api/test',
  method: 'GET',
  enabled: true,
}

describe('mock editor persistence helpers', () => {
  it('round-trips function handler source without a runtime function', () => {
    const source = 'ctx => ({ status: 201, body: { url: ctx.url } })'
    const config = createFunctionMock(base, source)
    const persisted = JSON.parse(JSON.stringify(config)) as FunctionMockConfig

    expect(persisted.handlerSource).toBe(source)
    expect(getFunctionHandlerSource(persisted)).toBe(source)
  })

  it('falls back to a usable function source for a new function mock', () => {
    expect(
      getFunctionHandlerSource({ type: 'function' } as FunctionMockConfig),
    ).toBe(DEFAULT_FUNCTION_HANDLER_SOURCE)
  })

  it('parses and validates stateful response lists', () => {
    const states = parseStatefulStates(
      JSON.stringify([
        { status: 200, body: { loading: true } },
        { status: 201, body: { done: true }, delay: 10 },
      ]),
    )
    const config = createStatefulMock(base, states)

    expect(config.current).toBe(0)
    expect(config.states).toEqual(states)
  })

  it('rejects empty or malformed stateful response lists', () => {
    expect(() => parseStatefulStates('[]')).toThrow('at least one state')
    expect(() => parseStatefulStates('[{"status": 200}]')).toThrow(
      'must have a body',
    )
    expect(() => parseStatefulStates('{"status": 200}')).toThrow(
      'at least one state',
    )
  })
})
