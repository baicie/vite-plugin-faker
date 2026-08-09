import type { IncomingMessage, ServerResponse } from 'node:http'
import { PassThrough } from 'node:stream'
import type { StaticMockConfig } from '@baicie/faker-shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

function createRequest(body: string, method: string = 'POST'): IncomingMessage {
  const request = new PassThrough() as unknown as IncomingMessage
  request.url = '/api/users'
  request.method = method
  request.headers = {
    'content-length': String(Buffer.byteLength(body)),
    'content-type': 'application/json',
  }
  request.end(body)
  return request
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
})
