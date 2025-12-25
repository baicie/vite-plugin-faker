import type { WSMessage } from '@baicie/faker-shared'
import {
  EventBusType,
  FAKER_WEBSOCKET_SYMBOL,
  WSMessageType,
} from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import type { ViteDevServer, WebSocketClient } from 'vite'
import { type WebSocket, WebSocketServer } from 'ws'
import { WSMessageHandler } from './api'
import type { DBManager } from './db'
import { EventBus } from './event-bus'
import { isValidJSON } from '@baicie/faker-shared'
import type { ViteFakerConfig } from './config'

export class WSServer {
  private viteServer?: ViteDevServer
  private standaloneServer?: WebSocketServer
  private eventBus: EventBus
  private messageHandler: WSMessageHandler
  private clients: Set<WebSocket | WebSocketClient> = new Set()
  private useStandalone: boolean

  constructor(
    dbManager: DBManager,
    server: ViteDevServer,
    config: ViteFakerConfig,
  ) {
    this.eventBus = new EventBus()
    this.messageHandler = new WSMessageHandler(dbManager, this.eventBus)

    if (config.uiOptions && config.uiOptions.wsPort) {
      this.useStandalone = true
      this.setupStandalone(config.uiOptions.wsPort)
    } else if (server) {
      this.viteServer = server
      this.useStandalone = false
      this.setupVite()
    } else {
      logger.error('[Faker] 未提供 Vite 服务器或独立 WebSocket 服务器端口')
      throw new Error('[Faker] 未提供 Vite 服务器或独立 WebSocket 服务器端口')
    }
  }

  /**
   * 设置 Vite HMR WebSocket
   */
  private setupVite(): void {
    if (!this.viteServer) return

    this.viteServer.ws.on('connection', (client: any) => {
      this.clients.add(client)
      logger.debug('[Faker] Vite 客户端已连接')

      setTimeout(() => {
        this.broadcastMockConfigs()
      }, 0)

      client.on('close', () => {
        this.clients.delete(client)
        logger.debug('[Faker] Vite 客户端已断开')
      })
    })

    try {
      this.viteServer.ws.on(
        FAKER_WEBSOCKET_SYMBOL,
        (data: unknown, client?: WebSocketClient) => {
          try {
            const message = isValidJSON(data) ? JSON.parse(data) : data
            this.handleMessage(client, message)
          } catch (error) {
            logger.error('[Faker] 解析消息失败:', error)
          }
        },
      )
    } catch (error) {
      logger.warn('[Faker] 无法监听自定义事件:', error)
    }

    this.setupEventBusListeners()
  }

  /**
   * 设置独立 WebSocket 服务器
   */
  private setupStandalone(port: number): void {
    this.standaloneServer = new WebSocketServer({ port })

    logger.info(`[Faker] 独立 WebSocket 服务器已启动，端口: ${port}`)

    this.standaloneServer.on('connection', (ws: WebSocket) => {
      this.clients.add(ws)
      logger.debug('[Faker] 客户端已连接')

      // 连接后立即广播 Mock 配置
      setTimeout(() => {
        this.broadcastMockConfigs()
      }, 0)

      ws.on('message', (data: Buffer | string) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString()
          const parsed = isValidJSON(raw) ? JSON.parse(raw) : raw

          // 兼容 faker-websocket 协议
          if (parsed.type === FAKER_WEBSOCKET_SYMBOL && parsed.data) {
            this.handleMessage(ws, parsed.data)
          } else {
            this.handleMessage(ws, parsed)
          }
        } catch (error) {
          logger.error('[Faker] 解析消息失败:', error)
        }
      })

      ws.on('close', () => {
        this.clients.delete(ws)
        logger.debug('[Faker] 客户端已断开')
      })

      ws.on('error', error => {
        logger.error('[Faker] WebSocket 错误:', error)
      })
    })

    this.standaloneServer.on('error', error => {
      logger.error('[Faker] WebSocket 服务器错误:', error)
    })

    this.setupEventBusListeners()
  }

  /**
   * 设置事件总线监听器
   */
  private setupEventBusListeners(): void {
    this.eventBus.on(EventBusType.DB_MOCK_CREATED, () => {
      this.broadcastMockConfigs()
    })

    this.eventBus.on(EventBusType.DB_MOCK_UPDATED, () => {
      this.broadcastMockConfigs()
    })

    this.eventBus.on(EventBusType.DB_MOCK_DELETED, () => {
      this.broadcastMockConfigs()
    })

    this.eventBus.on(EventBusType.DB_SETTINGS_UPDATED, event => {
      logger.debug('[Faker] 设置已更新:', event.data)
    })

    this.eventBus.on(EventBusType.DB_CACHE_CLEARED, () => {
      logger.debug('[Faker] 缓存已清除')
    })
  }

  /**
   * 处理客户端消息
   */
  private async handleMessage(client: any, message: WSMessage): Promise<void> {
    try {
      logger.debug('handleMessage', `type:${message.type};id:${message.id}`)
      const response = await this.messageHandler.handleMessage(message)

      if (response) {
        logger.debug('response', `type:${response.type};id:${response.id}`)
        this.sendToClient(client, response)
      }
    } catch (error) {
      logger.error('[Faker] 处理 WebSocket 消息失败:', error)
      this.sendToClient(client, {
        type: WSMessageType.ERROR,
        data: {
          message: error instanceof Error ? error.message : '处理消息失败',
        },
        id: message.id,
      })
    }
  }

  /**
   * 广播 Mock 配置更新
   */
  private broadcastMockConfigs(): void {
    try {
      const mocks = this.messageHandler.getAllMockConfigs()

      this.broadcast({
        type: WSMessageType.MOCK_CONFIG_UPDATED,
        data: mocks,
      })

      logger.debug(`[Faker] 已广播 Mock 配置更新，共 ${mocks.length} 条`)
    } catch (error) {
      logger.error('[Faker] 广播 Mock 配置失败:', error)
    }
  }

  /**
   * 发送消息给特定客户端
   */
  private sendToClient<T = any>(client: any, message: T): void {
    try {
      if (this.useStandalone) {
        // 独立模式：直接发送 JSON
        if (client && client.readyState === 1) {
          client.send(JSON.stringify(message))
        }
      } else {
        // Vite 模式
        this.viteServer?.ws.send(FAKER_WEBSOCKET_SYMBOL, message)
      }
    } catch (error) {
      logger.error('[Faker] 发送消息失败:', error)
    }
  }

  /**
   * 广播消息给所有客户端
   */
  private broadcast<T = any>(message: T): void {
    try {
      if (this.useStandalone) {
        // 独立模式：遍历所有客户端发送
        const payload = JSON.stringify(message)
        this.clients.forEach(client => {
          if ((client as WebSocket).readyState === 1) {
            ;(client as WebSocket).send(payload)
          }
        })
      } else {
        // Vite 模式
        this.viteServer?.ws.send(FAKER_WEBSOCKET_SYMBOL, message)
      }
    } catch (error) {
      logger.error('[Faker] 广播消息失败:', error)
    }
  }

  /**
   * 关闭服务器
   */
  close(): void {
    if (this.standaloneServer) {
      this.standaloneServer.close()
      logger.info('[Faker] 独立 WebSocket 服务器已关闭')
    }
  }
}
