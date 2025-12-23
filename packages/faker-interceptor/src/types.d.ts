import type { WSClient } from '@baicie/faker-shared'
import type { XHRInterceptor } from './hack/xhr-interceptor'
import type { FetchInterceptor } from './hack/fetch-interceptor'
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
