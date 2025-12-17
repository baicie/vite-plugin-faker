import type { WSClient } from '@baicie/faker-shared'
import type { MSWAdapter } from './mock/msw-adapter'
import type { SetupWorker } from 'msw/browser'
/**
 * 从 shared 模块导出类型，保持向后兼容
 */
export type { MockConfig, RequestRecord, WSMessage } from '@baicie/faker-shared'

declare global {
  interface Window {
    __fakerInterceptorInitialized: boolean
    __fakerInterceptor: {
      wsClient: WSClient
      mswAdapter: MSWAdapter
      worker: SetupWorker
    }
  }
}
