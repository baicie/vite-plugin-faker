import path from 'node:path'
import fs from 'node:fs'
import { JSONFileSyncPreset } from 'lowdb/node'
import type { LowSync } from 'lowdb'
import _ from 'lodash'
import { cacheDir } from './index'

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

interface Settings {
  version: number
  theme?: 'light' | 'dark'
  // 其他设置项...
}

export class SettingsDB extends BaseDB<Settings> {
  private static instance: SettingsDB

  private constructor() {
    super('settings', { version: 1, theme: 'light' })
  }

  static getInstance(): SettingsDB {
    if (!SettingsDB.instance) {
      SettingsDB.instance = new SettingsDB()
    }
    return SettingsDB.instance
  }

  // 获取版本号
  getVersion(): number {
    return this.db.data.version
  }

  // 更新设置
  updateSettings(settings: Partial<Settings>): void {
    this.db.data = { ...this.db.data, ...settings }
    this.save()
  }

  // 迁移数据库版本
  migrateIfNeeded(): void {
    const currentVersion = this.getVersion()

    if (currentVersion < 2) {
      // 执行版本1到版本2的迁移
      console.log('正在迁移数据库从v1到v2...')
      // 迁移逻辑...

      this.db.data.version = 2
      this.save()
    }

    // 未来可以添加更多版本迁移...
  }
}

interface RequestItem {
  req: Record<string, any>
  res: Record<string, any>
  timestamp?: number
}

export class RequestsDB extends BaseDB<Record<string, RequestItem>> {
  private static instance: RequestsDB

  private constructor() {
    super('requests', {})
  }

  static getInstance(): RequestsDB {
    if (!RequestsDB.instance) {
      RequestsDB.instance = new RequestsDB()
    }
    return RequestsDB.instance
  }

  // 获取特定URL的请求
  getRequest(url: string): RequestItem | undefined {
    return this.db.data[url]
  }

  // 保存请求记录
  saveRequest(url: string, item: RequestItem): void {
    this.db.data[url] = item
    this.save()
  }

  // 更新请求记录
  updateRequest(url: string, partial: Partial<RequestItem>): void {
    if (this.db.data[url]) {
      this.db.data[url] = { ...this.db.data[url], ...partial }
      this.save()
    }
  }

  // 删除请求记录
  deleteRequest(url: string): boolean {
    if (this.db.data[url]) {
      delete this.db.data[url]
      this.save()
      return true
    }
    return false
  }

  getRequestsWithPagination(
    page: number = 1,
    pageSize: number = 10,
    searchVal?: string,
    sortBy: string = 'timestamp',
    sortDesc: boolean = true,
  ): {
    items: { key: string; value: RequestItem }[]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
    }
  } {
    return this.getPaginatedItems(this.db.data, page, pageSize, {
      searchVal,
      searchFields: ['req.method', 'req.path'], // 可以指定搜索的特定字段
      sortBy,
      sortDesc,
    })
  }
}

export class DBManager {
  private static instance: DBManager

  private constructor() {
    this.initDatabases()
  }

  static getInstance(): DBManager {
    if (!DBManager.instance) {
      DBManager.instance = new DBManager()
    }
    return DBManager.instance
  }

  private initDatabases(): void {
    const settings = SettingsDB.getInstance()
    settings.migrateIfNeeded()
    RequestsDB.getInstance()
  }

  getSettingsDB(): SettingsDB {
    return SettingsDB.getInstance()
  }

  getRequestsDB(): RequestsDB {
    return RequestsDB.getInstance()
  }

  backupDatabase(tableName: string): string {
    const dbDir = path.resolve(cacheDir, 'db')
    const sourcePath = path.join(dbDir, `${tableName}.json`)
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_')
    const backupPath = path.join(
      dbDir,
      'backups',
      `${tableName}_${timestamp}.json`,
    )

    // 确保备份目录存在
    fs.mkdirSync(path.join(dbDir, 'backups'), { recursive: true })

    // 复制文件
    fs.copyFileSync(sourcePath, backupPath)
    return backupPath
  }
}
