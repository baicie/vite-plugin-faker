import path from 'node:path'
import fs from 'node:fs'
import type { LowSync } from 'lowdb'
import { JSONFileSyncPreset } from 'lowdb/node'
import { clamp, filter, get, map, orderBy, slice } from 'lodash-es'

/**
 * 数据库配置选项
 */
export interface DBConfig {
  dbDir?: string
  cacheDir: string
}

/**
 * 数据库基类
 */
export abstract class BaseDB<T extends object> {
  protected static instances: Map<string, BaseDB<any>> = new Map()
  protected db: LowSync<T>
  protected tableName: string

  protected constructor(
    tableName: string,
    defaultData: T,
    config: DBConfig,
  ) {
    this.tableName = tableName

    const dbDir = config.dbDir || path.resolve(config.cacheDir, 'db')
    fs.mkdirSync(dbDir, { recursive: true })

    const filePath = path.join(dbDir, `${tableName}.json`)
    this.db = JSONFileSyncPreset<T>(filePath, defaultData)
    // init write
    this.db.write()
  }

  /**
   * 获取单例实例
   */
  protected static getInstance<DB extends BaseDB<any>>(
    this: new (config: DBConfig) => DB,
    key: string,
    config: DBConfig,
  ): DB {
    if (!BaseDB.instances.has(key)) {
      BaseDB.instances.set(key, new this(config))
    }
    return BaseDB.instances.get(key) as DB
  }

  getData(): T {
    return this.db.data
  }

  save(): void {
    this.db.write()
  }

  reset(defaultData: T): void {
    this.db.data = defaultData
    this.save()
  }

  getPaginatedItems<K extends string, V>(
    data: Record<K, V>,
    page: number = 1,
    pageSize: number = 10,
    searchOptions?: {
      searchVal?: string
      searchFields?: string[]
      sortBy?: string
      sortDesc?: boolean
    },
  ): {
    items: { key: string; value: V }[]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
    }
  } {
    // 将对象转换为数组
    let items = map(data, (value, key) => ({
      key,
      value,
    }))

    // 搜索过滤
    if (searchOptions?.searchVal) {
      const searchVal = searchOptions.searchVal.toLowerCase()
      const searchFields = searchOptions.searchFields || []

      items = filter(items, item => {
        // 默认搜索key
        if (String(item.key).toLowerCase().includes(searchVal)) {
          return true
        }

        // 搜索指定字段
        if (searchFields.length > 0) {
          return searchFields.some(field => {
            const fieldValue = get(item.value, field)
            return (
              fieldValue && String(fieldValue).toLowerCase().includes(searchVal)
            )
          })
        }

        // 全文搜索
        return JSON.stringify(item.value).toLowerCase().includes(searchVal)
      })
    }

    // 排序
    if (searchOptions?.sortBy) {
      const sortPath =
        searchOptions.sortBy === 'key' ? 'key' : `value.${searchOptions.sortBy}`
      items = orderBy(
        items,
        [sortPath],
        [searchOptions.sortDesc ? 'desc' : 'asc'],
      )
    }

    // 计算分页信息
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const validPage = clamp(page, 1, totalPages)

    // 分页
    const paginatedItems = slice(
      items,
      (validPage - 1) * pageSize,
      validPage * pageSize,
    )

    return {
      items: paginatedItems.map(item => ({
        key: item.key,
        value: item.value,
      })),
      pagination: {
        total,
        page: validPage,
        pageSize,
        totalPages,
      },
    }
  }
}
