import {
  type MockConfig,
  type RequestRecord,
  type WSClient,
  WSMessageType,
} from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import { MockMatcher } from '../mock/mock-matcher'
import { MockResponseGenerator } from '../mock/mock-response-generator'

/**
 * XMLHttpRequest 拦截器
 */
export class XHRInterceptor {
  private mocks: MockConfig[] = []
  private responseGenerator: MockResponseGenerator
  private wsClient: WSClient
  private OriginalXHR: typeof XMLHttpRequest

  constructor(wsClient: WSClient) {
    this.responseGenerator = new MockResponseGenerator()
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
      private _url: string = ''
      private _method: string = 'GET'
      private _mock: MockConfig | null = null
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

        // 检查是否有 Mock
        const pathname = new URL(this._url, window.location.origin).pathname
        this._mock = MockMatcher.findMock(self.mocks, pathname, this._method)

        return super.open(method, url, async ?? true, username, password)
      }

      send(body?: Document | XMLHttpRequestBodyInit | null): void {
        if (this._mock) {
          // 有 Mock，生成响应
          this.handleMockResponse(this._mock, body).catch(error => {
            logger.error('XHR Mock 响应失败:', error)
            // 失败时继续正常请求
            super.send(body)
          })
        } else {
          // 没有 Mock，继续正常请求
          // 监听响应以记录请求
          this.setupResponseListener()
          super.send(body)
        }
      }

      /**
       * 处理 Mock 响应
       */
      private async handleMockResponse(
        mock: MockConfig,
        body: any,
      ): Promise<void> {
        // 添加延迟
        if (mock.delay && mock.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, mock.delay))
        }

        // 构建请求信息
        const requestInfo = {
          url: this._url,
          method: this._method,
          pathname: new URL(this._url, window.location.origin).pathname,
          headers: {},
          body: body
            ? typeof body === 'string'
              ? JSON.parse(body)
              : body
            : null,
        }

        // 生成响应数据
        const responseData = self.responseGenerator.generateResponseData(
          mock,
          requestInfo,
        )

        const responseText = JSON.stringify(responseData)
        const duration = Date.now() - this._startTime

        // 模拟 XHR 响应
        Object.defineProperty(this, 'status', {
          value: mock.statusCode || 200,
          writable: false,
          configurable: true,
        })

        Object.defineProperty(this, 'statusText', {
          value: 'OK',
          writable: false,
          configurable: true,
        })

        Object.defineProperty(this, 'responseText', {
          value: responseText,
          writable: false,
          configurable: true,
        })

        Object.defineProperty(this, 'response', {
          value: responseText,
          writable: false,
          configurable: true,
        })

        Object.defineProperty(this, 'readyState', {
          value: 4, // DONE
          writable: false,
          configurable: true,
        })

        // 设置响应头
        const responseHeaders = self.responseGenerator.getResponseHeaders(mock)
        const headers = new Headers(responseHeaders)

        Object.defineProperty(this, 'getResponseHeader', {
          value: (name: string) => headers.get(name),
          writable: false,
          configurable: true,
        })

        Object.defineProperty(this, 'getAllResponseHeaders', {
          value: () => {
            const headerStrings: string[] = []
            headers.forEach((value, key) => {
              headerStrings.push(`${key}: ${value}`)
            })
            return headerStrings.join('\r\n')
          },
          writable: false,
          configurable: true,
        })

        // 触发事件
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange') as any)
        }
        if (this.onload) {
          this.onload(new Event('load') as any)
        }

        // 记录请求
        self.recordXHRRequest(this, mock, responseData, duration, true)
      }

      private setupResponseListener(): void {
        const xhr = this

        const originalOnReadyStateChange = this.onreadystatechange

        this.onreadystatechange = function (event) {
          if (xhr.readyState === 4) {
            const duration = Date.now() - xhr._startTime
            self.recordXHRRequest(xhr, null, xhr.responseText, duration, false)
          }

          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.call(this, event)
          }
        }
      }
    } as any
  }

  /**
   * 记录 XHR 请求
   */
  private recordXHRRequest(
    xhr: any,
    mock: MockConfig | null,
    responseBody: any,
    duration: number,
    isMocked: boolean,
  ): void {
    try {
      let body: any = null
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
