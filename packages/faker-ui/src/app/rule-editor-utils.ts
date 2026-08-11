import type {
  BaseMockConfig,
  ErrorMockConfig,
  FunctionMockConfig,
  MatchRule,
  MockConfig,
  MockResponse,
  MockType,
  ProxyMockConfig,
  StatefulMockConfig,
  StaticMockConfig,
  TemplateMockConfig,
} from '@baicie/faker-shared'
import { extend } from '@baicie/faker-shared/browser'

export interface RuleEditorDraft {
  id?: string
  name: string
  url: string
  method: string
  enabled: boolean
  description: string
  priority: number
  priorityDefined: boolean
  group: string
  tags: string
  matchRule: string
  type: MockType
  status: number
  headers: string
  body: string
  delay: number
  target: string
  timeout: number
  rewriteHeaders: boolean
  rewriteStatus: boolean
  schema: string
  count: number
  handlerSource: string
  states: string
  current: number
}

interface RuleCommonConfig {
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

export const DEFAULT_FUNCTION_SOURCE = `function handler(ctx) {
  return {
    status: 200,
    body: { url: ctx.url },
  }
}`

export const DEFAULT_RESPONSE_HEADERS = `{
  "Content-Type": "application/json"
}`

export const DEFAULT_RESPONSE_BODY = `{
  "ok": true
}`

export const DEFAULT_TEMPLATE_SCHEMA = `{
  "id": {
    "module": "string",
    "method": "uuid"
  }
}`

export const DEFAULT_STATEFUL_RESPONSES = `[
  {
    "status": 200,
    "body": {
      "step": 1
    }
  },
  {
    "status": 200,
    "body": {
      "step": 2
    }
  }
]`

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function formatJson(value: unknown, fallback: string): string {
  if (value === undefined) {
    return fallback
  }

  const formatted = JSON.stringify(value, null, 2)
  return formatted === undefined ? fallback : formatted
}

function parseJson(source: string): unknown {
  return JSON.parse(source)
}

function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && isFinite(value)
}

function isInteger(value: number): boolean {
  return isFiniteNumber(value) && Math.floor(value) === value
}

function isValidStatus(value: number): boolean {
  return isInteger(value) && value >= 100 && value <= 599
}

function isNonNegativeNumber(value: number): boolean {
  return isFiniteNumber(value) && value >= 0
}

function isPositiveInteger(value: number): boolean {
  return isInteger(value) && value > 0
}

function hasStringValues(value: Record<string, unknown>): boolean {
  return Object.keys(value).every(function (key) {
    return typeof value[key] === 'string'
  })
}

function validateJsonObject(
  source: string,
  invalidJsonMessage: string,
  invalidObjectMessage: string,
): string | undefined {
  let parsed: unknown
  try {
    parsed = parseJson(source)
  } catch {
    return invalidJsonMessage
  }

  return isRecord(parsed) ? undefined : invalidObjectMessage
}

function validateHeaders(source: string, label: string): string | undefined {
  let parsed: unknown
  try {
    parsed = parseJson(source)
  } catch {
    return label + ' must be valid JSON'
  }

  if (!isRecord(parsed)) {
    return label + ' must be a JSON object'
  }
  if (!hasStringValues(parsed)) {
    return label + ' values must be strings'
  }
  return undefined
}

function validateBody(source: string): string | undefined {
  try {
    parseJson(source)
    return undefined
  } catch {
    return 'Response body must be valid JSON'
  }
}

function validateStatefulResponses(source: string): string[] {
  const errors: string[] = []
  let parsed: unknown
  try {
    parsed = parseJson(source)
  } catch {
    return ['Stateful responses must be valid JSON']
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return ['Stateful rule requires at least one response']
  }

  parsed.forEach(function (response, index) {
    const label = 'Response ' + (index + 1)
    if (!isRecord(response)) {
      errors.push(label + ' must be an object')
      return
    }
    if (
      typeof response.status !== 'number' ||
      !isValidStatus(response.status)
    ) {
      errors.push(label + ' status must be an integer between 100 and 599')
    }
    if (!Object.prototype.hasOwnProperty.call(response, 'body')) {
      errors.push(label + ' must include a body')
    }
    if (response.headers !== undefined) {
      if (!isRecord(response.headers)) {
        errors.push(label + ' headers must be a JSON object')
      } else if (!hasStringValues(response.headers)) {
        errors.push(label + ' header values must be strings')
      }
    }
    if (
      response.delay !== undefined &&
      (typeof response.delay !== 'number' ||
        !isNonNegativeNumber(response.delay))
    ) {
      errors.push(label + ' delay must be a non-negative number')
    }
  })

  return errors
}

