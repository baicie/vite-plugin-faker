const BLOCKED_RESPONSE_HEADERS: Record<string, boolean> = {
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
  'x-mock-id': true,
  'x-mock-source': true,
}

export function sanitizeMockResponseHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {}

  Object.keys(headers).forEach(function (name) {
    const value = headers[name]
    if (!BLOCKED_RESPONSE_HEADERS[name.toLowerCase()] && value !== undefined) {
      sanitized[name] = value
    }
  })

  return sanitized
}
