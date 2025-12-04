import type { DBManager } from '../../db'
import type { MockConfig, RequestRecord, WSMessage } from '@baicie/faker-shared'
import { EventBusType, WSMessageType } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'

/**
 * 事件总线接口
 */
export interface EventBus {
  emit(type: EventBusType, data?: any): void
}

/**
 * WebSocket 消息处理器
 */
export class WSMessageHandler {
  private dbManager: DBManager
  private eventBus: EventBus

  constructor(dbManager: DBManager, eventBus: EventBus) {
    this.dbManager = dbManager
    this.eventBus = eventBus
  }

  /**
   * 处理 WebSocket 消息
   */
  handleMessage(message: WSMessage): WSMessage | void {
    switch (message.type) {
      case WSMessageType.REQUEST_RECORDED:
        this.handleRequestRecorded(message.data)
        return // 请求记录不需要响应

      case WSMessageType.MOCK_CREATE:
        return this.handleMockCreate(message.data, message.id)

      case WSMessageType.MOCK_UPDATE:
        return this.handleMockUpdate(message.data, message.id)

      case WSMessageType.MOCK_DELETE:
        return this.handleMockDelete(message.data, message.id)

      case WSMessageType.MOCK_LIST:
        return this.handleMockList(message.data, message.id)

      case WSMessageType.REQUEST_HISTORY:
        return this.handleRequestHistory(message.data, message.id)

      case WSMessageType.SETTINGS_GET:
        return this.handleSettingsGet(message.id)

      case WSMessageType.SETTINGS_UPDATE:
        return this.handleSettingsUpdate(message.data, message.id)

      case WSMessageType.SETTINGS_CLEAR_CACHE:
        return this.handleClearCache(message.id)

      default:
        logger.warn(`[Faker] 未知消息类型: ${message.type}`)
        throw new Error(`未知消息类型: ${message.type}`)
    }
  }

  /**
   * 处理请求记录（流程 1：Hack → Node）
   */
  private handleRequestRecorded(data: RequestRecord): void {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      const id =
        data.id ||
        `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      requestsDB.saveRequest(id, this.toRequestItem(data))
      logger.debug(`[Faker] 请求已记录: ${data.method} ${data.url}`)

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_REQUEST_SAVED, { id, ...data })
    } catch (error) {
      logger.error('[Faker] 保存请求记录失败:', error)
      throw error
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
   * 处理 Mock 创建（流程 3：UI → Node）
   */
  private handleMockCreate(data: Partial<MockConfig>, id?: string): WSMessage {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const mock = mocksDB.addMock(data as any)

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_MOCK_CREATED, mock)

      return {
        type: WSMessageType.MOCK_CREATED,
        data: mock,
        id,
      }
    } catch (error) {
      logger.error('[Faker] 创建 Mock 失败:', error)
      throw error
    }
  }

  /**
   * 处理 Mock 更新（流程 3：UI → Node）
   */
  private handleMockUpdate(
    data: { id: string; updates: Partial<MockConfig> },
    id?: string,
  ): WSMessage {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const success = mocksDB.updateMock(data.id, data.updates)

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_MOCK_UPDATED, {
        id: data.id,
        updates: data.updates,
      })

      return {
        type: WSMessageType.MOCK_UPDATED,
        data: { success },
        id,
      }
    } catch (error) {
      logger.error('[Faker] 更新 Mock 失败:', error)
      throw error
    }
  }

  /**
   * 处理 Mock 删除（流程 3：UI → Node）
   */
  private handleMockDelete(data: { id: string }, id?: string): WSMessage {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const success = mocksDB.deleteMock(data.id)

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_MOCK_DELETED, { id: data.id })

      return {
        type: WSMessageType.MOCK_DELETED,
        data: { success },
        id,
      }
    } catch (error) {
      logger.error('[Faker] 删除 Mock 失败:', error)
      throw error
    }
  }

  /**
   * 处理 Mock 列表查询
   */
  private handleMockList(data: any, id?: string): WSMessage {
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

      return {
        type: WSMessageType.MOCK_LIST,
        data: result,
        id,
      }
    } catch (error) {
      logger.error('[Faker] 获取 Mock 列表失败:', error)
      throw error
    }
  }

  /**
   * 处理请求历史查询
   */
  private handleRequestHistory(data: any, id?: string): WSMessage {
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

      return {
        type: WSMessageType.REQUEST_HISTORY,
        data: result,
        id,
      }
    } catch (error) {
      logger.error('[Faker] 获取请求历史失败:', error)
      throw error
    }
  }

  /**
   * 处理获取设置
   */
  private handleSettingsGet(id?: string): WSMessage {
    try {
      const settingsDB = this.dbManager.getSettingsDB()
      const settings = settingsDB.getSettings()

      return {
        type: WSMessageType.SETTINGS_GET,
        data: settings,
        id,
      }
    } catch (error) {
      logger.error('[Faker] 获取设置失败:', error)
      throw error
    }
  }

  /**
   * 处理清除缓存
   */
  private handleClearCache(id?: string): WSMessage {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      requestsDB.clear()

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_CACHE_CLEARED)

      return {
        type: WSMessageType.SETTINGS_CLEAR_CACHE,
        data: { success: true },
        id,
      }
    } catch (error) {
      logger.error('[Faker] 清除缓存失败:', error)
      throw error
    }
  }

  /**
   * 处理设置更新
   */
  private handleSettingsUpdate(data: any, id?: string): WSMessage {
    try {
      const settingsDB = this.dbManager.getSettingsDB()
      settingsDB.updateSettings(data)

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_SETTINGS_UPDATED, data)

      return {
        type: WSMessageType.SETTINGS_UPDATE,
        data: { success: true },
        id,
      }
    } catch (error) {
      logger.error('[Faker] 更新设置失败:', error)
      throw error
    }
  }

  /**
   * 获取所有 Mock 配置（用于广播）
   */
  getAllMockConfigs(): MockConfig[] {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      return mocksDB.getAllMocks()
    } catch (error) {
      logger.error('[Faker] 获取 Mock 配置失败:', error)
      return []
    }
  }
}
