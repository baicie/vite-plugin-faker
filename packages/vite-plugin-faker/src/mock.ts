import { http, setupWorker } from 'msw'
import type { MockConfig } from './types'
import type { MockStorage } from './storage'

// MSW 工作者实例
let worker: ReturnType<typeof setupWorker> | null = null

/**
 * 创建MSW处理程序
 */
function createHandlers(mockStorage: MockStorage) {
  const enabledMocks = mockStorage.getEnabledMocks()
  return enabledMocks.map((mock: MockConfig) => {
    const { path, method, statusCode = 200, delay = 0, response } = mock

    return http[method.toLowerCase() as Lowercase<typeof method>](path, () => {
      // 添加人为延迟
      if (delay > 0) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createResponse(response, statusCode))
          }, delay)
        })
      }

      // 无延迟直接返回
      return createResponse(response, statusCode)
    })
  })
}

/**
 * 创建响应对象
 */
function createResponse(responseData: any, statusCode: number) {
  // 处理响应数据
  let finalResponse = responseData
  if (typeof finalResponse === 'function') {
    try {
      finalResponse = finalResponse()
    } catch (error) {
      console.error(
        '[vite-plugin-faker] Error executing response function:',
        error,
      )
      finalResponse = { error: 'Failed to generate mock response' }
    }
  }

  return new Response(JSON.stringify(finalResponse), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-MSW-Mock': 'true',
    },
  })
}

/**
 * 设置和启动MSW
 */
export function setupMockHandlers(mockStorage: MockStorage): void {
  if (typeof window === 'undefined') return

  // 如果已经存在工作者，则停止它
  if (worker) {
    worker.stop()
  }

  const handlers = createHandlers(mockStorage)

  // 没有启用的模拟，不需要启动MSW
  if (handlers.length === 0) {
    return
  }

  // 创建并启动MSW工作者
  worker = setupWorker(...handlers)

  worker
    .start({
      onUnhandledRequest: 'bypass', // 不拦截的请求直接透传
    })
    .catch(error => {
      console.error('[vite-plugin-faker] Failed to start MSW:', error)
    })(
    // 在窗口中暴露worker，方便调试
    window as any,
  ).__FAKER_WORKER__ = worker
}
