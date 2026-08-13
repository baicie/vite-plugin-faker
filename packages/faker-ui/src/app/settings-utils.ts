import type { MockConfig } from '@baicie/faker-shared'
import type { FakerSettings, RuntimeSettings } from '../api/setting'

const MAX_GLOBAL_DELAY = 60000
const SUPPORTED_MOCK_TYPES = [
  'static',
  'function',
  'template',
  'proxy',
  'error',
  'stateful',
]

function normalizeGlobalDelay(value: unknown): number {
  if (typeof value !== 'number' || !isFinite(value)) {
    return 0
  }
  return Math.min(MAX_GLOBAL_DELAY, Math.max(0, Math.round(value)))
}

function normalizeCorsOrigin(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return '*'
  }
  return value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isSupportedMockType(value: unknown): boolean {
  return typeof value === 'string' && SUPPORTED_MOCK_TYPES.indexOf(value) !== -1
}

export function createDefaultRuntimeSettings(): RuntimeSettings {
  return {
    globalDelay: 0,
    enableAllMocks: true,
    logRequests: true,
    corsEnabled: true,
    corsAllowOrigin: '*',
  }
}

export function normalizeRuntimeSettings(
  settings: FakerSettings,
): RuntimeSettings {
  return {
    globalDelay: normalizeGlobalDelay(settings.globalDelay),
    enableAllMocks:
      typeof settings.enableAllMocks === 'boolean'
        ? settings.enableAllMocks
        : true,
    logRequests:
      typeof settings.logRequests === 'boolean' ? settings.logRequests : true,
    corsEnabled:
      typeof settings.corsEnabled === 'boolean' ? settings.corsEnabled : true,
    corsAllowOrigin: normalizeCorsOrigin(settings.corsAllowOrigin),
  }
}

export function createSettingsUpdate(
  settings: RuntimeSettings,
): RuntimeSettings {
  return {
    globalDelay: normalizeGlobalDelay(settings.globalDelay),
    enableAllMocks: settings.enableAllMocks,
    logRequests: settings.logRequests,
    corsEnabled: settings.corsEnabled,
    corsAllowOrigin: normalizeCorsOrigin(settings.corsAllowOrigin),
  }
}

export function parseMockImport(source: string): MockConfig[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(source) as unknown
  } catch {
    throw new Error('Mock import must be valid JSON')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Mock import must be a JSON array')
  }
  if (parsed.length === 0) {
    throw new Error('Mock import must contain at least one rule')
  }

  parsed.forEach(function (value: unknown, index: number) {
    const ruleNumber = index + 1
    if (!isRecord(value)) {
      throw new Error('Rule ' + ruleNumber + ' must be an object')
    }
    if (typeof value.url !== 'string' || !value.url.trim()) {
      throw new Error('Rule ' + ruleNumber + ' must have a URL')
    }
    if (typeof value.method !== 'string' || !value.method.trim()) {
      throw new Error('Rule ' + ruleNumber + ' must have an HTTP method')
    }
    if (!isSupportedMockType(value.type)) {
      throw new Error(
        'Rule ' + ruleNumber + ' has an unsupported response type',
      )
    }
    if (typeof value.enabled !== 'boolean') {
      throw new Error('Rule ' + ruleNumber + ' must declare enabled state')
    }
  })

  return parsed as MockConfig[]
}

export function serializeMockExport(mocks: MockConfig[]): string {
  return JSON.stringify(mocks, null, 2)
}
