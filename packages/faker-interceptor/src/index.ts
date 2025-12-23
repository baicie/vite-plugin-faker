import {
  MSWWORKER,
  type MockConfig,
  WSClient,
  WSMessageType,
} from '@baicie/faker-shared'
import { initLogger, logger } from '@baicie/logger'
import { setupWorker } from 'msw/browser'
import { MSWAdapter } from './mock/msw-adapter'
import { extend } from '@baicie/faker-shared'

declare const __FAKER_WS_PORT__: string
declare const __FAKER_LOGGER_OPTIONS__: string

const wsPort = Number(__FAKER_WS_PORT__)
const loogerOptions: string = __FAKER_LOGGER_OPTIONS__

const worker = setupWorker()
worker.start({
  serviceWorker: {
    url: MSWWORKER,
    options: {
      scope: '/',
    },
  },
  onUnhandledRequest: 'bypass',
})

export async function initInterceptor(wsUrl: string): Promise<void> {
  const options = extend(loogerOptions, { prefix: '[FakerInterceptor]' })
  initLogger(options)

  if (window.__fakerInterceptorInitialized) {
    logger.warn('拦截器已初始化，跳过重复初始化')
    return
  }

  const wsClient = new WSClient(wsUrl, logger)

  // 创建 MSW 适配器
  const mswAdapter = new MSWAdapter(wsClient)

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

  logger.info('拦截器初始化完成（MSW）')
}

if (typeof window !== 'undefined') {
  const wsUrl = wsPort ? `ws://${window.location.hostname}:${wsPort}/` : ''
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
