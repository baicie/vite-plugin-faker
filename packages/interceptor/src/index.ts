import {
  MSWWORKER,
  type MockConfig,
  WSClient,
  WSMessageType,
} from '@baicie/faker-shared'
import { initLogger, logger } from '@baicie/logger'
import { XHRInterceptor } from './hack/xhr-interceptor'
import { extend } from '@baicie/faker-shared'
import { FetchInterceptor } from './hack/fetch-interceptor'
import { registerFakerServiceWorker } from './mock'

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
  let mocks: MockConfig[] = []

  const xhrInterceptor = new XHRInterceptor(wsClient)
  const fetchInterceptor = new FetchInterceptor(wsClient)

  // 监听 Mock 配置更新
  wsClient.on(WSMessageType.MOCK_CONFIG_UPDATED, (nextMocks: MockConfig[]) => {
    const enabled = nextMocks.filter(m => m.enabled)
    mocks = enabled
  })

  // 注册并对接 Service Worker（仅负责 fetch）
  registerFakerServiceWorker().then(reg => {
    if (!reg) return

    // 监听来自 SW 的请求消息（MessageChannel 端口在 event.ports[0]）
    navigator.serviceWorker.addEventListener('message', event => {
      logger.info('收到来自 Service Worker 的消息:', event)
    })
  })

  wsClient.send(WSMessageType.MOCK_LIST, { page: 1, pageSize: 1000 })

  window.__fakerInterceptor = {
    wsClient,
    xhrInterceptor,
    fetchInterceptor,
  }
  window.__fakerInterceptorInitialized = true
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
