import { logger } from '@baicie/faker-shared'

// 请求拦截器类
export class RequestInterceptor {
  private mockStorage: any[] = []
  private pendingRequests = new Map<
    string,
    { resolve: Function; reject: Function }
  >()

  constructor() {
    this.setupRequestInterceptor()
    this.setupHotModuleReplacement()
    this.requestMockConfig()
  }

  // 设置 HMR 通信
  private setupHotModuleReplacement() {
    if (import.meta.hot) {
      // 监听来自 vite 插件的消息
      import.meta.hot.on('faker:mock-config', data => {
        this.mockStorage = data || []
        logger.info('🎭 Mock config updated via HMR:', this.mockStorage)
      })

      import.meta.hot.on('faker:mock-response', data => {
        this.handleMockResponse(data)
      })
    }
  }

  // 通过 HMR 请求 mock 配置
  private requestMockConfig() {
    if (import.meta.hot) {
      import.meta.hot.send('faker:get-mock-config', {
        page: 1,
        pageSize: 1000,
      })
    }
  }

  // 处理 mock 响应
  private handleMockResponse(data: any) {
    const pending = this.pendingRequests.get(data.requestId)
    if (pending) {
      this.pendingRequests.delete(data.requestId)
      pending.resolve(data.response)
    }
  }

  // 发送请求到 mock 服务
  private sendRequestToMock(requestData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (import.meta.hot) {
        const requestId = Math.random().toString(36).substr(2, 9)

        this.pendingRequests.set(requestId, { resolve, reject })

        import.meta.hot.send('faker:mock-request', {
          requestId,
          ...requestData,
        })

        // 超时处理
        setTimeout(() => {
          const pending = this.pendingRequests.get(requestId)
          if (pending) {
            this.pendingRequests.delete(requestId)
            reject(new Error('Mock request timeout'))
          }
        }, 10000)
      } else {
        reject(new Error('HMR not available'))
      }
    })
  }

  // 设置请求拦截器
  private setupRequestInterceptor() {
    // 拦截 fetch
    const originalFetch = window.fetch
    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url
      const method = init?.method || (input as Request)?.method || 'GET'

      if (this.shouldMock(url, method)) {
        logger.info('🎭 Fetch intercepted by faker-ui:', method, url)

        try {
          const mockResponse = await this.sendRequestToMock({
            url,
            method: method.toUpperCase(),
            headers: init?.headers || {},
            body: init?.body,
          })

          return new Response(JSON.stringify(mockResponse.data), {
            status: mockResponse.status || 200,
            statusText: mockResponse.statusText || 'OK',
            headers: {
              'Content-Type': 'application/json',
              ...mockResponse.headers,
            },
          })
        } catch (error) {
          logger.warn('🎭 Mock failed, falling back to real request:', error)
        }
      }

      return originalFetch.call(window, input, init)
    }

    // 拦截 XMLHttpRequest (Axios)
    const OriginalXHR = window.XMLHttpRequest
    window.XMLHttpRequest = function () {
      const xhr = new OriginalXHR()
      const originalOpen = xhr.open

      let requestUrl = ''
      let requestMethod = ''
      const requestHeaders: Record<string, string> = {}

      xhr.open = function (
        method: string,
        url: string | URL,
        async?: boolean,
        user?: string,
        password?: string,
      ) {
        requestMethod = method.toUpperCase()
        requestUrl = typeof url === 'string' ? url : url.href

        if (requestUrl.startsWith('/')) {
          requestUrl = window.location.origin + requestUrl
        }

        return originalOpen.call(
          this,
          method,
          url,
          async || false,
          user,
          password,
        )
      }

      xhr.setRequestHeader = function (name: string, value: string) {
        requestHeaders[name.toLowerCase()] = value
        return XMLHttpRequest.prototype.setRequestHeader.call(this, name, value)
      }

      xhr.send = function (body?: any) {
        const urlForMatch =
          requestUrl.replace(window.location.origin, '') || requestUrl

        if (interceptor.shouldMock(urlForMatch, requestMethod)) {
          logger.info(
            '🎭 Axios/XHR intercepted by faker-ui:',
            requestMethod,
            urlForMatch,
          )

          interceptor
            .sendRequestToMock({
              url: urlForMatch,
              method: requestMethod,
              headers: requestHeaders,
              body: body,
            })
            .then(mockResponse => {
              const responseText = JSON.stringify(mockResponse.data)
              const status = mockResponse.status || 200

              Object.defineProperty(xhr, 'readyState', {
                value: 4,
                configurable: true,
              })
              Object.defineProperty(xhr, 'status', {
                value: status,
                configurable: true,
              })
              Object.defineProperty(xhr, 'statusText', {
                value: mockResponse.statusText || 'OK',
                configurable: true,
              })
              Object.defineProperty(xhr, 'responseText', {
                value: responseText,
                configurable: true,
              })
              Object.defineProperty(xhr, 'response', {
                value: responseText,
                configurable: true,
              })

              xhr.getResponseHeader = function (name: string) {
                const headers = {
                  'content-type': 'application/json',
                  ...mockResponse.headers,
                }
                return headers[name.toLowerCase()] || null
              }

              if (xhr.onreadystatechange)
                xhr.onreadystatechange(
                  new ProgressEvent('readystatechange', {
                    bubbles: false,
                    cancelable: false,
                  }),
                )
              if (xhr.onload)
                xhr.onload(
                  new ProgressEvent('load', {
                    bubbles: false,
                    cancelable: false,
                  }),
                )
            })
            .catch(error => {
              logger.warn(
                '🎭 Mock failed, falling back to real request:',
                error,
              )
              OriginalXHR.prototype.send.call(xhr, body)
            })

          return
        }

        return OriginalXHR.prototype.send.call(xhr, body)
      }

      return xhr
    } as any
  }

  // 检查是否需要 mock
  private shouldMock(url: string, method: string): boolean {
    if (!this.mockStorage || this.mockStorage.length === 0) return false

    const cleanUrl = url.split('?')[0].replace(window.location.origin, '')

    for (const mock of this.mockStorage) {
      if (mock.enabled && mock.method === method.toUpperCase()) {
        const pattern = mock.url.replace(/\*/g, '.*')
        const regex = new RegExp(`^${pattern}$`)
        if (regex.test(cleanUrl)) {
          return true
        }
      }
    }

    return false
  }
}

// 全局拦截器实例
let interceptor: RequestInterceptor

// 初始化拦截器
export function initInterceptor(): RequestInterceptor {
  if (!interceptor) {
    interceptor = new RequestInterceptor()
    ;(window as any).__faker_interceptor = interceptor
  }
  return interceptor
}

// 获取拦截器实例
export function getInterceptor(): RequestInterceptor | null {
  return interceptor || null
}
