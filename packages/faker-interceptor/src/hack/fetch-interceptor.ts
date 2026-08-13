import {
  type RequestRecord,
  type WSClient,
  WSMessageType,
} from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import {
  getMockResponseMarker,
  getRequestLocation,
  headersToObject,
  readRequestBody,
  readResponseBody,
} from '../request-record'

export class FetchInterceptor {
  private wsClient: WSClient
  private originalFetch: typeof fetch

  constructor(wsClient: WSClient) {
    this.wsClient = wsClient
    this.originalFetch = window.fetch
    this.setup()
  }

  private setup(): void {
    const self = this

    window.fetch = function (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      let request: Request
      let recordRequest: Request
      try {
        request = new Request(input, init)
        recordRequest = request.clone()
      } catch (error) {
        return Promise.reject(error)
      }
      const startTime = Date.now()

      return self.originalFetch.call(window, request).then(
        function (response) {
          const duration = Date.now() - startTime
          self
            .recordRequest(recordRequest, response, duration)
            .catch(function () {})
          return response
        },
        function (error: unknown) {
          const duration = Date.now() - startTime
          self
            .recordRequestError(recordRequest, error, duration)
            .catch(function () {})
          throw error
        },
      )
    }
  }

  private recordRequest(
    request: Request,
    response: Response,
    duration: number,
  ): Promise<void> {
    const location = getRequestLocation(request.url)
    const responseHeaders = headersToObject(response.headers)
    const marker = getMockResponseMarker(responseHeaders)

    return Promise.all([readRequestBody(request), readResponseBody(response)])
      .then(([requestBody, responseBody]) => {
        const record: RequestRecord = {
          url: location.url,
          method: request.method,
          headers: headersToObject(request.headers),
          query: location.query,
          body: requestBody,
          response: {
            statusCode: response.status,
            headers: responseHeaders,
            body: responseBody,
          },
          duration,
          isMocked: marker.isMocked,
          mockId: marker.mockId,
          mockSource: marker.mockSource,
          timestamp: Date.now(),
        }

        this.sendRequestRecord(record)
      })
      .catch(function (error: unknown) {
        logger.error('记录请求失败:', error)
      })
  }

  /**
   * 记录请求错误
   */
  private recordRequestError(
    request: Request,
    error: unknown,
    duration: number,
  ): Promise<void> {
    const location = getRequestLocation(request.url)
    return readRequestBody(request).then(
      requestBody => {
        const record: RequestRecord = {
          url: location.url,
          method: request.method,
          headers: headersToObject(request.headers),
          query: location.query,
          body: requestBody,
          response: {
            statusCode: 0,
            headers: {},
            body: {
              error: error instanceof Error ? error.message : 'Request failed',
            },
          },
          duration,
          isMocked: false,
          timestamp: Date.now(),
        }

        this.sendRequestRecord(record)
      },
      function () {},
    )
  }

  private sendRequestRecord(record: RequestRecord): void {
    this.wsClient.send(WSMessageType.REQUEST_RECORDED, record)
  }
}
