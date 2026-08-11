import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FetchInterceptor } from '../src/hack/fetch-interceptor'
import { type WSClient, WSMessageType } from '@baicie/faker-shared'

function createMockWSClient() {
  return {
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    close: vi.fn(),
  }
}

describe('FetchInterceptor', () => {
  let originalFetch: typeof fetch
  let wsClient: ReturnType<typeof createMockWSClient>

  beforeEach(() => {
    originalFetch = window.fetch
    wsClient = createMockWSClient()

    window.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  afterEach(() => {
    window.fetch = originalFetch
  })

  it('拦截 fetch 后，window.fetch 被替换', () => {
    const interceptor = new FetchInterceptor(wsClient as unknown as WSClient)
    expect(window.fetch).not.toBe(originalFetch)
  })

  it('records a normalized URL, query and request body', () => {
    new FetchInterceptor(wsClient as unknown as WSClient)

    return window
      .fetch(window.location.origin + '/api/test?mode=preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ada' }),
      })
      .then(() => new Promise(resolve => setTimeout(resolve, 0)))
      .then(() => {
        expect(wsClient.send).toHaveBeenCalledWith(
          WSMessageType.REQUEST_RECORDED,
          expect.objectContaining({
            url: '/api/test?mode=preview',
            method: 'POST',
            query: { mode: 'preview' },
            body: { name: 'Ada' },
            isMocked: false,
          }),
        )
      })
  })

  it('forwards a usable Request instance without consuming its body', () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}'))
    window.fetch = fetchSpy
    new FetchInterceptor(wsClient as unknown as WSClient)

    const request = new Request('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ada' }),
    })

    return window
      .fetch(request)
      .then(() => {
        const forwardedRequest = fetchSpy.mock.calls[0]![0] as Request
        expect(forwardedRequest).not.toBe(request)
        return forwardedRequest.text()
      })
      .then(body => {
        expect(body).toBe(JSON.stringify({ name: 'Ada' }))
        expect(request.bodyUsed).toBe(true)
      })
  })

  it('keeps invalid request construction on the Promise rejection path', () => {
    new FetchInterceptor(wsClient as unknown as WSClient)
    let result: Promise<Response> | undefined

    expect(() => {
      result = window.fetch('http://localhost/api/users', {
        method: 'GET',
        body: 'not allowed',
      })
    }).not.toThrow()

    return expect(result).rejects.toThrow(TypeError)
  })

  it('uses the response marker as the only source of mock truth', () => {
    window.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ mocked: true }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'X-Mock-Id': 'users-post',
          'X-Mock-Source': 'static',
        },
      }),
    )
    new FetchInterceptor(wsClient as unknown as WSClient)

    return window
      .fetch('http://localhost/api/users', { method: 'POST' })
      .then(() => new Promise(resolve => setTimeout(resolve, 0)))
      .then(() => {
        expect(wsClient.send).toHaveBeenCalledWith(
          WSMessageType.REQUEST_RECORDED,
          expect.objectContaining({
            isMocked: true,
            mockId: 'users-post',
            response: expect.objectContaining({ statusCode: 201 }),
          }),
        )
      })
  })

  it('请求失败时通过 WS 上报错误记录', () => {
    window.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))
    new FetchInterceptor(wsClient as unknown as WSClient)

    return window
      .fetch('http://localhost/api/fail', { method: 'POST' })
      .catch(() => undefined)
      .then(() => new Promise(resolve => setTimeout(resolve, 0)))
      .then(() => {
        expect(wsClient.send).toHaveBeenCalledWith(
          WSMessageType.REQUEST_RECORDED,
          expect.objectContaining({
            method: 'POST',
            response: expect.objectContaining({
              statusCode: 0,
            }),
          }),
        )
      })
  })
})
