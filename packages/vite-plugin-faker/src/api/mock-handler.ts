import type { DBManager } from '../db'
import type {
  DashboardQuery,
  MockConfig,
  Page,
  WSMessage,
  WithId,
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
  handleCreate(data: Partial<MockConfig>, id?: string): WSMessage {
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
   * 处理 Mock 更新
   */
  handleUpdate(
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
   * 处理 Mock 删除
   */
  handleDelete(data: { id: string }, id?: string): WSMessage {
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
  handleList(data: WithId<DashboardQuery>): WSMessage<Page<MockConfig>> {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      const { page = 1, pageSize = 20, search, id } = data || {}

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
   * 获取所有 Mock 配置（用于广播）
   */
  getAllConfigs(): MockConfig[] {
    try {
      const mocksDB = this.dbManager.getMocksDB()
      return mocksDB.getAllMocks()
    } catch (error) {
      logger.error('[Faker] 获取 Mock 配置失败:', error)
      return []
    }
  }
}
