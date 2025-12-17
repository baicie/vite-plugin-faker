import {
  type MockConfig,
  WSClient,
  WSMessageType,
  wsPath,
} from '@baicie/faker-shared'
import { initLogger, logger } from '@baicie/logger'
import { setupWorker } from 'msw/browser'
import { MSWAdapter } from './mock/msw-adapter'
import { extend } from '@baicie/faker-shared'

declare const __FAKER_WS_PORT__: string
declare const __FAKER_LOGGER_OPTIONS__: string

const wsPort = Number(__FAKER_WS_PORT__)
const loogerOptions: string = __FAKER_LOGGER_OPTIONS__

/**
 * 初始化拦截器（使用 MSW）
 */
export async function initInterceptor(wsUrl: string): Promise<void> {
  const options = extend(loogerOptions, { prefix: '[FakerInterceptor]' })
  initLogger(options)
  // 检查是否已经初始化
  if (window.__fakerInterceptorInitialized) {
    logger.warn('拦截器已初始化，跳过重复初始化')
    return
  }

  logger.info('初始化拦截器（使用 MSW）...')

  const wsClient = new WSClient(wsUrl, logger)

  // 创建 MSW 适配器
  const mswAdapter = new MSWAdapter(wsClient)

  // 启动 MSW worker
  const worker = setupWorker()
  await worker.start({
    serviceWorker: {
      url: '/@faker/worker',
      options: {
        scope: '/', // 显式指定 scope 为根路径
      },
    },
    onUnhandledRequest: 'bypass', // 未匹配的请求继续正常发送
  })

  // 更新 handlers 的函数
  function updateMockHandlers(mocks: MockConfig[]) {
    logger.info('更新 Mock 配置', mocks)
    const handlers = mswAdapter.updateHandlers(mocks)
    worker.resetHandlers(...handlers)
    logger.info(`MSW handlers 已更新: ${handlers.length} 个`)
  }

  // 监听 Mock 配置更新
  wsClient.on(WSMessageType.MOCK_CONFIG_UPDATED, updateMockHandlers)

  // 监听 MOCK_LIST 响应（用于初始化时拉取配置）
  wsClient.on(WSMessageType.MOCK_LIST, (data: any) => {
    if (data && data.items) {
      updateMockHandlers(data.items)
    }
  })

  // 初始化完成后主动拉一次 Mock 配置
  wsClient.send(WSMessageType.MOCK_LIST, { page: 1, pageSize: 1000 })

  // 暴露到全局，方便调试
  window.__fakerInterceptor = {
    wsClient,
    mswAdapter,
    worker,
  }
  window.__fakerInterceptorInitialized = true

  // 触发 ready 回调
  if (window.__fakerInterceptorReadyCallbacks) {
    window.__fakerInterceptorReadyCallbacks.forEach((cb: () => void) => cb())
    window.__fakerInterceptorReadyCallbacks = []
  }

  logger.info('拦截器初始化完成（MSW）')
}

/**
 * 等待拦截器就绪
 * @param timeout 超时时间（毫秒），默认 5000
 */
export function waitForInterceptor(timeout = 5000): Promise<void> {
  return new Promise(resolve => {
    if (window.__fakerInterceptorInitialized) {
      resolve()
      return
    }

    // 注册回调
    if (!window.__fakerInterceptorReadyCallbacks) {
      window.__fakerInterceptorReadyCallbacks = []
    }
    window.__fakerInterceptorReadyCallbacks.push(resolve)

    // 超时后也 resolve，不阻塞应用
    setTimeout(resolve, timeout)
  })
}

if (typeof window !== 'undefined') {
  const wsUrl = wsPort
    ? `ws://${window.location.hostname}:${wsPort}/${wsPath}`
    : ''
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initInterceptor(wsUrl).catch(error => {
        logger.error('初始化拦截器失败:', error)
      })
    })
  } else {
    initInterceptor(wsUrl).catch(error => {
      logger.error('初始化拦截器失败:', error)
    })
  }
}
