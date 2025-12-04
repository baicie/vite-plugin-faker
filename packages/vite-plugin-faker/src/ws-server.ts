import type { ViteDevServer } from 'vite'
import type { DBManager } from './db'
import { logger } from '@baicie/logger'
import type { WSMessage } from '@baicie/faker-shared'
import { EventBusType, WSMessageType } from '@baicie/faker-shared'
import { WSMessageHandler } from './api/handlers/ws-handler'
import { EventBus } from './event-bus'

/**
 * WebSocket 服务器（Reactive/Emitter 事件中心）
 * 基于 Vite HMR WebSocket，作为 Hack 和 UI 之间的通信桥梁
 */
export class WSServer {
  private server: ViteDevServer
  private dbManager: DBManager
  private eventBus: EventBus
  private messageHandler: WSMessageHandler
  private clients: Set<any> = new Set()

  constructor(server: ViteDevServer, dbManager: DBManager) {
    this.server = server
    this.dbManager = dbManager
    this.eventBus = new EventBus()
    this.messageHandler = new WSMessageHandler(dbManager, this.eventBus)
    this.setup()
  }

  /**
   * 设置 WebSocket 服务器
   * 监听客户端消息，作为事件中心分发消息
   */
  private setup(): void {
    // 监听连接事件，管理客户端连接
    this.server.ws.on('connection', (client: any) => {
      this.clients.add(client)
      logger.debug('[Faker] 客户端已连接')

      // 连接时广播当前 Mock 配置
      setTimeout(() => {
        this.broadcastMockConfigs()
      }, 100)

      // 监听断开连接
      client.on('close', () => {
        this.clients.delete(client)
        logger.debug('[Faker] 客户端已断开')
      })
    })

    // 监听自定义事件：客户端通过 import.meta.hot.send('faker:message', data) 发送
    try {
      this.server.ws.on('faker:message', (data: any, client?: any) => {
        try {
          const message = typeof data === 'string' ? JSON.parse(data) : data
          this.handleMessage(client, message)
        } catch (error) {
          logger.error('[Faker] 解析消息失败:', error)
        }
      })
    } catch (error) {
      logger.warn('[Faker] 无法监听自定义事件:', error)
    }

    // 监听事件总线，当数据库变更时广播更新
    this.setupEventBusListeners()
  }

  /**
   * 设置事件总线监听器
   * 当数据库变更时，自动广播相关更新
   */
  private setupEventBusListeners(): void {
    // Mock 配置变更时，广播更新
    this.eventBus.on(EventBusType.DB_MOCK_CREATED, () => {
      this.broadcastMockConfigs()
    })

    this.eventBus.on(EventBusType.DB_MOCK_UPDATED, () => {
      this.broadcastMockConfigs()
    })

    this.eventBus.on(EventBusType.DB_MOCK_DELETED, () => {
      this.broadcastMockConfigs()
    })

    // 设置变更时，可以广播通知（如果需要）
    this.eventBus.on(EventBusType.DB_SETTINGS_UPDATED, event => {
      logger.debug('[Faker] 设置已更新:', event.data)
      // 可以在这里广播设置更新，如果需要的话
    })

    // 缓存清除时，可以广播通知（如果需要）
    this.eventBus.on(EventBusType.DB_CACHE_CLEARED, () => {
      logger.debug('[Faker] 缓存已清除')
      // 可以在这里广播缓存清除通知，如果需要的话
    })
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(client: any, message: WSMessage): void {
    try {
      // 如果 data 是字符串，解析它
      if (typeof message === 'string') {
        message = JSON.parse(message)
      }

      // 使用 handler 处理消息
      const response = this.messageHandler.handleMessage(message)

      // 如果有响应（需要返回给客户端），发送响应
      if (response) {
        this.sendToClient(message.id, response)
      }
    } catch (error) {
      logger.error('[Faker] 处理 WebSocket 消息失败:', error)
      // 发送错误响应
      this.sendToClient(message.id, {
        type: WSMessageType.ERROR,
        data: {
          message: error instanceof Error ? error.message : '处理消息失败',
        },
        id: message.id,
      })
    }
  }

  /**
   * 广播 Mock 配置更新（流程 4：Node → Hack/UI）
   * 当 Mock 配置发生变化时，通知所有客户端更新
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
   * 发送消息给特定客户端（通过消息 ID 响应）
   * 用于响应客户端的请求（流程 2：Node → UI）
   */
  private sendToClient(clientOrId: any, message: any): void {
    try {
      // 使用 Vite 的 WebSocket 发送 API
      // 格式：server.ws.send(event, data)
      // 客户端通过 import.meta.hot.on('faker:response', handler) 接收
      this.server.ws.send('faker:response', message)
    } catch (error) {
      logger.error('[Faker] 发送消息失败:', error)
    }
  }

  /**
   * 广播消息给所有客户端
   * 用于通知所有客户端（Hack 和 UI）配置更新（流程 4：Node → Hack/UI）
   */
  private broadcast(message: any): void {
    try {
      // 使用 Vite 的 WebSocket 广播 API
      // 所有客户端通过 import.meta.hot.on('faker:broadcast', handler) 接收
      this.server.ws.send('faker:broadcast', message)
    } catch (error) {
      logger.error('[Faker] 广播消息失败:', error)
    }
  }
}
