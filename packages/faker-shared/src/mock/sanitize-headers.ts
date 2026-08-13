/**
 * 共享的响应头清洗逻辑。
 *
 * 该实现被 server 端中间件（faker-core/vite-plugin-faker/webpack-plugin-faker）
 * 与 UI 端 Traffic 草稿共用，避免在多处维护同一份黑名单。
 */

export const BLOCKED_RESPONSE_HEADERS: Record<string, boolean> = {
  connection: true,
  'content-encoding': true,
  'content-length': true,
  'keep-alive': true,
  'proxy-connection': true,
  'proxy-authenticate': true,
  'proxy-authorization': true,
  te: true,
  trailer: true,
  'transfer-encoding': true,
  upgrade: true,
  date: true,
  server: true,
  etag: true,
  'last-modified': true,
  'set-cookie': true,
  'set-cookie2': true,
  'x-mock-id': true,
  'x-mock-source': true,
}

export function sanitizeResponseHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {}
  const connectionTokens: Record<string, boolean> = {}

  Object.keys(headers).forEach(function (name) {
    if (name.toLowerCase() !== 'connection') {
      return
    }
    const connectionValue = headers[name] || ''
    connectionValue.split(',').forEach(function (token) {
      const normalized = token.trim().toLowerCase()
      if (normalized) {
        connectionTokens[normalized] = true
      }
    })
  })

  Object.keys(headers).forEach(function (name) {
    const value = headers[name]
    const normalized = name.toLowerCase()
    if (value === undefined) {
      return
    }
    if (BLOCKED_RESPONSE_HEADERS[normalized]) {
      return
    }
    if (normalized.indexOf('proxy-') === 0) {
      return
    }
    if (connectionTokens[normalized]) {
      return
    }
    sanitized[name] = value
  })

  return sanitized
}