function getFunctionSource(config: FunctionMockConfig): string {
  if (config.handlerSource && config.handlerSource.trim()) {
    return config.handlerSource
  }
  if (typeof config.handler === 'function') {
    return String(config.handler)
  }
  return DEFAULT_FUNCTION_SOURCE
}

export function createRuleEditorDraft(
  config: MockConfig | null,
): RuleEditorDraft {
  const draft: RuleEditorDraft = {
    name: config && config.name ? config.name : '',
    url: config ? config.url : '',
    method: config ? config.method : 'GET',
    enabled: config ? config.enabled : true,
    description: config && config.description ? config.description : '',
    priority: config && config.priority !== undefined ? config.priority : 0,
    priorityDefined: config ? config.priority !== undefined : true,
    group: config && config.group ? config.group : '',
    tags: config && config.tags ? config.tags.join(', ') : '',
    matchRule:
      config && config.matchRule ? formatJson(config.matchRule, '') : '',
    type: config ? config.type : 'static',
    status: 200,
    headers: DEFAULT_RESPONSE_HEADERS,
    body: DEFAULT_RESPONSE_BODY,
    delay: 0,
    target: '',
    timeout: 10000,
    rewriteHeaders: true,
    rewriteStatus: true,
    schema: DEFAULT_TEMPLATE_SCHEMA,
    count: 1,
    handlerSource: DEFAULT_FUNCTION_SOURCE,
    states: DEFAULT_STATEFUL_RESPONSES,
    current: 0,
  }

  if (config && config.id) {
    draft.id = config.id
  }

  if (config && (config.type === 'static' || config.type === 'error')) {
    draft.status = config.response.status
    draft.headers = formatJson(config.response.headers, '{}')
    draft.body = formatJson(config.response.body, 'null')
    draft.delay =
      config.response.delay === undefined ? 0 : config.response.delay
  } else if (config && config.type === 'proxy') {
    draft.target = config.target
    draft.timeout = config.timeout === undefined ? 10000 : config.timeout
    draft.rewriteHeaders = config.rewriteHeaders === true
    draft.rewriteStatus = config.rewriteStatus === true
  } else if (config && config.type === 'template') {
    draft.schema = formatJson(config.schema, DEFAULT_TEMPLATE_SCHEMA)
    draft.count = config.count === undefined ? 1 : config.count
  } else if (config && config.type === 'function') {
    draft.handlerSource = getFunctionSource(config)
  } else if (config && config.type === 'stateful') {
    draft.states = formatJson(config.states, DEFAULT_STATEFUL_RESPONSES)
    draft.current = config.current === undefined ? 0 : config.current
  }

  return draft
}

