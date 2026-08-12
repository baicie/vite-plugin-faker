import { describe, expect, it } from 'vitest'
import type { RequestRecord } from '@baicie/faker-shared'
import {
  createTrafficRuleDraft,
  formatDuration,
  formatTrafficValue,
  getRequestPathname,
} from '../src/app/traffic-utils'

describe('traffic utilities', function () {
  it('creates a static rule draft from the request pathname', function () {
    const record: RequestRecord = {
      url: 'https://example.test/api/users?limit=10#results',
      method: 'post',
      headers: {},
      response: {
        statusCode: 201,
        headers: { 'content-type': 'application/json' },
        body: { created: true },
      },
      timestamp: 1,
    }

    expect(createTrafficRuleDraft(record)).toEqual({
      url: '/api/users',
      method: 'POST',
      enabled: true,
      type: 'static',
      response: {
        status: 201,
        headers: { 'content-type': 'application/json' },
        body: { created: true },
        delay: 0,
      },
    })
  })

  it('normalizes relative and malformed request URLs to pathname rules', function () {
    expect(getRequestPathname('/api/search?q=zeus')).toBe('/api/search')
    expect(getRequestPathname('api/search?q=zeus')).toBe('/api/search')
    expect(getRequestPathname('://broken?debug=true')).toBe('/://broken')
  })

  it('uses a usable response when a record has no response', function () {
    const record: RequestRecord = {
      url: '/api/pending?attempt=1',
      method: '',
      headers: {},
      timestamp: 1,
    }

    expect(createTrafficRuleDraft(record)).toEqual({
      url: '/api/pending',
      method: 'GET',
      enabled: true,
      type: 'static',
      response: {
        status: 200,
        headers: {},
        body: {},
        delay: 0,
      },
    })
  })

  it('creates exact query and body conditions from captured request data', function () {
    const record: RequestRecord = {
      url: '/api/users?tenant=acme&tag=core&tag=ui',
      method: 'post',
      headers: {},
      query: {
        tenant: 'acme',
        tag: ['core', 'ui'],
      },
      body: {
        role: 'admin',
        active: true,
      },
      timestamp: 1,
    }

    expect(createTrafficRuleDraft(record).matchRule).toEqual({
      query: [
        { key: 'tenant', operator: 'equals', value: 'acme' },
        { key: 'tag', operator: 'equals', value: ['core', 'ui'] },
      ],
      body: {
        path: '',
        operator: 'equals',
        value: '{"role":"admin","active":true}',
      },
    })
  })

  it('does not create an empty match rule without meaningful request data', function () {
    const record: RequestRecord = {
      url: '/api/empty',
      method: 'post',
      headers: {},
      query: {},
      body: '',
      timestamp: 1,
    }

    expect(createTrafficRuleDraft(record)).not.toHaveProperty('matchRule')
  })

  it('removes stale transport and mock metadata from response headers', function () {
    const record: RequestRecord = {
      url: '/api/users',
      method: 'get',
      headers: {},
      response: {
        statusCode: 200,
        headers: {
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
        },
        body: { ok: true },
      },
      timestamp: 1,
    }

    expect(createTrafficRuleDraft(record).response.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Trace-Id': 'trace-id',
    })
  })

  it('formats structured, empty, and circular detail values', function () {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(formatTrafficValue({ ok: true })).toBe('{\n  "ok": true\n}')
    expect(formatTrafficValue('plain text')).toBe('plain text')
    expect(formatTrafficValue(null)).toBe('No data')
    expect(formatTrafficValue(undefined)).toBe('No data')
    expect(formatTrafficValue(circular)).toBe('[object Object]')
  })

  it('formats durations without hiding zero or invalid values', function () {
    expect(formatDuration(0)).toBe('0 ms')
    expect(formatDuration(42.6)).toBe('43 ms')
    expect(formatDuration(1250)).toBe('1.25 s')
    expect(formatDuration(undefined)).toBe('-')
    expect(formatDuration(Number.NaN)).toBe('-')
  })
})
