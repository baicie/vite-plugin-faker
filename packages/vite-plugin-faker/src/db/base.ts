import path from 'node:path'
import fs from 'node:fs'
import type { LowSync } from 'lowdb'
import { JSONFileSyncPreset } from 'lowdb/node'
import _ from 'lodash'
import { cacheDir } from '../index'

export abstract class BaseDB<T extends object> {
  protected db: LowSync<T>
  protected tableName: string

  constructor(tableName: string, defaultData: T) {
    this.tableName = tableName

    const dbDir = path.resolve(cacheDir, 'db')
    fs.mkdirSync(dbDir, { recursive: true })

    const filePath = path.join(dbDir, `${tableName}.json`)
    this.db = JSONFileSyncPreset<T>(filePath, defaultData)
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
    let items = _.map(data, (value, key) => ({
      key,
      value,
    }))

    // 搜索过滤
    if (searchOptions?.searchVal) {
      const searchVal = searchOptions.searchVal.toLowerCase()
      const searchFields = searchOptions.searchFields || []

      items = _.filter(items, item => {
        // 默认搜索key
        if (String(item.key).toLowerCase().includes(searchVal)) {
          return true
        }

        // 搜索指定字段
        if (searchFields.length > 0) {
          return searchFields.some(field => {
            const fieldValue = _.get(item.value, field)
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
      items = _.orderBy(
        items,
        [sortPath],
        [searchOptions.sortDesc ? 'desc' : 'asc'],
      )
    }

    // 计算分页信息
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const validPage = _.clamp(page, 1, totalPages)

    // 分页
    const paginatedItems = _.slice(
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
