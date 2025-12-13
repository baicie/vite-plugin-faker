import {
  FAKER_WEBSOCKET_PRESET,
  type FakerWebSocket,
  type RequestRecord,
  type WSMessage,
  WSMessageType,
  isWebSocket,
} from '@baicie/faker-shared'
import { logger } from '@baicie/logger'

export class WSClient {
  private ws: FakerWebSocket
  private wsUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private handlers: Map<string, Set<Function>> = new Map()
  private isConnecting = false

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl
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
        logger.error('interceptor error: websocket faile')
        return
      }

      if (isWebSocket(this.ws)) {
        this.ws.onopen = () => {
          this.isConnecting = false
          this.reconnectAttempts = 0
          logger.info('WebSocket 连接成功')
        }

        this.ws.onmessage = event => {
          try {
            // 处理 Vite WebSocket 事件格式
            let message: WSMessage

            if (typeof event.data === 'string') {
              // 尝试解析为 JSON
              try {
                message = JSON.parse(event.data)
              } catch {
                return
              }
            } else if (event.data && typeof event.data === 'object') {
              // 已经是对象
              message = event.data as WSMessage
            } else {
              return
            }

            this.handleMessage(message)
          } catch (error) {
            logger.error('解析 WebSocket 消息失败:', error)
          }
        }

        this.ws.onerror = error => {
          logger.error('WebSocket 错误:', error)
          this.isConnecting = false
        }

        this.ws.onclose = () => {
          this.isConnecting = false
          this.ws = undefined
          this.attemptReconnect()
        }
      }
    } catch (error) {
      logger.error('WebSocket 连接失败:', error)
      this.isConnecting = false
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn('WebSocket 重连次数已达上限')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts

    logger.info(
      `${delay}ms 后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private handleMessage(message: WSMessage): void {
    const handlers = this.handlers.get(message.type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data, message)
        } catch (error) {
          logger.error(`处理消息失败 [${message.type}]:`, error)
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
    logger.debug(type, data)
    try {
      this.messageGrid()
      const message: WSMessage = { type, data }
      const messageStr = JSON.stringify(message)
      this.ws?.send(FAKER_WEBSOCKET_PRESET, messageStr)
    } catch (error) {
      logger.error('message send error:', error)
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
   * 发送请求记录
   */
  sendRequestRecord(record: RequestRecord): void {
    this.send(WSMessageType.REQUEST_RECORDED, record)
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
