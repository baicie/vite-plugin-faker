import {
  type RequestRecord,
  type WSClient,
  WSMessageType,
} from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import {
  getMockResponseMarker,
  getRequestLocation,
  parseXHRRequestBody,
  readXHRResponseBody,
} from '../request-record'

interface HackXMLHttpRequest extends XMLHttpRequest {
  _url: string
  _method: string
  _requestHeaders: Record<string, string>
  _requestBody?: unknown
  _startTime: number
}

export class XHRInterceptor {
  private wsClient: WSClient
  private OriginalXHR: typeof XMLHttpRequest

  constructor(wsClient: WSClient) {
    this.wsClient = wsClient
    this.OriginalXHR = window.XMLHttpRequest
    this.setup()
  }

  /**
   * 设置拦截
   */
  private setup(): void {
    const self = this

    window.XMLHttpRequest = class extends self.OriginalXHR {
      // @ts-expect-error
      private _url: string = ''
      // @ts-expect-error
      private _method: string = 'GET'
      private _requestHeaders: Record<string, string> = {}
      _requestBody?: unknown
      private _startTime: number = 0

      open(
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null,
      ): void {
        super.open(
          method,
          url,
          typeof async === 'boolean' ? async : true,
          username,
          password,
        )
        this._method = method
        this._url = typeof url === 'string' ? url : url.toString()
        this._requestHeaders = {}
        this._requestBody = undefined
      }

      setRequestHeader(header: string, value: string): void {
        this._requestHeaders[header] = value
        return super.setRequestHeader(header, value)
      }

      send(body?: Document | XMLHttpRequestBodyInit | null): void {
        this._requestBody = parseXHRRequestBody(body)
        this._startTime = Date.now()
        const xhr = this
        const handleLoadEnd = function () {
          self.recordXHRRequest(
            xhr as unknown as HackXMLHttpRequest,
            Date.now() - xhr._startTime,
          )
        }
        this.addEventListener('loadend', handleLoadEnd, { once: true })
        try {
          super.send(body)
        } catch (error) {
          this.removeEventListener('loadend', handleLoadEnd)
          throw error
        }
      }
    } as any
  }

  private recordXHRRequest(xhr: HackXMLHttpRequest, duration: number): void {
    try {
      const location = getRequestLocation(xhr._url)
      const responseHeaders = this.getResponseHeaders(xhr)
      const marker = getMockResponseMarker(responseHeaders)

      const record: RequestRecord = {
        url: location.url,
        method: xhr._method,
        headers: xhr._requestHeaders,
        query: location.query,
        body: xhr._requestBody,
        response: {
          statusCode: xhr.status,
          headers: responseHeaders,
          body: readXHRResponseBody(xhr),
        },
        duration,
        isMocked: marker.isMocked,
        mockId: marker.mockId,
        timestamp: Date.now(),
      }
      this.sendRequestRecord(record)
    } catch (error) {
      // 静默失败
      logger.error('记录 XHR 请求失败:', error)
    }
  }

  /**
   * 从 XHR 对象中提取响应头
   */
  private getResponseHeaders(xhr: XMLHttpRequest): Record<string, string> {
    const headers: Record<string, string> = {}
    const headerLines = xhr.getAllResponseHeaders().split('\r\n')

    for (const line of headerLines) {
      if (!line) continue
      const [key, ...valueParts] = line.split(':')
      if (key) {
        headers[key.toLowerCase()] = valueParts.join(':').trim()
      }
    }

    return headers
  }

  private sendRequestRecord(record: RequestRecord): void {
    this.wsClient.send(WSMessageType.REQUEST_RECORDED, record)
  }
}
