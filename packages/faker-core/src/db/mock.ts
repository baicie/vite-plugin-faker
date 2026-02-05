import type { MockConfig, Page, UrlMatchType } from '@baicie/faker-shared'
import { BaseDB } from './base'
import type { DBConfig } from './base'
import { type ParmasLike, methodLineUrl } from '../utils'

/**
 * 匹配器工具函数
 */
const matchers = {
  /**
   * 精确匹配
   */
  exact(pattern: string, url: string): boolean {
    return pattern === url
  },

  /**
   * 通配符匹配（支持 * 和 **）
   */
  wildcard(pattern: string, url: string): boolean {
    // 将通配符模式转换为正则表达式
    const regexPattern = pattern
      .replace(/\*\*/g, '___WILDCARD_DOUBLE___')
      .replace(/\*/g, '___WILDCARD_SINGLE___')
      .replace(/___WILDCARD_DOUBLE___/g, '.*')
      .replace(/___WILDCARD_SINGLE___/g, '[^/]*')
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(url)
  },

  /**
   * 前缀匹配
   */
  prefix(pattern: string, url: string): boolean {
    return url.startsWith(pattern)
  },

  /**
   * 正则表达式匹配
   */
  regex(pattern: string, url: string): boolean {
    try {
      const regex = new RegExp(pattern)
      return regex.test(url)
    } catch {
      return false
    }
  },

  /**
   * 根据类型匹配 URL
   */
  matchUrl(pattern: string, type: UrlMatchType, url: string): boolean {
    switch (type) {
      case 'exact':
        return this.exact(pattern, url)
      case 'wildcard':
        return this.wildcard(pattern, url)
      case 'prefix':
        return this.prefix(pattern, url)
      case 'regex':
        return this.regex(pattern, url)
      default:
        return this.exact(pattern, url)
    }
  },
}

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
    return this.db.data[id]
  }

  /**
   * 高级匹配：支持正则、通配符、前缀匹配
   */
  findMockAdvanced(params: {
    url: string
    method: string
    headers?: Record<string, string>
    query?: Record<string, string>
    body?: any
  }): MockConfig | undefined {
    const mocks = this.getActiveMocks()

    // 按优先级排序（优先级高的先匹配）
    const sortedMocks = mocks.sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0
      return priorityB - priorityA
    })

    for (const mock of sortedMocks) {
      // 先检查 method
      if (
        mock.method &&
        mock.method !== '*' &&
        mock.method.toUpperCase() !== params.method.toUpperCase()
      ) {
        continue
      }

      // 如果有 matchRule，使用高级匹配
      if (mock.matchRule) {
        const matchResult = this.matchWithRule(mock, params)
        if (matchResult) {
          return mock
        }
      } else {
        // 否则使用传统的精确匹配
        if (methodLineUrl(mock) === methodLineUrl(params)) {
          return mock
        }
      }
    }

    return undefined
  }

  /**
   * 根据匹配规则匹配请求
   */
  private matchWithRule(
    mock: MockConfig,
    params: {
      url: string
      method: string
      headers?: Record<string, string>
      query?: Record<string, string>
      body?: any
    },
  ): boolean {
    const rule = mock.matchRule
    if (!rule) return false

    // URL 匹配
    if (rule.url) {
      const urlMatched = matchers.matchUrl(
        rule.url.pattern,
        rule.url.type,
        params.url,
      )
      if (!urlMatched) return false
    } else {
      // 如果没有 URL 规则，检查传统 url 和 method
      if (mock.url && mock.url !== params.url) return false
    }

    // 请求头匹配
    if (rule.headers && rule.headers.length > 0) {
      for (const headerCondition of rule.headers) {
        const headerValue = params.headers?.[headerCondition.key]
        if (!headerValue) return false

        const matchResult = this.matchHeader(headerCondition, headerValue)
        if (!matchResult) return false
      }
    }

    // 查询参数匹配
    if (rule.query && rule.query.length > 0) {
      for (const queryCondition of rule.query) {
        const queryValue = params.query?.[queryCondition.key]
        if (!queryValue) return false

        const matchResult = this.matchQuery(queryCondition, queryValue)
        if (!matchResult) return false
      }
    }

    return true
  }

  /**
   * 匹配请求头条件
   */
  private matchHeader(
    condition: {
      key: string
      value: string | string[]
      operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex'
    },
    headerValue: string,
  ): boolean {
    const value = condition.value
    const strValue = String(headerValue)

    switch (condition.operator) {
      case 'equals':
        if (Array.isArray(value)) {
          return value.includes(strValue)
        }
        return value === strValue

      case 'contains':
        return strValue.includes(String(value))

      case 'startsWith':
        return strValue.startsWith(String(value))

      case 'endsWith':
        return strValue.endsWith(String(value))

      case 'regex':
        try {
          const regex = new RegExp(String(value))
          return regex.test(strValue)
        } catch {
          return false
        }

      default:
        return false
    }
  }

  /**
   * 匹配查询参数条件
   */
  private matchQuery(
    condition: {
      key: string
      value: string | string[]
      operator:
        | 'equals'
        | 'contains'
        | 'startsWith'
        | 'endsWith'
        | 'regex'
        | 'exists'
    },
    queryValue: string,
  ): boolean {
    const value = condition.value
    const strValue = String(queryValue)

    switch (condition.operator) {
      case 'exists':
        return queryValue !== undefined && queryValue !== null

      case 'equals':
        if (Array.isArray(value)) {
          return value.includes(strValue)
        }
        return value === strValue

      case 'contains':
        return strValue.includes(String(value))

      case 'startsWith':
        return strValue.startsWith(String(value))

      case 'endsWith':
        return strValue.endsWith(String(value))

      case 'regex':
        try {
          const regex = new RegExp(String(value))
          return regex.test(strValue)
        } catch {
          return false
        }

      default:
        return false
    }
  }

  getMock(id: string): MockConfig | undefined {
    return this.db.data[id]
  }

  updateMock(id: string, updates: Partial<MockConfig>): boolean {
    if (this.db.data[id]) {
      this.db.data[id] = { ...this.db.data[id], ...updates } as MockConfig
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
    groupFilter?: string,
  ): Page<MockConfig> {
    // 先按分组筛选
    let filteredData = this.db.data
    if (groupFilter === '__none__') {
      // 筛选没有分组的 mock
      filteredData = {}
      for (const [key, value] of Object.entries(this.db.data)) {
        if (!value.group) {
          filteredData[key] = value
        }
      }
    } else if (groupFilter) {
      // 筛选指定分组的 mock
      filteredData = {}
      for (const [key, value] of Object.entries(this.db.data)) {
        if (value.group === groupFilter) {
          filteredData[key] = value
        }
      }
    }

    const result = this.getPaginatedItems(filteredData, page, pageSize, {
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
      return {
        id,
        url: '',
        method: 'GET',
        enabled: false,
        type: 'static',
        response: {
          status: 200,
          body: {},
          headers: {},
        },
      }
    }
    return {
      ...value,
      id: value.id || id,
    }
  }

  /**
   * 获取所有分组
   */
  getAllGroups(): string[] {
    const groups = new Set<string>()
    for (const mock of Object.values(this.db.data)) {
      if (mock.group) {
        groups.add(mock.group)
      }
    }
    return Array.from(groups).sort()
  }

  /**
   * 按分组获取 Mock 数量
   */
  getMockCountByGroup(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const mock of Object.values(this.db.data)) {
      const group = mock.group || '默认'
      counts[group] = (counts[group] || 0) + 1
    }
    return counts
  }

  /**
   * 获取指定分组的 Mock 列表
   */
  getMocksByGroup(group: string): MockConfig[] {
    if (!group || group === '默认') {
      return Object.values(this.db.data).filter(mock => !mock.group)
    }
    return Object.values(this.db.data).filter(mock => mock.group === group)
  }

  /**
   * 获取所有标签
   */
  getAllTags(): string[] {
    const tags = new Set<string>()
    for (const mock of Object.values(this.db.data)) {
      if (mock.tags) {
        for (const tag of mock.tags) {
          tags.add(tag)
        }
      }
    }
    return Array.from(tags).sort()
  }

  /**
   * 按标签过滤 Mock
   */
  getMocksByTag(tag: string): MockConfig[] {
    return Object.values(this.db.data).filter(
      mock => mock.tags && mock.tags.includes(tag),
    )
  }
}
