import type { ViteHotContext } from 'vite/types/hot.d.ts'
import type { RequestRecord, WSMessage } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'

/**
 * WebSocket 客户端
 * 用于与 Node 端通信
 */
export class WSClient {
  private ws: WebSocket | null = null
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

  /**
   * 连接 WebSocket
   * 优先使用 Vite HMR WebSocket，否则创建新连接
   */
  private connect(): void {
    if (this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      // 尝试使用 Vite HMR WebSocket（如果可用）
      const viteHMR = import.meta?.hot
      if (viteHMR) {
        // 使用 Vite HMR WebSocket
        this.setupViteHMRConnection(viteHMR)
        return
      }

      // 否则创建新的 WebSocket 连接
      this.ws = new WebSocket(this.wsUrl)

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
              // 如果不是 JSON，可能是 Vite 事件格式
              // 格式：{ type: 'faker:response', data: {...} }
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
        this.ws = null
        this.attemptReconnect()
      }
    } catch (error) {
      logger.error('WebSocket 连接失败:', error)
      this.isConnecting = false
    }
  }

  /**
   * 设置 Vite HMR WebSocket 连接
   */
  private setupViteHMRConnection(hmr: ViteHotContext): void {
    this.isConnecting = false
    this.reconnectAttempts = 0

    // 监听自定义事件
    // Vite HMR 使用 import.meta.hot.on() 监听事件
    if (import.meta?.hot) {
      const hot = import.meta.hot

      hot.on('faker:response', (data: any) => {
        try {
          const message = typeof data === 'string' ? JSON.parse(data) : data
          this.handleMessage(message)
        } catch (error) {
          logger.error('解析消息失败:', error)
        }
      })

      hot.on('faker:broadcast', (data: any) => {
        try {
          const message = typeof data === 'string' ? JSON.parse(data) : data
          this.handleMessage(message)
        } catch (error) {
          logger.error('解析广播消息失败:', error)
        }
      })
    } else if (hmr.on) {
      // 备用方案：直接使用 hmr.on
      hmr.on('faker:response', (data: any) => {
        try {
          const message = typeof data === 'string' ? JSON.parse(data) : data
          this.handleMessage(message)
        } catch (error) {
          logger.error('解析消息失败:', error)
        }
      })

      hmr.on('faker:broadcast', (data: any) => {
        try {
          const message = typeof data === 'string' ? JSON.parse(data) : data
          this.handleMessage(message)
        } catch (error) {
          logger.error('解析广播消息失败:', error)
        }
      })
    }

    // 保存 HMR 引用
    ;(this as any).hmr = hmr
    logger.info('使用 Vite HMR WebSocket')
  }

  /**
   * 尝试重连
   */
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

  /**
   * 处理消息
   */
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

  /**
   * 发送消息
   */
  send(type: string, data?: any, id?: string): void {
    const message: WSMessage = { type, data, id }
    const messageStr = JSON.stringify(message)

    // 优先使用 Vite HMR WebSocket
    const hmr = (this as any).hmr
    if (hmr) {
      try {
        // 使用 import.meta.hot.send() 发送消息
        if (import.meta?.hot) {
          import.meta.hot.send('faker:message', messageStr)
          return
        } else if (hmr.send) {
          // 备用方案
          hmr.send('faker:message', messageStr)
          return
        }
      } catch (error) {
        logger.error('通过 HMR 发送消息失败:', error)
      }
    }

    // 降级到原生 WebSocket
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket 未连接，消息已丢弃:', type)
      return
    }

    this.ws.send(messageStr)
  }

  /**
   * 注册消息处理器
   */
  on(type: string, handler: Function): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
  }

  /**
   * 取消注册消息处理器
   */
  off(type: string, handler: Function): void {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 发送请求记录
   */
  sendRequestRecord(record: RequestRecord): void {
    this.send('request-recorded', record)
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
