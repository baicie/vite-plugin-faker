/**
 * Faker 拦截器入口
 * 在浏览器端运行，拦截 fetch 和 XHR 请求
 */

import type { MockConfig } from './types'
import { WSClient } from './ws-client'
import { FetchInterceptor } from './fetch-interceptor'
import { XHRInterceptor } from './xhr-interceptor'
import { initLogger, logger } from '@baicie/logger'

declare const __FAKER_WS_URL__: string

/**
 * 初始化拦截器
 */
export function initInterceptor(wsUrl: string): void {
  initLogger({
    enabled: true,
    level: 'debug',
    prefix: '[FakerInterceptor]',
    showTimestamp: true,
    showLevel: true,
  })
  // 检查是否已经初始化
  if (window.__fakerInterceptorInitialized) {
    logger.warn('拦截器已初始化，跳过重复初始化')
    return
  }

  logger.info('初始化拦截器...')

  // 创建 WebSocket 客户端
  const wsClient = new WSClient(wsUrl)

  // 创建拦截器
  const fetchInterceptor = new FetchInterceptor(wsClient)
  const xhrInterceptor = new XHRInterceptor(wsClient)

  // 监听 Mock 配置更新
  wsClient.on('mock-config-updated', (mocks: MockConfig[]) => {
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
  const wsUrl = `ws://${window.location.host}/@faker-ws`
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initInterceptor(wsUrl)
    })
  } else {
    initInterceptor(wsUrl)
  }
}
