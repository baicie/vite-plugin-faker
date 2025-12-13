import type { FetchInterceptor } from './hack/fetch-interceptor'
import type { XHRInterceptor } from './hack/xhr-interceptor'
import type { WSClient } from './ws-client'

/**
 * 从 shared 模块导出类型，保持向后兼容
 */
export type { MockConfig, RequestRecord, WSMessage } from '@baicie/faker-shared'

declare global {
  interface Window {
    __fakerInterceptorInitialized: boolean
    __fakerInterceptor: {
      wsClient: WSClient
      fetchInterceptor: FetchInterceptor
      xhrInterceptor: XHRInterceptor
    }
  }
}
