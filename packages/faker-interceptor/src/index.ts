import {
  type MockConfig,
  WSClient,
  WSMessageType,
  wsPath,
} from '@baicie/faker-shared'
import { initLogger, logger } from '@baicie/logger'
import { FetchInterceptor } from './hack/fetch-interceptor'
import { XHRInterceptor } from './hack/xhr-interceptor'
import { extend } from '@baicie/faker-shared'

declare const __FAKER_WS_PORT__: string
declare const __FAKER_LOGGER_OPTIONS__: string

const wsPort = Number(__FAKER_WS_PORT__)
const loogerOptions: string = __FAKER_LOGGER_OPTIONS__

/**
 * 初始化拦截器
 */
export function initInterceptor(wsUrl: string): void {
  const options = extend(loogerOptions, { prefix: '[FakerInterceptor]' })
  initLogger(options)
  // 检查是否已经初始化
  if (window.__fakerInterceptorInitialized) {
    logger.warn('拦截器已初始化，跳过重复初始化')
    return
  }

  logger.info('初始化拦截器...')

  const wsClient = new WSClient(wsUrl, logger)

  // 创建拦截器
  const fetchInterceptor = new FetchInterceptor(wsClient)
  const xhrInterceptor = new XHRInterceptor(wsClient)

  // 监听 Mock 配置更新
  wsClient.on(WSMessageType.MOCK_CONFIG_UPDATED, (mocks: MockConfig[]) => {
    fetchInterceptor.updateMocks(mocks)
    xhrInterceptor.updateMocks(mocks)
  })

  // 暴露到全局，方便调试
  window.__fakerInterceptor = {
    wsClient,
    fetchInterceptor,
    xhrInterceptor,
  }
  window.__fakerInterceptorInitialized = true

  logger.info('拦截器初始化完成')
}

if (typeof window !== 'undefined') {
  const wsUrl = wsPort
    ? `ws://${window.location.hostname}:${wsPort}/${wsPath}`
    : ''
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initInterceptor(wsUrl)
    })
  } else {
    initInterceptor(wsUrl)
  }
}
