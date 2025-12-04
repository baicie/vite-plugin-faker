import path from 'node:path'
import fs from 'node:fs'
import { ensureDirSync } from '@baicie/faker-shared/node'
import { RequestsDB } from './request'
import { SettingsDB } from './setting'
import { MocksDB } from './mock'
import type { DBConfig } from './base'

/**
 * 数据库管理器
 * 统一管理所有数据库实例
 */
export class DBManager {
  private static instance: DBManager
  private config: DBConfig
  private settingsDB: SettingsDB
  private requestsDB: RequestsDB
  private mocksDB: MocksDB

  private constructor(cacheDir: string, baseDir: string) {
    // 确保目录存在
    ensureDirSync(cacheDir)
    ensureDirSync(baseDir)

    this.config = {
      cacheDir,
      dbDir: path.resolve(cacheDir, 'db'),
    }

    // 初始化数据库实例
    this.settingsDB = SettingsDB.getInstance(this.config)
    this.requestsDB = RequestsDB.getInstance(this.config)
    this.mocksDB = MocksDB.getInstance({
      ...this.config,
      dbDir: baseDir, // Mocks 存储在 baseDir
    })

    // 执行迁移
    this.settingsDB.migrateIfNeeded()
  }

  /**
   * 获取单例实例
   */
  static getInstance(cacheDir: string, baseDir: string): DBManager {
    const key = `${cacheDir}:${baseDir}`
    if (!DBManager.instance) {
      DBManager.instance = new DBManager(cacheDir, baseDir)
    }
    return DBManager.instance
  }

  getSettingsDB(): SettingsDB {
    return this.settingsDB
  }

  getRequestsDB(): RequestsDB {
    return this.requestsDB
  }

  getMocksDB(): MocksDB {
    return this.mocksDB
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
