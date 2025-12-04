import { generateUUID } from '@baicie/faker-shared'
import type { MockConfig } from '@baicie/faker-shared'
import { BaseDB } from './base'
import type { DBConfig } from './base'

/**
 * Mock 配置数据库
 * 存储 Mock 配置数据
 */
export class MocksDB extends BaseDB<Record<string, MockConfig>> {
  private static readonly INSTANCE_KEY = 'MocksDB'

  private constructor(config: DBConfig) {
    super('mocks', {}, config)
  }

  static getInstance(config: DBConfig): MocksDB {
    return BaseDB.getInstance(MocksDB.INSTANCE_KEY, MocksDB, config)
  }

  // 添加Mock配置
  addMock(config: Omit<MockConfig, 'id'>): MockConfig {
    const id = generateUUID()
    const newConfig = { ...config, id }
    this.db.data[id] = newConfig
    this.save()
    return newConfig
  }

  // 获取所有Mock配置
  getAllMocks(): MockConfig[] {
    return Object.values(this.db.data)
  }

  // 获取激活的Mock配置
  getActiveMocks(): MockConfig[] {
    return Object.values(this.db.data).filter(mock => mock.enabled)
  }

  findMock(url: string, method: string): MockConfig | undefined {
    return Object.values(this.db.data).find(
      mock =>
        mock.enabled &&
        mock.url === url &&
        mock.method.toUpperCase() === method.toUpperCase(),
    )
  }

  // 更新Mock配置
  updateMock(id: string, updates: Partial<MockConfig>): boolean {
    if (this.db.data[id]) {
      this.db.data[id] = { ...this.db.data[id], ...updates }
      this.save()
      return true
    }
    return false
  }

  // 删除Mock配置
  deleteMock(id: string): boolean {
    const initialLength = Object.keys(this.db.data).length
    delete this.db.data[id]
    if (Object.keys(this.db.data).length !== initialLength) {
      this.save()
      return true
    }
    return false
  }

  // 分页获取Mock配置
  getMocksWithPagination(
    page: number = 1,
    pageSize: number = 10,
    searchVal?: string,
    sortBy: string = 'url',
    sortDesc: boolean = false,
  ): any {
    return this.getPaginatedItems(this.db.data, page, pageSize, {
      searchVal,
      searchFields: ['url', 'method', 'description'],
      sortBy,
      sortDesc,
    })
  }
}
