import type { WSClient } from '@baicie/faker-shared'
import type { FetchInterceptor } from './hack/fetch-interceptor'
import type { XHRInterceptor } from './hack/xhr-interceptor'
export type { MockConfig, RequestRecord, WSMessage } from '@baicie/faker-shared'

declare global {
  interface Window {
    __fakerInterceptorInitialized: boolean
    __fakerInterceptor: {
      wsClient: WSClient
      xhrInterceptor: XHRInterceptor
      fetchInterceptor: FetchInterceptor
    }
  }
}
