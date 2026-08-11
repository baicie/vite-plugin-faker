import type { RequestRecord } from '@baicie/faker-shared'

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
  response: TrafficRuleDraftResponse
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

  return {
    url: getRequestPathname(record.url),
    method,
    enabled: true,
    type: 'static',
    response: {
      status: response ? response.statusCode : 200,
      headers: response ? Object.assign({}, response.headers) : {},
      body: response && response.body !== undefined ? response.body : {},
      delay: 0,
    },
  }
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
