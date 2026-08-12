import type { IncomingMessage, ServerResponse } from 'node:http'
import { PassThrough } from 'node:stream'
import type {
  FunctionMockConfig,
  MockContext,
  MockRequestMatchParams,
  StaticMockConfig,
} from '@baicie/faker-shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MocksDB } from '../../faker-core/src/db/mock'

const mocks = vi.hoisted(function () {
  return {
    findMock: vi.fn(),
    findMockAdvanced: vi.fn(),
  }
})

vi.mock('../src/index', function () {
  return {
    dbManager: {
      getMocksDB: function () {
        return mocks
      },
    },
  }
})

import { mockMiddleware } from '../src/middlewares/mock'

function createRequest(
  body: string,
  method: string = 'POST',
  url: string = '/api/users',
): IncomingMessage {
  const request = new PassThrough() as unknown as IncomingMessage
  request.url = url
  request.method = method
  request.headers = {
    'content-length': String(Buffer.byteLength(body)),
    'content-type': 'application/json',
  }
  request.end(body)
  return request
}

function createMocksDB(mock: StaticMockConfig): MocksDB {
  const db = Object.create(MocksDB.prototype) as MocksDB
  const data: Record<string, StaticMockConfig> = {}
  data[mock.id || '/api/users-GET'] = mock
  Object.defineProperty(db, 'db', { value: { data } })
  return db
}

