import {
  type MockConfig,
  type RequestRecord,
  type WSClient,
  WSMessageType,
} from '@baicie/faker-shared'
import { logger } from '@baicie/logger'

interface HackXMLHttpRequest extends XMLHttpRequest {
  _url: string
  _method: string
  _requestHeaders: Record<string, string>
}

export class XHRInterceptor {
  private mocks: MockConfig[] = []
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
      private _startTime: number = 0

      open(
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null,
      ): void {
        this._method = method
        this._url = typeof url === 'string' ? url : url.toString()
        this._requestHeaders = {}
        this._startTime = Date.now()

        return super.open(method, url, async ?? true, username, password)
      }

      setRequestHeader(header: string, value: string): void {
        this._requestHeaders[header] = value
        return super.setRequestHeader(header, value)
      }

      send(body?: Document | XMLHttpRequestBodyInit | null): void {
        this.setupResponseListener()
        super.send(body)
      }

      private setupResponseListener(): void {
        const xhr = this

        const originalOnReadyStateChange = this.onreadystatechange

        this.onreadystatechange = function (event) {
          if (xhr.readyState === 4) {
            const duration = Date.now() - xhr._startTime
            self.recordXHRRequest(
              xhr as unknown as HackXMLHttpRequest,
              xhr.responseText,
              duration,
              false,
            )
          }

          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.call(this, event)
          }
        }
      }
    } as any
  }

  private recordXHRRequest(
    xhr: HackXMLHttpRequest,
    responseBody: string,
    duration: number,
    isMocked: boolean,
  ): void {
    try {
      let body: unknown = null
      try {
        body =
          typeof responseBody === 'string'
            ? JSON.parse(responseBody)
            : responseBody
      } catch {
        body = responseBody
      }

      const url = new URL(xhr._url, window.location.origin)

      // 获取响应头
      const responseHeaders = this.getResponseHeaders(xhr)

      // 检查响应头中的 Mock ID
      let currentMockId: string | undefined
      let currentIsMocked = isMocked
      const headerMockId = responseHeaders['x-mock-id']

      if (headerMockId && headerMockId !== 'unknown') {
        currentMockId = headerMockId
        currentIsMocked = true
      } else {
        // 尝试在现有的 Mock 配置中查找匹配项
        const foundMock = this.mocks.find(
          m =>
            m.url === url.pathname &&
            m.method.toUpperCase() === xhr._method.toUpperCase(),
        )
        if (foundMock) {
          currentMockId = foundMock.id
          currentIsMocked = true
        }
      }

      const record: RequestRecord = {
        url: xhr._url,
        method: xhr._method,
        headers: xhr._requestHeaders,
        query: Object.fromEntries(url.searchParams.entries()),
        response: {
          statusCode: xhr.status || 200,
          headers: responseHeaders,
          body,
        },
        duration,
        isMocked: currentIsMocked,
        mockId: currentMockId,
        timestamp: Date.now(),
      }
      // 总是发送请求记录，无论是否是 Mock 请求
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

  private sendRequestRecord(record: RequestRecord) {
    this.wsClient.send(WSMessageType.REQUEST_RECORDED, record)
  }

  /**
   * 更新 Mock 配置
   */
  updateMocks(mocks: MockConfig[]): void {
    this.mocks = mocks
    logger.info(`XHR Mock 配置已更新: ${this.mocks.length} 个`)
  }
}
