import type { IncomingMessage, ServerResponse } from 'node:http'
import { PassThrough } from 'node:stream'
import type { FunctionMockConfig, StaticMockConfig } from '@baicie/faker-shared'
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
  })

  it('preserves custom response headers', async () => {
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
          'X-Custom': 'custom-value',
        },
        body: 'ok',
      },
    }
    const request = createRequest('', 'GET')
    const headers: Record<string, string | number | readonly string[]> = {}
    mocks.findMock.mockReturnValue(mock)

    await new Promise<void>((resolve, reject) => {
      const response = {
        statusCode: 0,
        setHeader: function (
          name: string,
          value: string | number | readonly string[],
        ) {
          headers[name] = value
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

    expect(headers['Content-Type']).toBe('text/plain')
    expect(headers['X-Custom']).toBe('custom-value')
    expect(headers['X-Mock-Id']).toBe('users-get')
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
    mocks.findMock.mockReturnValue(mock)

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
})
