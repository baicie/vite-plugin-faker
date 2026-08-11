import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type WSClient, WSMessageType } from '@baicie/faker-shared'
import { XHRInterceptor } from '../src/hack/xhr-interceptor'

function createMockWSClient() {
  return {
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    close: vi.fn(),
  }
}

class FakeXHR extends EventTarget {
  readyState = 0
  status = 0
  responseType: XMLHttpRequestResponseType = ''
  response: unknown = null
  onreadystatechange: ((this: XMLHttpRequest, ev: Event) => unknown) | null =
    null
  private _responseText = ''
  private _headers = ''
  private _openError?: Error
  private _sendError?: Error
  private _deferSend = false

  open(_method: string, _url: string | URL): void {
    if (this._openError) {
      const error = this._openError
      this._openError = undefined
      throw error
    }
    this.readyState = 1
  }

  setRequestHeader(_header: string, _value: string): void {}

  send(_body?: Document | XMLHttpRequestBodyInit | null): void {
    if (this._sendError) {
      const error = this._sendError
      this._sendError = undefined
      throw error
    }
    this.readyState = 4
    if (this._deferSend) {
      this._deferSend = false
      return
    }
    this.complete()
  }

  complete(): void {
    if (this.onreadystatechange) {
      this.onreadystatechange.call(
        this as unknown as XMLHttpRequest,
        new Event('readystatechange'),
      )
    }
    this.dispatchEvent(new Event('loadend'))
  }

  deferNextSend(): void {
    this._deferSend = true
  }

  failNextOpen(error: Error): void {
    this._openError = error
  }

  failNextSend(error: Error): void {
    this._sendError = error
  }

  get responseText(): string {
    if (this.responseType && this.responseType !== 'text') {
      throw new DOMException('responseText is unavailable')
    }
    return this._responseText
  }

  getAllResponseHeaders(): string {
    return this._headers
  }

  configure(options: {
    status: number
    responseType?: XMLHttpRequestResponseType
    response?: unknown
    responseText?: string
    headers?: string
  }): void {
    this.status = options.status
    this.responseType = options.responseType || ''
    this.response = options.response
    this._responseText = options.responseText || ''
    this._headers = options.headers || ''
  }
}

describe('XHRInterceptor', () => {
  let originalXHR: typeof XMLHttpRequest
  let wsClient: ReturnType<typeof createMockWSClient>

  beforeEach(() => {
    originalXHR = window.XMLHttpRequest
    window.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest
    wsClient = createMockWSClient()
  })

  afterEach(() => {
    window.XMLHttpRequest = originalXHR
  })

  it('records request bodies without replacing business callbacks', () => {
    new XHRInterceptor(wsClient as unknown as WSClient)
    const xhr = new window.XMLHttpRequest()
    const callback = vi.fn()
    xhr.open('POST', '/api/users?mode=preview')
    xhr.onreadystatechange = callback
    ;(xhr as unknown as FakeXHR).configure({
      status: 200,
      responseText: JSON.stringify({ ok: true }),
      headers: 'content-type: application/json\r\nx-mock-id: users-post\r\n',
    })
    xhr.send(JSON.stringify({ name: 'Ada' }))

    expect(callback).toHaveBeenCalledOnce()
    expect(wsClient.send).toHaveBeenCalledOnce()
    expect(wsClient.send).toHaveBeenCalledWith(
      WSMessageType.REQUEST_RECORDED,
      expect.objectContaining({
        url: '/api/users?mode=preview',
        query: { mode: 'preview' },
        body: { name: 'Ada' },
        isMocked: true,
        mockId: 'users-post',
      }),
    )
  })

  it('preserves status zero and reads non-text responses safely', () => {
    new XHRInterceptor(wsClient as unknown as WSClient)
    const xhr = new window.XMLHttpRequest()
    xhr.open('GET', '/api/failure')
    ;(xhr as unknown as FakeXHR).configure({
      status: 0,
      responseType: 'json',
      response: { error: 'offline' },
    })
    xhr.send()

    expect(wsClient.send).toHaveBeenCalledWith(
      WSMessageType.REQUEST_RECORDED,
      expect.objectContaining({
        response: {
          statusCode: 0,
          headers: {},
          body: { error: 'offline' },
        },
      }),
    )
  })

  it('records one event for every send when an instance is reused', () => {
    new XHRInterceptor(wsClient as unknown as WSClient)
    const xhr = new window.XMLHttpRequest()

    xhr.open('GET', '/api/first')
    ;(xhr as unknown as FakeXHR).configure({ status: 200, responseText: '{}' })
    xhr.send()
    xhr.open('GET', '/api/second')
    ;(xhr as unknown as FakeXHR).configure({ status: 200, responseText: '{}' })
    xhr.send()

    expect(wsClient.send).toHaveBeenCalledTimes(2)
  })

  it('removes the pending listener when send throws synchronously', () => {
    new XHRInterceptor(wsClient as unknown as WSClient)
    const xhr = new window.XMLHttpRequest()
    const fakeXHR = xhr as unknown as FakeXHR

    xhr.open('GET', '/api/failure')
    fakeXHR.failNextSend(new Error('send failed'))
    expect(function () {
      xhr.send()
    }).toThrow('send failed')

    xhr.open('GET', '/api/retry')
    fakeXHR.configure({ status: 200, responseText: '{}' })
    xhr.send()

    expect(wsClient.send).toHaveBeenCalledOnce()
    expect(wsClient.send).toHaveBeenCalledWith(
      WSMessageType.REQUEST_RECORDED,
      expect.objectContaining({ url: '/api/retry' }),
    )
  })

  it('keeps active request metadata when reopening throws', () => {
    new XHRInterceptor(wsClient as unknown as WSClient)
    const xhr = new window.XMLHttpRequest()
    const fakeXHR = xhr as unknown as FakeXHR

    xhr.open('GET', '/api/active')
    fakeXHR.configure({ status: 200, responseText: '{}' })
    fakeXHR.deferNextSend()
    xhr.send()

    fakeXHR.failNextOpen(new Error('open failed'))
    expect(function () {
      xhr.open('GET', '/api/replacement')
    }).toThrow('open failed')
    fakeXHR.complete()

    expect(wsClient.send).toHaveBeenCalledOnce()
    expect(wsClient.send).toHaveBeenCalledWith(
      WSMessageType.REQUEST_RECORDED,
      expect.objectContaining({ url: '/api/active' }),
    )
  })
})
