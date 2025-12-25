import {
  type MockConfig,
  type RequestRecord,
  type WSClient,
  WSMessageType,
} from '@baicie/faker-shared'
import { logger } from '@baicie/logger'

export class FetchInterceptor {
  private mocks: MockConfig[] = []
  private wsClient: WSClient
  private originalFetch: typeof fetch

  constructor(wsClient: WSClient) {
    this.wsClient = wsClient
    this.originalFetch = window.fetch
    this.setup()
  }

  private setup(): void {
    const self = this

    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const request = new Request(input, init)
      const startTime = Date.now()

      try {
        const response = await self.originalFetch(input, init)
        const duration = Date.now() - startTime

        self
          .recordRequest(request, null, response, duration, false)
          .catch(() => {})

        return response
      } catch (error) {
        const duration = Date.now() - startTime
        self.recordRequestError(request, error, duration).catch(() => {})
        throw error
      }
    }
  }

  private async recordRequest(
    request: Request,
    mock: MockConfig | null,
    response: Response,
    duration: number,
    isMocked: boolean,
  ): Promise<void> {
    try {
      const url = new URL(request.url, window.location.origin)
      let responseBody: any = null

      try {
        const text = await response.clone().text()
        if (text) {
          try {
            responseBody = JSON.parse(text)
          } catch {
            responseBody = text
          }
        }
      } catch {
        // 忽略错误
      }

      const record: RequestRecord = {
        url: request.url,
        method: request.method,
        headers: this.headersToObject(request.headers),
        query: Object.fromEntries(url.searchParams.entries()),
        response: {
          statusCode: response.status,
          headers: this.headersToObject(response.headers),
          body: responseBody,
        },
        duration,
        isMocked,
        mockId: mock?.id,
        timestamp: Date.now(),
      }

      // 通过 WebSocket 发送记录
      this.sendRequestRecord(record)
    } catch (error) {
      // 静默失败，不影响正常请求
      logger.error('记录请求失败:', error)
    }
  }

  /**
   * 记录请求错误
   */
  private async recordRequestError(
    request: Request,
    error: any,
    duration: number,
  ): Promise<void> {
    try {
      const record: RequestRecord = {
        url: request.url,
        method: request.method,
        headers: this.headersToObject(request.headers),
        response: {
          statusCode: 0,
          headers: {},
          body: { error: error?.message || 'Request failed' },
        },
        duration,
        isMocked: false,
        timestamp: Date.now(),
      }

      this.sendRequestRecord(record)
    } catch {
      // 静默失败
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
    logger.info(`Mock 配置已更新: ${this.mocks.length} 个`)
  }

  /**
   * 将 Headers 转换为普通对象
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }
}