function collectBody(request: IncomingMessage): Promise<string> {
  return new Promise(function (resolve, reject) {
    const chunks: Buffer[] = []
    request.on('data', function (chunk: Buffer | string) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    request.once('error', reject)
    request.once('end', function () {
      resolve(Buffer.concat(chunks).toString())
    })
  })
}

describe('mockMiddleware', () => {
  beforeEach(() => {
    mocks.findMock.mockReset()
    mocks.findMockAdvanced.mockReset()
  })

  it('restores an unmatched request body for downstream middleware', async () => {
    const rawBody = JSON.stringify({ name: 'Ada' })
    const request = createRequest(rawBody)
    mocks.findMock.mockReturnValue(undefined)
    mocks.findMockAdvanced.mockReturnValue(undefined)

    const downstreamBody = await new Promise<string>((resolve, reject) => {
      const middleware = mockMiddleware({} as never)
      middleware(request, {} as ServerResponse, function (error?: unknown) {
        if (error) {
          reject(error)
          return
        }

        collectBody(request).then(resolve, reject)
      })
    })

    expect(downstreamBody).toBe(rawBody)
    expect(mocks.findMock).not.toHaveBeenCalled()
    expect(mocks.findMockAdvanced).toHaveBeenCalledOnce()
  })

  it('reuses the parsed query and body for matching and response generation', () => {
    let matchParams: MockRequestMatchParams | undefined
    let generatedContext: MockContext | undefined
    const mock: FunctionMockConfig = {
      id: 'users-post',
      url: '/api/users',
      method: 'POST',
      type: 'function',
      enabled: true,
      handler: function (ctx) {
        generatedContext = ctx
        return { status: 200, body: { ok: true } }
      },
    }
    mocks.findMockAdvanced.mockImplementation(function (params) {
      matchParams = params
      return mock
    })

    return new Promise<void>(function (resolve, reject) {
      const response = {
        statusCode: 0,
        setHeader: vi.fn(),
        end: function () {
          resolve()
          return this
        },
      } as unknown as ServerResponse

      mockMiddleware({} as never)(
        createRequest(
          JSON.stringify({ user: { role: 'admin' } }),
          'POST',
          '/api/users?tenant=zeus',
        ),
        response,
        function (error?: unknown) {
          reject(error || new Error('mock middleware unexpectedly called next'))
        },
      )
    }).then(function () {
      expect(mocks.findMock).not.toHaveBeenCalled()
      expect(matchParams).toBeDefined()
      expect(generatedContext).toBeDefined()
      expect(matchParams!.query).toBe(generatedContext!.query)
      expect(matchParams!.body).toBe(generatedContext!.body)
      expect(matchParams).toMatchObject({
        url: '/api/users?tenant=zeus',
        method: 'POST',
        query: { tenant: 'zeus' },
        body: { user: { role: 'admin' } },
      })
    })
  })

  it('filters unsafe response headers and preserves application headers', async () => {
    const mock: StaticMockConfig = {
      id: 'users-get',
      url: '/api/users',
      method: 'GET',
      type: 'static',
      enabled: true,
      response: {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
          'X-Custom': 'custom-value',
          'Content-Length': '999',
          'Content-Encoding': 'gzip',
          'Transfer-Encoding': 'chunked',
          Connection: 'upgrade',
          'Keep-Alive': 'timeout=5',
          'Proxy-Connection': 'keep-alive',
          'Proxy-Authenticate': 'Basic',
          Upgrade: 'websocket',
          TE: 'trailers',
          Trailer: 'x-checksum',
          'X-Mock-Id': 'forged-id',
          'X-Mock-Source': 'proxy',
        },
        body: 'ok',
      },
    }
    const request = createRequest('', 'GET')
    const headers: Record<string, string | number | readonly string[]> = {}
    mocks.findMockAdvanced.mockReturnValue(mock)

    await new Promise<void>((resolve, reject) => {
      const response = {
        statusCode: 0,
        setHeader: function (
          name: string,
          value: string | number | readonly string[],
        ) {
          headers[name.toLowerCase()] = value
          return this
        },
        end: function () {
          resolve()
          return this
        },
      } as unknown as ServerResponse
      const middleware = mockMiddleware({} as never)

      middleware(request, response, function (error?: unknown) {
        reject(error || new Error('mock middleware unexpectedly called next'))
      })
    })

    expect(headers['content-type']).toBe('text/plain')
    expect(headers['access-control-allow-origin']).toBe('*')
    expect(headers['x-custom']).toBe('custom-value')
    expect(headers['content-length']).toBeUndefined()
    expect(headers['content-encoding']).toBeUndefined()
    expect(headers['transfer-encoding']).toBeUndefined()
    expect(headers.connection).toBeUndefined()
    expect(headers['keep-alive']).toBeUndefined()
    expect(headers['proxy-connection']).toBeUndefined()
    expect(headers['proxy-authenticate']).toBeUndefined()
    expect(headers.upgrade).toBeUndefined()
    expect(headers.te).toBeUndefined()
    expect(headers.trailer).toBeUndefined()
    expect(headers['x-mock-id']).toBe('users-get')
    expect(headers['x-mock-source']).toBe('static')
  })

  it('serves query URLs with authoritative mock markers', () => {
    const mock: StaticMockConfig = {
      id: '/api/users-GET',
      url: '/api/users',
      method: 'GET',
      type: 'static',
      enabled: true,
      response: {
        status: 202,
        headers: {
          'Content-Type': 'application/problem+json',
          'x-mock-id': 'forged-id',
          'x-mock-source': 'forged-source',
        },
        body: { ok: true },
      },
    }
    const db = createMocksDB(mock)
    const headers: Record<string, string | number | readonly string[]> = {}
    let responseBody = ''
    let statusCode = 0
    mocks.findMock.mockImplementation(db.findMock.bind(db))
    mocks.findMockAdvanced.mockImplementation(db.findMockAdvanced.bind(db))

    return new Promise<void>(function (resolve, reject) {
      const response = {
        statusCode,
        setHeader: function (
          name: string,
          value: string | number | readonly string[],
        ) {
          headers[name.toLowerCase()] = value
          return this
        },
        end: function (body: string) {
          responseBody = body
          statusCode = this.statusCode
          resolve()
          return this
        },
      } as unknown as ServerResponse
      mockMiddleware({} as never)(
        createRequest('', 'GET', '/api/users?tenant=zeus'),
        response,
        function (error?: unknown) {
          reject(error || new Error('mock middleware unexpectedly called next'))
        },
      )
    }).then(function () {
      expect(statusCode).toBe(202)
      expect(JSON.parse(responseBody)).toEqual({ ok: true })
      expect(headers['content-type']).toBe('application/problem+json')
      expect(headers['x-mock-id']).toBe('/api/users-GET')
      expect(headers['x-mock-source']).toBe('static')
    })
  })

  it('does not serve disabled rules', () => {
    const mock: StaticMockConfig = {
      id: '/api/users-GET',
      url: '/api/users',
      method: 'GET',
      type: 'static',
      enabled: false,
      response: { status: 200, body: { ok: true } },
    }
    const db = createMocksDB(mock)
    const response = { end: vi.fn() } as unknown as ServerResponse
    mocks.findMock.mockImplementation(db.findMock.bind(db))
    mocks.findMockAdvanced.mockImplementation(db.findMockAdvanced.bind(db))

    return new Promise<void>(function (resolve, reject) {
      mockMiddleware({} as never)(
        createRequest('', 'GET', '/api/users?tenant=zeus'),
        response,
        function (error?: unknown) {
          if (error) {
            reject(error)
            return
          }
          resolve()
        },
      )
    }).then(function () {
      expect(response.end).not.toHaveBeenCalled()
    })
  })

  it('executes persisted function source only when middleware enables it', () => {
    const mock: FunctionMockConfig = {
      id: 'users-get',
      url: '/api/users',
      method: 'GET',
      type: 'function',
      enabled: true,
      handlerSource:
        'function handler(ctx) { return { status: 200, body: { url: ctx.url } }; }',
    }
    mocks.findMockAdvanced.mockReturnValue(mock)

    return new Promise<void>(function (resolve, reject) {
      const response = {
        statusCode: 0,
        setHeader: vi.fn(),
        end: function (body: string) {
          expect(JSON.parse(body)).toEqual({ url: '/api/users' })
          resolve()
          return this
        },
      } as unknown as ServerResponse
      const middleware = mockMiddleware({} as never, {
        allowFunctionHandlerSource: true,
        functionHandlerTimeout: 100,
      })

      middleware(
        createRequest('', 'GET'),
        response,
        function (error?: unknown) {
          reject(error || new Error('mock middleware unexpectedly called next'))
        },
      )
    })
  })

  it('falls back to next() when findMockAdvanced throws', async () => {
    const request = createRequest('', 'GET', '/api/users')
    mocks.findMockAdvanced.mockImplementation(function () {
      throw new Error('matcher down')
    })

    await new Promise<void>(function (resolve, reject) {
      mockMiddleware({} as never)(
        request,
        {
          statusCode: 0,
          setHeader: vi.fn(),
          end: vi.fn(),
        } as unknown as ServerResponse,
        function (error?: unknown) {
          if (error) {
            reject(error)
            return
          }
          resolve()
        },
      )
    })
  })

  it('overrides spoofed X-Mock-* headers from the mock response', async () => {
    const mock: StaticMockConfig = {
      id: 'authoritative-id',
      url: '/api/users',
      method: 'GET',
      type: 'static',
      enabled: true,
      response: {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Mock-Id': 'forged',
          'X-Mock-Source': 'static',
        },
        body: { ok: true },
      },
    }
    const headers: Record<string, string | number | readonly string[]> = {}
    mocks.findMockAdvanced.mockReturnValue(mock)

    await new Promise<void>((resolve, reject) => {
      const response = {
        statusCode: 0,
        setHeader: function (
          name: string,
          value: string | number | readonly string[],
        ) {
          headers[name.toLowerCase()] = value
          return this
        },
        end: function () {
          resolve()
          return this
        },
      } as unknown as ServerResponse
      mockMiddleware({} as never)(
        createRequest('', 'GET'),
        response,
        function (error?: unknown) {
          reject(error || new Error('unexpected next'))
        },
      )
    })

    expect(headers['x-mock-id']).toBe('authoritative-id')
    expect(headers['x-mock-source']).toBe('static')
  })
})
