import type { ViteDevServer } from 'vite'
import type { DBManager } from './db'
import { logger } from '@baicie/logger'

// 临时定义类型，避免循环依赖
interface MockConfig {
  id: string
  url: string
  method: string
  enabled: boolean
  [key: string]: any
}

interface RequestRecord {
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
 * WebSocket 服务器
 * 基于 Vite HMR WebSocket
 */
export class WSServer {
  private server: ViteDevServer
  private dbManager: DBManager
  private clients: Set<any> = new Set()

  constructor(server: ViteDevServer, dbManager: DBManager) {
    this.server = server
    this.dbManager = dbManager
    this.setup()
  }

  /**
   * 设置 WebSocket 服务器
   */
  private setup(): void {
    // 使用 Vite 的 WebSocket 服务器
    // 监听自定义事件类型（通过 Vite HMR 的自定义事件系统）
    // 注意：Vite 的 WebSocket 使用事件系统，我们需要监听自定义事件

    // 方案1：通过 Vite HMR 的自定义事件
    // 客户端通过 import.meta.hot.send('faker:message', data) 发送
    // 我们通过 server.ws.on('faker:message', handler) 接收

    // 由于 Vite WebSocket 的事件系统，我们需要使用不同的方式
    // 这里我们监听所有连接，然后通过消息类型判断

    // 监听连接事件
    // this.server.ws.on('connection', () => {
    //   // 连接时广播配置
    //   setTimeout(() => {
    //     this.broadcastMockConfigs()
    //   }, 100)
    // })

    // 监听自定义事件（如果 Vite 支持）
    // 注意：这需要客户端使用 import.meta.hot.send() 发送消息
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
      // 如果不支持自定义事件，使用备用方案
      logger.warn('[Faker] 无法监听自定义事件，使用备用方案')
    }
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(client: any, message: any): void {
    try {
      // 如果 data 是字符串，解析它
      if (typeof message === 'string') {
        message = JSON.parse(message)
      }

      switch (message.type) {
        case 'request-recorded':
          this.handleRequestRecorded(message.data)
          break

        case 'mock-create':
          this.handleMockCreate(message.data, message.id)
          break

        case 'mock-update':
          this.handleMockUpdate(message.data, message.id)
          break

        case 'mock-delete':
          this.handleMockDelete(message.data, message.id)
          break

        case 'mock-list':
          this.handleMockList(client, message.data, message.id)
          break

        case 'request-history':
          this.handleRequestHistory(client, message.data, message.id)
          break

        case 'settings-get':
          this.handleSettingsGet(client, message.id)
          break

        case 'settings-update':
          this.handleSettingsUpdate(message.data, message.id)
          break

        case 'settings-clear-cache':
          this.handleClearCache(client, message.id)
          break

        default:
          logger.warn(`[Faker] 未知消息类型: ${message.type}`)
      }
    } catch (error) {
      logger.error('[Faker] 处理 WebSocket 消息失败:', error)
    }
  }

