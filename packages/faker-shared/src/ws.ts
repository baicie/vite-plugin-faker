import type { ViteHotContext } from 'vite/types/hot.js'
import type { Logger } from '@baicie/logger'

export interface WSMessage<T = any> {
  type: WSMessageType
  data?: T
  id?: string
}

/**
 * WebSocket 消息类型枚举
 */
export enum WSMessageType {
  // Hack → Node
  REQUEST_RECORDED,

  // UI → Node
  MOCK_CREATE,
  MOCK_UPDATE,
  MOCK_DELETE,
  MOCK_LIST,
  REQUEST_HISTORY,
  SETTINGS_GET,
  SETTINGS_UPDATE,
  SETTINGS_CLEAR_CACHE,

  // Node → UI (响应)
  MOCK_CREATED,
  MOCK_UPDATED,
  MOCK_DELETED,
  ERROR,

  // Node → Hack/UI (广播)
  MOCK_CONFIG_UPDATED = 'faker:mock-config-updated',
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

export const FAKER_WEBSOCKET_SYMBOL = 'faker-websocket'

export class WSClient {
  private ws: FakerWebSocket
  private wsUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private handlers: Map<WSMessageType, Set<Function>> = new Map()
  private isConnecting = false
  private logger: Logger

  constructor(wsUrl: string, logger: Logger) {
    this.wsUrl = wsUrl
    this.logger = logger
    this.connect()
  }

  private connect(): void {
    if (this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      if (!this.wsUrl) {
        this.messageGrid()
      } else {
        this.ws = new WebSocket(this.wsUrl)
      }

      if (!this.ws) {
        this.logger.error('interceptor error: websocket faile')
        return
      }

      if (isWebSocket(this.ws)) {
        this.ws.onopen = () => {
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.logger.info('WebSocket 连接成功')
        }

        this.ws.onmessage = event => {
          try {
            let message: WSMessage
            if (typeof event.data === 'string') {
              try {
                message = JSON.parse(event.data)
              } catch {
                return
              }
            } else if (event.data && typeof event.data === 'object') {
              message = event.data as WSMessage
            } else {
              return
            }

            this.handleMessage(message)
          } catch (error) {
            this.logger.error('解析 WebSocket 消息失败:', error)
          }
        }

        this.ws.onerror = error => {
          this.logger.error('WebSocket 错误:', error)
          this.isConnecting = false
        }

        this.ws.onclose = () => {
          this.isConnecting = false
          this.ws = undefined
          this.attemptReconnect()
        }
      } else if (isViteHot(this.ws)) {
        this.ws.on(FAKER_WEBSOCKET_SYMBOL, (message: WSMessage) => {
          this.handleMessage(message)
        })
      }
    } catch (error) {
      this.logger.error('WebSocket 连接失败:', error)
      this.isConnecting = false
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.warn('WebSocket 重连次数已达上限')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts

    this.logger.info(
      `${delay}ms 后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private handleMessage(message: WSMessage): void {
    const handlers = this.handlers.get(message.type)
    this.logger.debug('message type:', message.type, handlers)

    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data, message)
        } catch (error) {
          this.logger.error(`处理消息失败 [${message.type}]:`, error)
        }
      })
    }
  }

  private messageGrid(): void {
    if (!this.ws && !this.wsUrl && import.meta.hot) {
      this.ws = import.meta.hot
    }
  }

  send<T = any>(type: WSMessageType, data?: T): void {
    this.logger.debug('ws send start', type, data)
    try {
      this.messageGrid()
      const message: WSMessage = { type, data }
      this.ws?.send(FAKER_WEBSOCKET_SYMBOL, message)
    } catch (error) {
      this.logger.error('message send error:', error)
    }
  }

  /**
   * 注册消息处理器
   */
  on(type: WSMessageType, handler: Function): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
  }

  /**
   * 取消注册消息处理器
   */
  off(type: WSMessageType, handler: Function): void {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.ws && isWebSocket(this.ws)) {
      this.ws.close()
      this.ws = undefined
    }
  }
}
