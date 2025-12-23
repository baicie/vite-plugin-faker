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
        this._startTime = Date.now()

        return super.open(method, url, async ?? true, username, password)
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
              null,
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
    mock: MockConfig | null,
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

      const record: RequestRecord = {
        url: xhr._url,
        method: xhr._method,
        headers: {},
        query: Object.fromEntries(url.searchParams.entries()),
        response: {
          statusCode: xhr.status || 200,
          headers: {},
          body,
        },
        duration,
        isMocked,
        mockId: mock?.id,
        timestamp: Date.now(),
      }

      this.sendRequestRecord(record)
    } catch (error) {
      // 静默失败
      logger.error('记录 XHR 请求失败:', error)
    }
  }

  private sendRequestRecord(record: RequestRecord) {
    this.wsClient.send(WSMessageType.REQUEST_RECORDED, record)
  }

  /**
   * 更新 Mock 配置
   */
  updateMocks(mocks: MockConfig[]): void {
    this.mocks = mocks.filter(m => m.enabled)
    logger.info(`XHR Mock 配置已更新: ${this.mocks.length} 个`)
  }
}
