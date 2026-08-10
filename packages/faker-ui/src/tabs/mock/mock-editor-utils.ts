import type {
  FunctionMockConfig,
  MatchRule,
  MockResponse,
  StatefulMockConfig,
} from '@baicie/faker-shared'
import { extend } from '@baicie/faker-shared'

export interface MockEditorBase {
  id?: string
  name?: string
  url: string
  method: string
  enabled: boolean
  description?: string
  priority?: number
  group?: string
  tags?: string[]
  matchRule?: MatchRule
}

export const DEFAULT_FUNCTION_HANDLER_SOURCE = `function handler(ctx) {
  return {
    status: 200,
    body: {},
  }
}`

export const DEFAULT_STATEFUL_STATES = JSON.stringify(
  [
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {},
      delay: 0,
    },
  ],
  null,
  2,
)

export function getFunctionHandlerSource(mock: FunctionMockConfig): string {
  if (mock.handlerSource && mock.handlerSource.trim()) {
    return mock.handlerSource
  }
  if (typeof mock.handler === 'function') {
    return String(mock.handler)
  }
  return DEFAULT_FUNCTION_HANDLER_SOURCE
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function parseStatefulStates(source: string): MockResponse[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    throw new Error('Stateful states must be valid JSON')
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Stateful mock requires at least one state')
  }

  parsed.forEach(function (value, index) {
    if (!isRecord(value)) {
      throw new Error(`State ${index + 1} must be an object`)
    }
    if (typeof value.status !== 'number' || !isFinite(value.status)) {
      throw new Error(`State ${index + 1} must have a numeric status`)
    }
    if (!Object.prototype.hasOwnProperty.call(value, 'body')) {
      throw new Error(`State ${index + 1} must have a body`)
    }
    if (value.headers !== undefined && !isRecord(value.headers)) {
      throw new Error(`State ${index + 1} headers must be an object`)
    }
    if (
      value.delay !== undefined &&
      (typeof value.delay !== 'number' || value.delay < 0)
    ) {
      throw new Error(`State ${index + 1} delay must be a non-negative number`)
    }
  })

  return parsed as MockResponse[]
}

export function createFunctionMock(
  base: MockEditorBase,
  source: string,
): FunctionMockConfig {
  const handlerSource = source.trim()
  if (!handlerSource) {
    throw new Error('Function mock requires handler source')
  }
  return extend({}, base, {
    type: 'function',
    handlerSource,
  }) as FunctionMockConfig
}

export function createStatefulMock(
  base: MockEditorBase,
  states: MockResponse[],
): StatefulMockConfig {
  if (states.length === 0) {
    throw new Error('Stateful mock requires at least one state')
  }
  return extend({}, base, {
    type: 'stateful',
    states,
    current: 0,
  }) as StatefulMockConfig
}
