import type { MockConfig, Page } from '@baicie/faker-shared'
import { BaseDB } from './base'
import type { DBConfig } from './base'
import { type ParmasLike, methodLineUrl } from '../utils'

/**
 * Mock 配置数据库
 * 存储 Mock 配置数据
 */
export class MocksDB extends BaseDB<Record<string, MockConfig>> {
  private static instance: MocksDB

  private constructor(config: DBConfig) {
    super('mocks', {}, config)
  }

  static getInstance(config: DBConfig): MocksDB {
    if (!MocksDB.instance) {
      MocksDB.instance = new MocksDB(config)
    }
    return MocksDB.instance
  }

  // 添加Mock配置
  addMock(config: MockConfig): MockConfig {
    const id = methodLineUrl(config)
    this.db.data[id] = config
    this.save()
    return config
  }

  // 获取所有Mock配置
  getAllMocks(): MockConfig[] {
    return Object.values(this.db.data)
  }

  // 获取激活的Mock配置
  getActiveMocks(): MockConfig[] {
    return Object.values(this.db.data).filter(mock => mock.enabled)
  }

  findMock<T extends ParmasLike>(params: T): MockConfig | undefined {
    const id = methodLineUrl(params)
    const mock = this.db.data[id]
    return mock?.enabled ? mock : undefined
  }

  updateMock(id: string, updates: Partial<MockConfig>): boolean {
    if (this.db.data[id]) {
      this.db.data[id] = { ...this.db.data[id], ...updates }
      this.save()
      return true
    }
    return false
  }

  deleteMock(id: string): boolean {
    const initialLength = Object.keys(this.db.data).length
    delete this.db.data[id]
    if (Object.keys(this.db.data).length !== initialLength) {
      this.save()
      return true
    }
    return false
  }

  getMocksWithPagination(
    page: number = 1,
    pageSize: number = 10,
    searchVal?: string,
    sortBy: string = 'url',
    sortDesc: boolean = false,
  ): Page<MockConfig> {
    const result = this.getPaginatedItems(this.db.data, page, pageSize, {
      searchVal,
      searchFields: ['url', 'method', 'description'],
      sortBy,
      sortDesc,
    })

    const items = result.items.map(function (item) {
      return MocksDB.toMockConfig(item.key, item.value)
    })

    return {
      items,
      pagination: result.pagination,
    }
  }

  private static toMockConfig(id: string, value: MockConfig): MockConfig {
    if (!value) {
      return { id, url: '', method: 'GET', enabled: false }
    }
    return {
      ...value,
      id: value.id || id,
    }
  }
}
