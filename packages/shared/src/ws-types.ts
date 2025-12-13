import type { ViteHotContext } from 'vite/types/hot.js'
/**
 * WebSocket 消息类型定义
 * 用于 Hack、UI 和 Node 之间的通信
 */

/**
 * WebSocket 消息基础接口
 */
export interface WSMessage {
  type: WSMessageType
  data?: any
  id?: string
}

/**
 * WebSocket 消息类型枚举
 */
export enum WSMessageType {
  // Hack → Node
  REQUEST_RECORDED = 'request-recorded',

  // UI → Node
  MOCK_CREATE = 'mock-create',
  MOCK_UPDATE = 'mock-update',
  MOCK_DELETE = 'mock-delete',
  MOCK_LIST = 'mock-list',
  REQUEST_HISTORY = 'request-history',
  SETTINGS_GET = 'settings-get',
  SETTINGS_UPDATE = 'settings-update',
  SETTINGS_CLEAR_CACHE = 'settings-clear-cache',

  // Node → UI (响应)
  MOCK_CREATED = 'mock-created',
  MOCK_UPDATED = 'mock-updated',
  MOCK_DELETED = 'mock-deleted',
  ERROR = 'error',
  //
  FAKER_RESPONSE = 'faker-response',
  FAKER_BROADCAST = 'faker-broadcast',
  FAKER_MESSAGE = 'faker-message',

  // Node → Hack/UI (广播)
  MOCK_CONFIG_UPDATED = 'mock-config-updated',
}

/**
 * 请求记录接口
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
 * Mock 配置接口
 */
export interface MockConfig {
  id: string
  url: string
  method: string
  enabled: boolean
  [key: string]: any
}

/**
 * 事件总线事件类型
 */
export enum EventBusType {
  // 数据库变更事件
  DB_MOCK_CREATED = 'db:mock:created',
  DB_MOCK_UPDATED = 'db:mock:updated',
  DB_MOCK_DELETED = 'db:mock:deleted',
  DB_REQUEST_SAVED = 'db:request:saved',
  DB_SETTINGS_UPDATED = 'db:settings:updated',
  DB_CACHE_CLEARED = 'db:cache:cleared',
}

/**
 * 事件总线事件接口
 */
export interface EventBusEvent {
  type: EventBusType
  data?: any
  timestamp?: number
}

export type FakerWebSocket = ViteHotContext | WebSocket | undefined

export function isViteHot(ws: FakerWebSocket): ws is ViteHotContext {
  return !!ws && typeof (ws as ViteHotContext).accept === 'function'
}

export function isWebSocket(ws: FakerWebSocket): ws is WebSocket {
  return !!ws && typeof (ws as WebSocket).onopen === 'function'
}

export const FAKER_WEBSOCKET_PRESET = 'faker-websocket-preset'
