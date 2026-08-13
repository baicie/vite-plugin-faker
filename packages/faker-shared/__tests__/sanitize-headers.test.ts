import { describe, expect, it } from 'vitest'
import {
  BLOCKED_RESPONSE_HEADERS,
  sanitizeResponseHeaders,
} from '../src/mock/sanitize-headers'

describe('sanitizeResponseHeaders', () => {
  it('removes hop-by-hop and metadata headers but preserves application data', () => {
    const input: Record<string, string> = {
      Connection: 'keep-alive',
      'Keep-Alive': 'timeout=5',
      'Proxy-Authenticate': 'Basic',
      'proxy-connection': 'keep-alive',
      'Transfer-Encoding': 'chunked',
      Upgrade: 'websocket',
      TE: 'trailers',
      Trailer: 'Expires',
      'Content-Length': '123',
      'Content-Encoding': 'gzip',
      Date: 'Wed, 12 Aug 2026 00:00:00 GMT',
      Server: 'example',
      ETag: 'stale',
      'Last-Modified': 'Wed, 12 Aug 2026 00:00:00 GMT',
      'Set-Cookie': 'session=secret',
      'X-Mock-Id': 'mock-id',
      'x-mock-source': 'static',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Trace-Id': 'trace-id',
    }

    expect(sanitizeResponseHeaders(input)).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Trace-Id': 'trace-id',
    })
  })

  it('removes headers listed in the Connection header value', () => {
    const input: Record<string, string> = {
      Connection: 'X-Custom-Hop, X-Another-Hop',
      'X-Custom-Hop': 'should-go',
      'X-Another-Hop': 'should-go',
      'X-Keep': 'should-stay',
    }

    expect(sanitizeResponseHeaders(input)).toEqual({ 'X-Keep': 'should-stay' })
  })

  it('exposes the blocked header list for shared reuse', () => {
    expect(BLOCKED_RESPONSE_HEADERS['x-mock-id']).toBe(true)
    expect(BLOCKED_RESPONSE_HEADERS['x-mock-source']).toBe(true)
    expect(BLOCKED_RESPONSE_HEADERS.connection).toBe(true)
  })
})
