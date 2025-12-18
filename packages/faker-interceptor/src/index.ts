import {
  MSWWORKER,
  type MockConfig,
  WSClient,
  WSMessageType,
} from '@baicie/faker-shared'
import { initLogger, logger } from '@baicie/logger'
import { XHRInterceptor } from './hack/xhr-interceptor'
import { MockMatcher } from './mock/mock-matcher'
import { MockResponseGenerator } from './mock/mock-response-generator'
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
  const responseGenerator = new MockResponseGenerator()
  let mocks: MockConfig[] = []

  const xhrInterceptor = new XHRInterceptor(wsClient)

  // 监听 Mock 配置更新
  wsClient.on(WSMessageType.MOCK_CONFIG_UPDATED, (nextMocks: MockConfig[]) => {
    xhrInterceptor.updateMocks(nextMocks)
    // 这里同时维护一份给 Service Worker 的匹配用 mocks
    // SW 侧只负责“问页面”，真正的匹配与生成在页面侧完成
    // 仅保留 enabled 的配置，避免重复判断
    const enabled = nextMocks.filter(m => m.enabled)
    mocks = enabled
  })

  function handleSwRequest(
    data: FakerSwRequestMessage,
    port: MessagePort | undefined,
  ) {
    if (!port) return
    if (!data || data.type !== 'FAKER_SW_REQUEST') return

    const headers = pairsToHeaders(data.headers || [])
    const method = (data.method || 'GET').toUpperCase()
    const url = data.url || ''

    // 查找匹配 mock
    const mock = MockMatcher.findMock(mocks, url, method)

    if (!mock) {
      const passthrough: FakerSwPassthroughMessage = {
        type: 'FAKER_SW_PASSTHROUGH',
        requestId: data.requestId,
      }
      try {
        port.postMessage(passthrough)
      } catch {
        // ignore
      }
      return
    }

    const parsedUrl = new URL(url, window.location.origin)
    const requestInfo = {
      url,
      method,
      pathname: parsedUrl.pathname,
      query: searchParamsToObject(parsedUrl.searchParams),
      headers: headersToObject(headers),
      body: parseBodyFromSwMessage(data.body || null, headers),
    }

    const responseData = responseGenerator.generateResponseData(
      mock,
      requestInfo,
    )
    const responseText = JSON.stringify(responseData)
    const responseHeaders = responseGenerator.getResponseHeaders(mock)
    const responseHeadersObj = new Headers(responseHeaders)

    const reply: FakerSwResponseMessage = {
      type: 'FAKER_SW_RESPONSE',
      requestId: data.requestId,
      action: 'mock',
      status: mock.statusCode || 200,
      statusText: 'OK',
      headers: headersToPairs(responseHeadersObj),
      body: textToArrayBuffer(responseText),
    }

    try {
      port.postMessage(reply)
    } catch (e) {
      logger.warn('向 Service Worker 回传响应失败，将透传', e)
      const passthrough: FakerSwPassthroughMessage = {
        type: 'FAKER_SW_PASSTHROUGH',
        requestId: data.requestId,
      }
      try {
        port.postMessage(passthrough)
      } catch {
        // ignore
      }
    }
  }

  // 注册并对接 Service Worker（仅负责 fetch）
  registerFakerServiceWorker().then(reg => {
    if (!reg) return

    // 监听来自 SW 的请求消息（MessageChannel 端口在 event.ports[0]）
    navigator.serviceWorker.addEventListener('message', event => {
      const data = (event as any).data as FakerSwRequestMessage
      const port = (event as any).ports && (event as any).ports[0]
      handleSwRequest(data, port)
    })

    logger.info('Faker Service Worker 已启用（fetch 将由 SW 拦截）')
  })

  // 初始化完成后主动拉一次 Mock 配置
  wsClient.send(WSMessageType.MOCK_LIST, { page: 1, pageSize: 1000 })

  // 暴露到全局，方便调试
  window.__fakerInterceptor = {
    wsClient,
    xhrInterceptor,
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
