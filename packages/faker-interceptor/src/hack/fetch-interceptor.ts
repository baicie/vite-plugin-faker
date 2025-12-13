import type { MockConfig, RequestRecord } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import { MockMatcher } from '../mock/mock-matcher'
import { MockResponseGenerator } from '../mock/mock-response-generator'
import type { WSClient } from '../ws-client'

/**
 * Fetch 拦截器
 */
export class FetchInterceptor {
  private mocks: MockConfig[] = []
  private responseGenerator: MockResponseGenerator
  private wsClient: WSClient
  private originalFetch: typeof fetch

  constructor(wsClient: WSClient) {
    this.responseGenerator = new MockResponseGenerator()
    this.wsClient = wsClient
    this.originalFetch = window.fetch
    this.setup()
  }

  /**
   * 设置拦截
   */
  private setup(): void {
    const self = this

    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const request = new Request(input, init)
      const url = new URL(request.url, window.location.origin)
      const pathname = url.pathname
      const method = request.method || 'GET'
      const startTime = Date.now()

      // 查找匹配的 Mock
      const mock = MockMatcher.findMock(self.mocks, pathname, method)

      if (mock) {
        logger.info(`拦截请求: ${method} ${pathname}`, mock)

        try {
          // 生成 Mock 响应
          const response = await self.generateMockResponse(mock, request)
          const duration = Date.now() - startTime

          // 记录请求
          self.recordRequest(request, mock, response, duration, true)

          return response
        } catch (error) {
          logger.error('生成 Mock 响应失败:', error)
          // 失败时继续正常请求
        }
      }

      // 没有 Mock 或生成失败，继续正常请求
      try {
        const response = await self.originalFetch(input, init)
        const duration = Date.now() - startTime

        // 记录请求（异步，不阻塞）
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

  /**
   * 生成 Mock 响应
   */
  private async generateMockResponse(
    mock: MockConfig,
    request: Request,
  ): Promise<Response> {
    // 添加延迟
    if (mock.delay && mock.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, mock.delay))
    }

    // 获取请求信息
    const requestInfo = await this.getRequestInfo(request)

    // 生成响应数据
    const responseData = this.responseGenerator.generateResponseData(
      mock,
      requestInfo,
    )

    // 获取响应头
    const responseHeaders = this.responseGenerator.getResponseHeaders(mock)
    const headers = new Headers(responseHeaders)

    return new Response(JSON.stringify(responseData), {
      status: mock.statusCode || 200,
      statusText: 'OK',
      headers,
    })
  }

  /**
   * 获取请求信息
   */
  private async getRequestInfo(request: Request): Promise<any> {
    let body: any = null

    try {
      const text = await request.clone().text()
      if (text) {
        try {
          body = JSON.parse(text)
        } catch {
          body = text
        }
      }
    } catch {
      // 忽略错误
    }

    const url = new URL(request.url, window.location.origin)

    return {
      url: request.url,
      method: request.method,
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      headers: this.headersToObject(request.headers),
      body,
    }
  }

  /**
   * 记录请求
   */
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
      this.wsClient.sendRequestRecord(record)
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

      this.wsClient.sendRequestRecord(record)
    } catch {
      // 静默失败
    }
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
