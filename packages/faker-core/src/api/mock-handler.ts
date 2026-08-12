import type { DBManager } from '../db'
import type {
  DashboardQuery,
  MockConfig,
  Page,
  WSMessage,
} from '@baicie/faker-shared'
import { EventBusType, WSMessageType } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import type { EventBus } from './types'

/**
 * Mock 相关消息处理器
 */
export class MockHandler {
  constructor(
    private dbManager: DBManager,
    private eventBus: EventBus,
  ) {}

  /**
   * 处理 Mock 创建
   */
  handleCreate(data: Partial<MockConfig>): WSMessage {
    const mocksDB = this.dbManager.getMocksDB()
    let mock: MockConfig
    try {
      mock = mocksDB.addMock(data as any)
    } catch (error) {
      logger.error('[Faker] 创建 Mock 失败:', error)
      const message =
        error instanceof Error ? error.message : 'Mock create failed'
      return {
        type: WSMessageType.MOCK_CREATED,
        data: { success: false, error: message },
      }
    }

    // 触发数据库变更事件
    this.eventBus.emit(EventBusType.DB_MOCK_CREATED, mock)

    return {
      type: WSMessageType.MOCK_CREATED,
      data: { success: true, mock },
    }
  }

  /**
   * 处理 Mock 更新
   */
  handleUpdate(data: { id: string; updates: Partial<MockConfig> }): WSMessage {
    const mocksDB = this.dbManager.getMocksDB()
    const success = mocksDB.updateMock(data.id, data.updates)
    const errorMessage = success
      ? undefined
      : 'Update conflict: the rule signature matches another existing mock'

    if (success) {
      // 只有持久化成功后才通知其他客户端刷新配置。
      this.eventBus.emit(EventBusType.DB_MOCK_UPDATED, {
        id: data.id,
        updates: data.updates,
      })
    } else {
      logger.warn(
        '[Faker] 更新 Mock 失败（可能存在冲突）:',
        data.id,
        data.updates,
      )
    }

    return {
      type: WSMessageType.MOCK_UPDATED,
      data: { success, ...(errorMessage ? { error: errorMessage } : {}) },
    }
  }

  /**
   * 处理 Mock 删除
   */
  handleDelete(data: { id: string }): WSMessage {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const success = mocksDB.deleteMock(data.id)

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_MOCK_DELETED, { id: data.id })

      return {
        type: WSMessageType.MOCK_DELETED,
        data: { success },
      }
    } catch (error) {
      logger.error('[Faker] 删除 Mock 失败:', error)
      const message =
        error instanceof Error ? error.message : 'Mock delete failed'
      return {
        type: WSMessageType.MOCK_DELETED,
        data: { success: false, error: message },
      }
    }
  }

  /**
   * 处理 Mock 详情查询
   */
  handleGet(data: { id: string }): WSMessage<MockConfig> {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const mock = mocksDB.getMock(data.id)

      return {
        type: WSMessageType.MOCK_DETAIL,
        data: mock!,
      }
    } catch (error) {
      logger.error('[Faker] 获取 Mock 详情失败:', error)
      throw error
    }
  }

  /**
   * 处理 Mock 列表查询
   */
  handleList(data?: DashboardQuery): WSMessage<Page<MockConfig>> {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const { page = 1, pageSize = 20, search, group } = data || {}

      const result = mocksDB.getMocksWithPagination(
        page,
        pageSize,
        search,
        'url',
        false,
        group,
      )

      return {
        type: WSMessageType.MOCK_LIST,
        data: result,
      }
    } catch (error) {
      logger.error('[Faker] 获取 Mock 列表失败:', error)
      throw error
    }
  }

  /**
   * 处理 Mock 导出
   */
  handleExport(): WSMessage<MockConfig[]> {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const mocks = mocksDB.getAllMocks()

      return {
        type: WSMessageType.MOCK_EXPORTED,
        data: mocks,
      }
    } catch (error) {
      logger.error('[Faker] 导出 Mock 失败:', error)
      throw error
    }
  }

  /**
   * 处理 Mock 导入
   */
  handleImport(data: { items: MockConfig[] } | MockConfig[]): WSMessage {
    const mocksDB = this.dbManager.getMocksDB()
    const items = Array.isArray(data)
      ? data
      : data && data.items
        ? data.items
        : []
    let imported: MockConfig[]
    try {
      imported = mocksDB.importMocks(items)
    } catch (error) {
      logger.error('[Faker] 导入 Mock 失败:', error)
      const message =
        error instanceof Error ? error.message : 'Mock import failed'
      return {
        type: WSMessageType.MOCK_IMPORTED,
        data: { success: false, count: 0, error: message },
      }
    }

    for (const mock of imported) {
      this.eventBus.emit(EventBusType.DB_MOCK_CREATED, mock)
    }

    return {
      type: WSMessageType.MOCK_IMPORTED,
      data: { success: true, count: imported.length },
    }
  }

  /**
   * 获取所有 Mock 配置（用于广播）
   */
  getAllConfigs(): MockConfig[] {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      return mocksDB.getAllMocks()
    } catch (error) {
      logger.error('[Faker] 获取所有 Mock 配置失败:', error)
      return []
    }
  }

  /**
   * 获取所有分组
   */
  handleGetGroups(): WSMessage<string[]> {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const groups = mocksDB.getAllGroups()

      return {
        type: WSMessageType.MOCK_LIST,
        data: groups,
      }
    } catch (error) {
      logger.error('[Faker] 获取分组列表失败:', error)
      throw error
    }
  }

  /**
   * 获取分组统计
   */
  handleGetGroupStats(): WSMessage<Record<string, number>> {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const counts = mocksDB.getMockCountByGroup()

      return {
        type: WSMessageType.MOCK_LIST,
        data: counts,
      }
    } catch (error) {
      logger.error('[Faker] 获取分组统计失败:', error)
      throw error
    }
  }

  /**
   * 获取所有标签
   */
  handleGetTags(): WSMessage<string[]> {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const tags = mocksDB.getAllTags()

      return {
        type: WSMessageType.MOCK_LIST,
        data: tags,
      }
    } catch (error) {
      logger.error('[Faker] 获取标签列表失败:', error)
      throw error
    }
  }
}
