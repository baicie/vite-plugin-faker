import type { Pagination } from '@baicie/faker-shared'
import chokidar from 'chokidar'
import { clamp, filter, get, map, orderBy, slice } from 'lodash-es'
import type { LowSync } from 'lowdb'
import { JSONFileSyncPreset } from 'lowdb/node'
import fs from 'node:fs'
import path from 'node:path'

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
  protected dbFilePath: string

  protected constructor(tableName: string, defaultData: T, config: DBConfig) {
    this.tableName = tableName

    const dbDir = config.dbDir || path.resolve(config.cacheDir, 'db')
    fs.mkdirSync(dbDir, { recursive: true })

    this.dbFilePath = path.join(dbDir, `${tableName}.json`)
    this.db = JSONFileSyncPreset<T>(this.dbFilePath, defaultData)
    // init write
    this.db.write()
    this.setupWatcher()
  }

  private setupWatcher(): void {
    const watcher = chokidar.watch(this.dbFilePath, {
      persistent: true,
      ignoreInitial: true,
    })

    watcher.on('change', () => {
      try {
        this.db.read()
      } catch (error) {
        console.error(`Failed to reload DB file ${this.dbFilePath}:`, error)
      }
    })
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
    pagination: Pagination
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
