import type { MockConfig, RequestRecord } from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared'
import { type HttpHandler, HttpResponse, http } from 'msw'
import { logger } from '@baicie/logger'
import { MockResponseGenerator } from './mock-response-generator'

/**
 * MSW 适配器
 * 将 MockConfig 转换为 MSW handlers
 */
export class MSWAdapter {
  private responseGenerator: MockResponseGenerator
  private wsClient: any
  private handlers: HttpHandler[] = []

  constructor(wsClient: any) {
    this.responseGenerator = new MockResponseGenerator()
    this.wsClient = wsClient
  }

  /**
   * 将 MockConfig 转换为 MSW handler
   */
  createHandler(mock: MockConfig): HttpHandler {
    const method = mock.method.toUpperCase() as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'DELETE'
      | 'PATCH'
      | 'HEAD'
      | 'OPTIONS'

    return http[method.toLowerCase() as keyof typeof http](
      mock.url,
      async ({ request }) => {
        const startTime = Date.now()

        try {
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
          const responseHeaders =
            this.responseGenerator.getResponseHeaders(mock)

          const duration = Date.now() - startTime

          // 记录请求
          this.recordRequest(request, mock, responseData, duration, true).catch(
            () => {},
          )

          return HttpResponse.json(responseData, {
            status: mock.statusCode || 200,
            headers: responseHeaders,
          })
        } catch (error) {
          logger.error('生成 Mock 响应失败:', error)
          const duration = Date.now() - startTime
          this.recordRequestError(request, error, duration).catch(() => {})
          throw error
        }
      },
    )
  }

  /**
   * 更新所有 handlers
   */
  updateHandlers(mocks: MockConfig[]): HttpHandler[] {
    this.handlers = mocks
      .filter(m => m.enabled)
      .map(mock => this.createHandler(mock))

    logger.info(`MSW handlers 已更新: ${this.handlers.length} 个`)
    return this.handlers
  }

  /**
   * 获取所有 handlers
   */
  getHandlers(): HttpHandler[] {
    return this.handlers
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
    responseData: any,
    duration: number,
    isMocked: boolean,
  ): Promise<void> {
    try {
      const url = new URL(request.url, window.location.origin)

      const record: RequestRecord = {
        url: request.url,
        method: request.method,
        headers: this.headersToObject(request.headers),
        query: Object.fromEntries(url.searchParams.entries()),
        response: {
          statusCode: mock?.statusCode || 200,
          headers: mock?.headers || { 'Content-Type': 'application/json' },
          body: responseData,
        },
        duration,
        isMocked,
        mockId: mock?.id,
        timestamp: Date.now(),
      }

      // 通过 WebSocket 发送记录
      if (this.wsClient) {
        this.wsClient.send(WSMessageType.REQUEST_RECORDED, record)
      }
    } catch (error) {
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

      if (this.wsClient) {
        this.wsClient.send(WSMessageType.REQUEST_RECORDED, record)
      }
    } catch {
      // 静默失败
    }
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
