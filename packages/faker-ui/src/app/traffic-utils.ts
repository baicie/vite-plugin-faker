import type {
  MatchRule,
  QueryMatchCondition,
  RequestRecord,
} from '@baicie/faker-shared'

export interface TrafficRuleDraftResponse {
  status: number
  headers: Record<string, string>
  body: unknown
  delay: number
}

export interface TrafficRuleDraft {
  url: string
  method: string
  enabled: true
  type: 'static'
  matchRule?: MatchRule
  response: TrafficRuleDraftResponse
}

const BLOCKED_RESPONSE_HEADERS: Record<string, boolean> = {
  connection: true,
  'keep-alive': true,
  'transfer-encoding': true,
  upgrade: true,
  te: true,
  trailer: true,
  'content-length': true,
  'content-encoding': true,
  date: true,
  server: true,
  etag: true,
  'last-modified': true,
  'set-cookie': true,
  'set-cookie2': true,
  'x-mock-id': true,
  'x-mock-source': true,
}

function toQueryConditionValue(
  value: unknown,
): string | string[] | undefined {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined
    }
    return value.map(function (item) {
      return String(item)
    })
  }
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value)
      return typeof serialized === 'string' ? serialized : undefined
    } catch (_error) {
      return undefined
    }
  }
  return String(value)
}

function createQueryConditions(
  query: RequestRecord['query'],
): QueryMatchCondition[] {
  const conditions: QueryMatchCondition[] = []
  if (!query) {
    return conditions
  }

  Object.keys(query).forEach(function (key) {
    const value = toQueryConditionValue(query[key])
    if (value !== undefined) {
      conditions.push({ key, value, operator: 'equals' })
    }
  })
  return conditions
}

function toBodyConditionValue(body: unknown): string | undefined {
  if (body === undefined || body === null) {
    return undefined
  }
  if (typeof body === 'string') {
    return body.trim() ? body : undefined
  }
  if (typeof body !== 'object') {
    return String(body)
  }

  try {
    const serialized = JSON.stringify(body)
    return typeof serialized === 'string' ? serialized : undefined
  } catch (_error) {
    return undefined
  }
}

function createMatchRule(record: RequestRecord): MatchRule | undefined {
  const query = createQueryConditions(record.query)
  const body = toBodyConditionValue(record.body)
  if (query.length === 0 && body === undefined) {
    return undefined
  }

  const matchRule: MatchRule = {}
  if (query.length > 0) {
    matchRule.query = query
  }
  if (body !== undefined) {
    matchRule.body = {
      path: '',
      value: body,
      operator: 'equals',
    }
  }
  return matchRule
}

function sanitizeResponseHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {}
  const connectionHeaders: Record<string, boolean> = {}

  Object.keys(headers).forEach(function (key) {
    if (key.toLowerCase() !== 'connection') {
      return
    }
    headers[key].split(',').forEach(function (value) {
      const normalized = value.trim().toLowerCase()
      if (normalized) {
        connectionHeaders[normalized] = true
      }
    })
  })

  Object.keys(headers).forEach(function (key) {
    const normalized = key.toLowerCase()
    if (
      !BLOCKED_RESPONSE_HEADERS[normalized] &&
      normalized.indexOf('proxy-') !== 0 &&
      !connectionHeaders[normalized]
    ) {
      result[key] = headers[key]
    }
  })

  return result
}

export function getRequestPathname(url: string): string {
  try {
    const parsed = new URL(url, 'http://faker.local')
    return parsed.pathname || '/'
  } catch (_error) {
    const withoutHash = url.split('#')[0] || ''
    const withoutQuery = withoutHash.split('?')[0] || ''
    if (!withoutQuery) {
      return '/'
    }
    return withoutQuery.charAt(0) === '/' ? withoutQuery : '/' + withoutQuery
  }
}

export function createTrafficRuleDraft(
  record: RequestRecord,
): TrafficRuleDraft {
  const response = record.response
  const method = record.method.trim().toUpperCase() || 'GET'
  const matchRule = createMatchRule(record)

  const draft: TrafficRuleDraft = {
    url: getRequestPathname(record.url),
    method,
    enabled: true,
    type: 'static',
    response: {
      status: response ? response.statusCode : 200,
      headers: response ? sanitizeResponseHeaders(response.headers) : {},
      body: response && response.body !== undefined ? response.body : {},
      delay: 0,
    },
  }
  if (matchRule) {
    draft.matchRule = matchRule
  }
  return draft
}

export function formatTrafficValue(value: unknown): string {
  if (value === undefined || value === null) {
    return 'No data'
  }
  if (typeof value === 'string') {
    return value
  }

  try {
    const formatted = JSON.stringify(value, null, 2)
    return typeof formatted === 'string' ? formatted : String(value)
  } catch (_error) {
    return String(value)
  }
}

export function formatDuration(duration: number | undefined): string {
  if (typeof duration !== 'number' || !isFinite(duration)) {
    return '-'
  }
  if (duration >= 1000) {
    return (duration / 1000).toFixed(2) + ' s'
  }
  return Math.round(duration) + ' ms'
}
