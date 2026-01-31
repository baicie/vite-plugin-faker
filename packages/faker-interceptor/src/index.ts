import { WSClient, extend } from '@baicie/faker-shared'
import { initLogger, logger } from '@baicie/logger'
import { FetchInterceptor } from './hack/fetch-interceptor'
import { XHRInterceptor } from './hack/xhr-interceptor'

declare const __FAKER_WS_PORT__: string
declare const __FAKER_LOGGER_OPTIONS__: string

const wsPort = Number(__FAKER_WS_PORT__)
const loogerOptions: string = __FAKER_LOGGER_OPTIONS__

export async function initInterceptor(wsUrl: string): Promise<void> {
  const options = extend(loogerOptions, { prefix: '[FakerInterceptor]' })
  initLogger(options)

  if (window.__fakerInterceptorInitialized) {
    logger.warn('拦截器已初始化，跳过重复初始化')
    return
  }

  const wsClient = new WSClient(wsUrl, logger)

  const xhrInterceptor = new XHRInterceptor(wsClient)
  const fetchInterceptor = new FetchInterceptor(wsClient)

  window.__fakerInterceptor = {
    wsClient,
    xhrInterceptor,
    fetchInterceptor,
  }
  window.__fakerInterceptorInitialized = true
}

if (typeof window !== 'undefined') {
  let wsUrl = ''
  if (wsPort) {
    wsUrl = `ws://${window.location.hostname}:${wsPort}/`
  } else {
    const isVite = !!import.meta.hot
    if (!isVite) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/__faker_ws__`
    }
  }

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