  /**
   * 处理请求记录
   */
  private handleRequestRecorded(data: RequestRecord): void {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      const id =
        data.id ||
        `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      requestsDB.saveRequest(id, this.toRequestItem(data))
      logger.debug(`[Faker] 请求已记录: ${data.method} ${data.url}`)
    } catch (error) {
      logger.error('[Faker] 保存请求记录失败:', error)
    }
  }

  private toRequestItem(record: RequestRecord) {
    return {
      req: {
        method: record.method,
        url: record.url,
        headers: record.headers,
        query: record.query,
        body: record.body,
        mockId: record.mockId,
        isMocked: record.isMocked,
      },
      res: record.response
        ? {
            statusCode: record.response.statusCode,
            headers: record.response.headers,
            body: record.response.body,
          }
        : null,
      timestamp: record.timestamp,
      duration: record.duration,
      isProxy: false,
    }
  }

  /**
   * 处理 Mock 创建
   */
  private handleMockCreate(data: Partial<MockConfig>, id?: string): void {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const mock = mocksDB.addMock(data as any)

      this.sendToClient(id, {
        type: 'mock-created',
        data: mock,
        id,
      })

      // 广播配置更新
      this.broadcastMockConfigs()
    } catch (error) {
      logger.error('[Faker] 创建 Mock 失败:', error)
      this.sendToClient(id, {
        type: 'error',
        data: { message: '创建 Mock 失败' },
        id,
      })
    }
  }

  /**
   * 处理 Mock 更新
   */
  private handleMockUpdate(
    data: { id: string; updates: Partial<MockConfig> },
    id?: string,
  ): void {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const success = mocksDB.updateMock(data.id, data.updates)

      this.sendToClient(id, {
        type: 'mock-updated',
        data: { success },
        id,
      })

      // 广播配置更新
      this.broadcastMockConfigs()
    } catch (error) {
      logger.error('[Faker] 更新 Mock 失败:', error)
      this.sendToClient(id, {
        type: 'error',
        data: { message: '更新 Mock 失败' },
        id,
      })
    }
  }

  /**
   * 处理 Mock 删除
   */
  private handleMockDelete(data: { id: string }, id?: string): void {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const success = mocksDB.deleteMock(data.id)

      this.sendToClient(id, {
        type: 'mock-deleted',
        data: { success },
        id,
      })

      // 广播配置更新
      this.broadcastMockConfigs()
    } catch (error) {
      logger.error('[Faker] 删除 Mock 失败:', error)
      this.sendToClient(id, {
        type: 'error',
        data: { message: '删除 Mock 失败' },
        id,
      })
    }
  }

  /**
   * 处理 Mock 列表查询
   */
  private handleMockList(client: any, data: any, id?: string): void {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const { page = 1, pageSize = 20, search } = data || {}

      const result = mocksDB.getMocksWithPagination(
        page,
        pageSize,
        search,
        'url',
        false,
      )

      this.sendToClient(client, {
        type: 'mock-list',
        data: result,
        id,
      })
    } catch (error) {
      logger.error('[Faker] 获取 Mock 列表失败:', error)
      this.sendToClient(client, {
        type: 'error',
        data: { message: '获取 Mock 列表失败' },
        id,
      })
    }
  }

  /**
   * 处理请求历史查询
   */
  private handleRequestHistory(client: any, data: any, id?: string): void {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      const { page = 1, pageSize = 20 } = data || {}

      const result = requestsDB.getRequestsWithPagination(
        page,
        pageSize,
        undefined,
        'timestamp',
        true,
      )

      this.sendToClient(client, {
        type: 'request-history',
        data: result,
        id,
      })
    } catch (error) {
      logger.error('[Faker] 获取请求历史失败:', error)
      this.sendToClient(client, {
        type: 'error',
        data: { message: '获取请求历史失败' },
        id,
      })
    }
  }

  /**
   * 处理获取设置
   */
  private handleSettingsGet(client: any, id?: string): void {
    try {
      const settingsDB = this.dbManager.getSettingsDB()
      const settings = settingsDB.getSettings()

      this.sendToClient(client, {
        type: 'settings-get',
        data: settings,
        id,
      })
    } catch (error) {
      logger.error('[Faker] 获取设置失败:', error)
      this.sendToClient(client, {
        type: 'error',
        data: { message: '获取设置失败' },
        id,
      })
    }
  }

  /**
   * 处理清除缓存
   */
  private handleClearCache(client: any, id?: string): void {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      requestsDB.clear()

      this.sendToClient(client, {
        type: 'settings-clear-cache',
        data: { success: true },
        id,
      })
    } catch (error) {
      logger.error('[Faker] 清除缓存失败:', error)
      this.sendToClient(client, {
        type: 'error',
        data: { message: '清除缓存失败' },
        id,
      })
    }
  }

  /**
   * 处理设置更新
   */
  private handleSettingsUpdate(data: any, id?: string): void {
    try {
      const settingsDB = this.dbManager.getSettingsDB()
      settingsDB.updateSettings(data)

      this.sendToClient(id, {
        type: 'settings-updated',
        data: { success: true },
        id,
      })
    } catch (error) {
      logger.error('[Faker] 更新设置失败:', error)
      this.sendToClient(id, {
        type: 'error',
        data: { message: '更新设置失败' },
        id,
      })
    }
  }

  /**
   * 广播 Mock 配置更新
   */
  private broadcastMockConfigs(): void {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const mocks = mocksDB.getAllMocks()

      this.broadcast({
        type: 'mock-config-updated',
        data: mocks,
      })
    } catch (error) {
      logger.error('[Faker] 广播 Mock 配置失败:', error)
    }
  }

  /**
   * 发送消息给特定客户端（通过消息 ID 响应）
   */
  private sendToClient(clientOrId: any, message: any): void {
    try {
      // 使用 Vite 的 WebSocket 发送 API
      // 格式：server.ws.send(event, data)
      // 客户端需要通过 import.meta.hot.on(event, handler) 接收
      this.server.ws.send('faker:response', message)
    } catch (error) {
      logger.error('[Faker] 发送消息失败:', error)
    }
  }

  /**
   * 广播消息给所有客户端
   */
  private broadcast(message: any): void {
    try {
      // 使用 Vite 的 WebSocket 广播 API
      this.server.ws.send('faker:broadcast', message)
    } catch (error) {
      logger.error('[Faker] 广播消息失败:', error)
    }
  }
}
