import { ensureDirSync } from '@baicie/faker-shared/node'
import fs from 'node:fs'
import path from 'node:path'
import { cacheDir } from '../index'
import type { DBConfig } from './base'
import { MocksDB } from './mock'
import { RequestsDB } from './request'
import { SettingsDB } from './setting'

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
      dbDir: baseDir,
    })
  }

  /**
   * 获取单例实例
   */
  static getInstance(cacheDir: string, baseDir: string): DBManager {
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

    fs.mkdirSync(path.join(dbDir, 'backups'), { recursive: true })

    fs.copyFileSync(sourcePath, backupPath)
    return backupPath
  }
}
