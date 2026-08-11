import type { WSMessage, WSMessageType } from './type'

export interface FakerHotContext {
  readonly accept: unknown
  on(event: string, handler: (message: WSMessage) => void): void
  send(event: string, message: WSMessage): void
}

export interface FakerLogger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

interface ImportMetaWithHot {
  hot?: FakerHotContext
}

export type FakerWebSocket = FakerHotContext | WebSocket | undefined

export type WSConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'closed'

export interface WSStatusHandler {
  (status: WSConnectionStatus): void
}

export function isViteHot(ws: FakerWebSocket): ws is FakerHotContext {
  return !!ws && typeof (ws as FakerHotContext).accept === 'function'
}

export function isWebSocket(ws: FakerWebSocket): ws is WebSocket {
  return !!ws && typeof (ws as WebSocket).readyState === 'number'
}

export const FAKER_WEBSOCKET_SYMBOL = 'faker-websocket'

export class WSClient {
  private ws: FakerWebSocket
  private wsUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseReconnectDelay = 1000
  private maxReconnectDelay = 30000
  private handlers: Map<WSMessageType, Set<Function>> = new Map()
  private statusHandlers: Set<WSStatusHandler> = new Set()
  private status: WSConnectionStatus = 'disconnected'
  private pendingMessages: WSMessage[] = []
  private maxPendingMessages = 100
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private isConnecting = false
  private destroyed = false
  private logger: FakerLogger
  private hotContext: FakerHotContext | undefined

  constructor(
    wsUrl: string,
    logger: FakerLogger,
    hotContext?: FakerHotContext,
  ) {
    this.wsUrl = wsUrl
    this.logger = logger
    this.hotContext = hotContext
    this.connect()
  }

  private connect(): void {
    if (this.destroyed || this.isConnecting) {
      return
    }

    this.isConnecting = true
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting')

    try {
      if (!this.wsUrl) {
        this.messageGrid()
      } else {
        this.ws = new WebSocket(this.wsUrl)
      }

      if (!this.ws) {
        this.logger.error('interceptor error: websocket faile')
        this.isConnecting = false
        this.setStatus('disconnected')
        return
      }

      if (isWebSocket(this.ws)) {
        this.ws.onopen = () => {
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.setStatus('connected')
          this.flushPendingMessages()
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
          this.setStatus('disconnected')
        }

        this.ws.onclose = () => {
          this.isConnecting = false
          this.ws = undefined
          if (!this.destroyed) {
            this.setStatus('disconnected')
          }
          this.attemptReconnect()
        }
      } else if (isViteHot(this.ws)) {
        this.isConnecting = false
        this.setStatus('connected')
        this.ws.on(FAKER_WEBSOCKET_SYMBOL, (message: WSMessage) => {
          this.handleMessage(message)
        })
        this.flushPendingMessages()
      }
    } catch (error) {
      this.logger.error('WebSocket 连接失败:', error)
      this.isConnecting = false
      this.setStatus('disconnected')
      this.attemptReconnect()
    }
  }

  private attemptReconnect(): void {
    if (this.destroyed) {
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.warn('WebSocket 重连次数已达上限，停止重连')
      return
    }

    this.reconnectAttempts++
    const jitter = Math.random() * 500
    const exponentialDelay =
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    const delay = Math.min(exponentialDelay + jitter, this.maxReconnectDelay)

    this.logger.info(
      `${Math.round(delay)}ms 后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )
    this.setStatus('reconnecting')

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      this.connect()
    }, delay)
  }

  private setStatus(status: WSConnectionStatus): void {
    if (this.status === status) return
    this.status = status
    this.statusHandlers.forEach(function (handler) {
      handler(status)
    })
  }

  private queueMessage(message: WSMessage): void {
    if (this.pendingMessages.length >= this.maxPendingMessages) {
      this.pendingMessages.shift()
      this.logger.warn(
        'WebSocket message queue is full; dropping oldest message',
      )
    }
    this.pendingMessages.push(message)
  }

  private flushPendingMessages(): void {
    if (this.destroyed || this.pendingMessages.length === 0) return

    if (isViteHot(this.ws)) {
      const pending = this.pendingMessages.splice(0)
      for (const message of pending) {
        this.ws.send(FAKER_WEBSOCKET_SYMBOL, message)
      }
      return
    }

    if (
      this.ws &&
      isWebSocket(this.ws) &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      const pending = this.pendingMessages.splice(0)
      for (const message of pending) {
        this.ws.send(JSON.stringify(message))
      }
    }
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
    if (this.ws || this.wsUrl) {
      return
    }
    if (this.hotContext) {
      this.ws = this.hotContext
      return
    }
    const hot = (import.meta as ImportMeta & ImportMetaWithHot).hot
    if (hot) {
      this.ws = hot
    }
  }

  send<T = any>(type: WSMessageType, data?: T, id?: string): void {
    this.logger.debug('ws send start', type, data)
    if (this.destroyed) {
      this.logger.warn('WebSocket client is closed; ignoring message')
      return
    }

    try {
      this.messageGrid()
      const message: WSMessage = { type, data, id }
      if (isViteHot(this.ws)) {
        this.ws.send(FAKER_WEBSOCKET_SYMBOL, message)
      } else if (
        this.ws &&
        isWebSocket(this.ws) &&
        this.ws.readyState === WebSocket.OPEN
      ) {
        this.ws.send(JSON.stringify(message))
      } else {
        this.queueMessage(message)
        this.logger.warn('WebSocket not ready, queuing message')
        if (!this.isConnecting) this.connect()
      }
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

  getStatus(): WSConnectionStatus {
    return this.status
  }

  onStatus(handler: WSStatusHandler): void {
    this.statusHandlers.add(handler)
    handler(this.status)
  }

  offStatus(handler: WSStatusHandler): void {
    this.statusHandlers.delete(handler)
  }

  /**
   * 关闭连接并禁止自动重连
   */
  close(): void {
    this.destroyed = true
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    this.pendingMessages = []
    this.setStatus('closed')
    if (this.ws && isWebSocket(this.ws)) {
      this.ws.close()
      this.ws = undefined
    }
  }
}