export function validateRuleEditorDraft(draft: RuleEditorDraft): string[] {
  const errors: string[] = []

  if (!draft.url.trim()) {
    errors.push('URL is required')
  }
  if (!draft.method.trim()) {
    errors.push('Method is required')
  }
  if (!isInteger(draft.priority)) {
    errors.push('Priority must be an integer')
  }

  if (draft.type === 'static' || draft.type === 'error') {
    if (!isValidStatus(draft.status)) {
      errors.push('Status must be an integer between 100 and 599')
    }
    if (!isNonNegativeNumber(draft.delay)) {
      errors.push('Delay must be a non-negative number')
    }

    const headersError = validateHeaders(draft.headers, 'Response headers')
    if (headersError) {
      errors.push(headersError)
    }
    const bodyError = validateBody(draft.body)
    if (bodyError) {
      errors.push(bodyError)
    }
  } else if (draft.type === 'proxy') {
    if (!draft.target.trim()) {
      errors.push('Proxy target is required')
    }
    if (!isNonNegativeNumber(draft.timeout)) {
      errors.push('Proxy timeout must be a non-negative number')
    }
  } else if (draft.type === 'template') {
    const schemaError = validateJsonObject(
      draft.schema,
      'Template schema must be valid JSON',
      'Template schema must be a JSON object',
    )
    if (schemaError) {
      errors.push(schemaError)
    }
    if (!isPositiveInteger(draft.count)) {
      errors.push('Template count must be a positive integer')
    }
  } else if (draft.type === 'function') {
    if (!draft.handlerSource.trim()) {
      errors.push('Function handler source is required')
    }
  } else if (draft.type === 'stateful') {
    errors.push.apply(errors, validateStatefulResponses(draft.states))
    if (!isInteger(draft.current) || draft.current < 0) {
      errors.push('Current state must be a non-negative integer')
    }
  }

  if (draft.matchRule.trim()) {
    const matchRuleError = validateJsonObject(
      draft.matchRule,
      'Match rule must be valid JSON',
      'Match rule must be a JSON object',
    )
    if (matchRuleError) {
      errors.push(matchRuleError)
    }
  }

  return errors
}

function parseHeaders(source: string): Record<string, string> {
  return parseJson(source) as Record<string, string>
}

function normalizeTags(source: string): string[] {
  const tags: string[] = []
  source.split(',').forEach(function (value) {
    const tag = value.trim()
    if (tag && tags.indexOf(tag) === -1) {
      tags.push(tag)
    }
  })
  return tags
}

function createCommonConfig(draft: RuleEditorDraft): RuleCommonConfig {
  const common: RuleCommonConfig = {
    url: draft.url.trim(),
    method: draft.method.trim().toUpperCase(),
    enabled: draft.enabled,
  }

  if (draft.id) {
    common.id = draft.id
  }
  if (draft.name.trim()) {
    common.name = draft.name.trim()
  }
  if (draft.description.trim()) {
    common.description = draft.description.trim()
  }
  if (draft.priorityDefined) {
    common.priority = draft.priority
  }
  if (draft.group.trim()) {
    common.group = draft.group.trim()
  }

  const tags = normalizeTags(draft.tags)
  if (tags.length > 0) {
    common.tags = tags
  }
  if (draft.matchRule.trim()) {
    common.matchRule = parseJson(draft.matchRule) as MatchRule
  }

  return common
}

export function createRuleConfig(draft: RuleEditorDraft): MockConfig {
  const errors = validateRuleEditorDraft(draft)
  if (errors.length > 0) {
    throw new Error(errors[0])
  }

  const common = createCommonConfig(draft)

  if (draft.type === 'proxy') {
    return extend({}, common, {
      type: 'proxy',
      target: draft.target.trim(),
      timeout: draft.timeout,
      rewriteHeaders: draft.rewriteHeaders,
      rewriteStatus: draft.rewriteStatus,
    }) as ProxyMockConfig
  }

  if (draft.type === 'template') {
    return extend({}, common, {
      type: 'template',
      schema: parseJson(draft.schema),
      count: draft.count,
    }) as TemplateMockConfig
  }

  if (draft.type === 'function') {
    return extend({}, common, {
      type: 'function',
      handlerSource: draft.handlerSource.trim(),
    }) as FunctionMockConfig
  }

  if (draft.type === 'stateful') {
    return extend({}, common, {
      type: 'stateful',
      states: parseJson(draft.states) as MockResponse[],
      current: draft.current,
    }) as StatefulMockConfig
  }

  const response: MockResponse = {
    status: draft.status,
    headers: parseHeaders(draft.headers),
    body: parseJson(draft.body),
    delay: draft.delay,
  }

  if (draft.type === 'error') {
    return extend({}, common, {
      type: 'error',
      response,
    }) as ErrorMockConfig
  }

  return extend({}, common, {
    type: 'static',
    response,
  }) as StaticMockConfig
}

export function getRuleIdentity(config: BaseMockConfig): string {
  return config.id ? config.id : config.url + '-' + config.method
}
