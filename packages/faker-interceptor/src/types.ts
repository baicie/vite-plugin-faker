import type { FetchInterceptor } from './fetch-interceptor'
import type { WSClient } from './ws-client'
import type { XHRInterceptor } from './xhr-interceptor'

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

/**
 * Mock 配置类型
 */
export interface MockConfig {
  id: string
  name?: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'
  enabled: boolean
  statusCode?: number
  delay?: number
  headers?: Record<string, string>
  responseType: 'static' | 'faker' | 'function'
  responseData?: any
  responseTemplate?: string
  responseCode?: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * 请求记录类型
 */
export interface RequestRecord {
  id?: string
  url: string
  method: string
  headers: Record<string, string>
  query?: Record<string, string>
  body?: any
  response?: {
    statusCode: number
    headers: Record<string, string>
    body: any
  }
  duration?: number
  isMocked?: boolean
  mockId?: string
  timestamp: number
}

/**
 * WebSocket 消息类型
 */
export interface WSMessage {
  type: string
  data?: any
  id?: string
}
