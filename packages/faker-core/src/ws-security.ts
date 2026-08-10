export interface WebSocketClientCheck {
  origin?: string
  host?: string
  remoteAddress?: string
  loopbackOnly?: boolean
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (normalized === 'localhost' || normalized === '::1') return true

  const segments = normalized.split('.')
  if (segments.length !== 4 || segments[0] !== '127') return false
  return segments.every(function (segment) {
    if (!/^\d{1,3}$/.test(segment)) return false
    const value = Number(segment)
    return value >= 0 && value <= 255
  })
}

function isLoopbackAddress(address?: string): boolean {
  if (!address) return false
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '')
  if (normalized.indexOf('::ffff:') === 0) {
    return isLoopbackAddress(normalized.slice(7))
  }
  return isLoopbackHostname(normalized)
}

function getRequestHostname(host?: string): string | undefined {
  if (!host) return undefined
  try {
    return new URL(`ws://${host}`).hostname
  } catch {
    return undefined
  }
}

export function isAllowedWebSocketClient(check: WebSocketClientCheck): boolean {
  if (!check.origin) {
    return isLoopbackAddress(check.remoteAddress)
  }

  try {
    const origin = new URL(check.origin)
    if (check.loopbackOnly) {
      return isLoopbackHostname(origin.hostname)
    }

    if (!check.host) return false
    if (origin.host.toLowerCase() === check.host.toLowerCase()) {
      return true
    }

    const requestHostname = getRequestHostname(check.host)
    return (
      !!requestHostname &&
      isLoopbackHostname(origin.hostname) &&
      isLoopbackHostname(requestHostname)
    )
  } catch {
    return false
  }
}
