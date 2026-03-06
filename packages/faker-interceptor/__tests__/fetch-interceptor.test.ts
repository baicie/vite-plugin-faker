import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FetchInterceptor } from '../src/hack/fetch-interceptor'
import { WSMessageType } from '@baicie/faker-shared'

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
    const interceptor = new FetchInterceptor(wsClient as any)
    expect(window.fetch).not.toBe(originalFetch)
  })

  it('发出请求后通过 WS 上报记录', async () => {
    new FetchInterceptor(wsClient as any)

    await window.fetch('http://localhost/api/test', { method: 'GET' })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wsClient.send).toHaveBeenCalledWith(
      WSMessageType.REQUEST_RECORDED,
      expect.objectContaining({
        method: 'GET',
        isMocked: false,
      }),
    )
  })

  it('updateMocks 更新 Mock 配置列表', () => {
    const interceptor = new FetchInterceptor(wsClient as any)
    const mocks = [
      {
        id: 'mock-1',
        url: '/api/test',
        method: 'GET',
        type: 'static' as const,
        enabled: true,
        response: { status: 200, body: {} },
      },
    ]
    interceptor.updateMocks(mocks)
    expect(interceptor['mocks']).toHaveLength(1)
  })

  it('请求失败时通过 WS 上报错误记录', async () => {
    window.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))
    new FetchInterceptor(wsClient as any)

    try {
      await window.fetch('http://localhost/api/fail', { method: 'POST' })
    } catch {
      // expected
    }

    await new Promise(resolve => setTimeout(resolve, 50))

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
