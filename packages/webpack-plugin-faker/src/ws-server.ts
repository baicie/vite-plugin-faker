import { type WSMessage, EventBusType } from '@baicie/faker-shared'
import { WSMessageType, isValidJSON } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import { type WebSocket, WebSocketServer } from 'ws'
import type { Server } from 'node:http'
import {
  WSMessageHandler,
  type EventBus,
  type DBManager,
} from '@baicie/faker-core'
import { EventBus as EventBusImpl } from './event-bus'
import type { FakerConfig } from './types'

export class WSServer {
  private httpServer?: Server
  private standaloneServer?: WebSocketServer
  private server?: WebSocketServer
  private eventBus: EventBus
  private messageHandler: WSMessageHandler
  private clients: Set<WebSocket> = new Set()
  private useStandalone: boolean

  constructor(
    dbManager: DBManager,
    server: Server | undefined,
    config: FakerConfig,
  ) {
    this.useStandalone = false
    this.eventBus = new EventBusImpl()
    this.messageHandler = new WSMessageHandler(dbManager, this.eventBus)

    if (config.uiOptions && config.uiOptions.wsPort) {
      this.useStandalone = true
      this.setupStandalone(config.uiOptions.wsPort)
    } else if (server) {
      this.httpServer = server
      this.useStandalone = false
      this.setupServer()
    } else {
      // Allow initializing without server if waiting for it (e.g. Webpack hooks)
      // But here we log error if neither is provided immediately,
      // however in Webpack plugin we might get server later.
      // We will handle that in the plugin.
      // For now, let's assume if passed undefined, we wait.
    }
  }

  public setServer(server: Server): void {
    if (this.useStandalone) return
    this.httpServer = server
    this.setupServer()
  }

  /**
   * 设置 WebSocket 服务器 (Attach to HTTP Server)
   */
  private setupServer(): void {
    if (!this.httpServer) return

    // Create WebSocket server attached to the HTTP server
    // We use a specific path to avoid conflict with HMR
    this.server = new WebSocketServer({
      noServer: true,
      path: '/__faker_ws__',
    })

    if (
      this.httpServer
        .listeners('upgrade')
        .some(l => l.name === 'fakerUpgradeHandler')
    ) {
      return
    }

    const fakerUpgradeHandler = (request: any, socket: any, head: any) => {
      const pathname = new URL(request.url ?? '', 'http://localhost').pathname
      if (pathname === '/__faker_ws__') {
        this.server?.handleUpgrade(request, socket, head, ws => {
          this.server?.emit('connection', ws, request)
        })
      }
    }

    // Assign a name to the function to check it later
    Object.defineProperty(fakerUpgradeHandler, 'name', {
      value: 'fakerUpgradeHandler',
    })

    this.httpServer.on('upgrade', fakerUpgradeHandler)

    logger.info('[Faker] WebSocket attached to DevServer at /__faker_ws__')

    this.server.on('connection', (ws: WebSocket) => {
      this.clients.add(ws)
      logger.debug('[Faker] 客户端已连接')

      // 连接后立即广播 Mock 配置
      setTimeout(() => {
        this.broadcastMockConfigs()
      }, 0)

      ws.on('message', (data: any) => {
        try {
          const messageStr = data.toString()
          const message = isValidJSON(messageStr)
            ? JSON.parse(messageStr)
            : messageStr
          this.handleMessage(ws, message)
        } catch (error) {
          logger.error('[Faker] 解析消息失败:', error)
        }
      })

      ws.on('close', () => {
        this.clients.delete(ws)
        logger.debug('[Faker] 客户端已断开')
      })
    })

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

      ws.on('message', (data: any) => {
        try {
          const messageStr = data.toString()
          const message = isValidJSON(messageStr)
            ? JSON.parse(messageStr)
            : messageStr
          this.handleMessage(ws, message)
        } catch (error) {
          logger.error('[Faker] 解析消息失败:', error)
        }
      })

      ws.on('close', () => {
        this.clients.delete(ws)
        logger.debug('[Faker] 客户端已断开')
      })
    })

    this.setupEventBusListeners()
  }

  /**
   * 处理 WebSocket 消息
   */
  private async handleMessage(
    client: WebSocket,
    message: WSMessage,
  ): Promise<void> {
    try {
      const response = await this.messageHandler.handleMessage(message)
      if (response) {
        this.send(client, response)
      }
    } catch (error) {
      logger.error('[Faker] 处理消息失败:', error)
      this.send(client, {
        type: WSMessageType.ERROR,
        data: { message: (error as Error).message },
        id: message.id,
      })
    }
  }

  /**
   * 发送消息给客户端
   */
  private send(client: WebSocket, message: WSMessage): void {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message))
    }
  }

  /**
   * 广播消息给所有客户端
   */
  private broadcast(message: WSMessage): void {
    const clients = this.server
      ? this.server.clients
      : this.standaloneServer
        ? this.standaloneServer.clients
        : this.clients
    clients.forEach(client => {
      this.send(client as WebSocket, message)
    })
  }

  /**
   * 设置事件总线监听
   */
  private setupEventBusListeners(): void {
    // 监听数据库变更事件并广播
    this.eventBus.emit = (type: EventBusType, data?: any) => {
      switch (type) {
        case EventBusType.DB_MOCK_CREATED:
        case EventBusType.DB_MOCK_UPDATED:
        case EventBusType.DB_MOCK_DELETED:
          // 广播 Mock 配置更新
          this.broadcastMockConfigs()
          break

        case EventBusType.DB_REQUEST_SAVED:
          // 广播请求记录
          this.broadcast({
            type: WSMessageType.REQUEST_RECORDED,
            data,
          })
          break

        case EventBusType.DB_CACHE_CLEARED:
          this.broadcast({
            type: WSMessageType.REQUEST_CLEARED,
          })
          break
      }
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
}
