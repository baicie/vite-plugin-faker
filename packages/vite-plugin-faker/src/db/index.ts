import path from 'node:path'
import fs from 'node:fs'
import { ensureDirSync } from '@baicie/faker-shared/node'
import { _baseDir, cacheDir } from '../index'
import { RequestsDB } from './request'
import { SettingsDB } from './setting'
import { MocksDB } from './mock'

export class DBManager {
  private static instance: DBManager

  private constructor() {
    this.initDatabases()
  }

  static getInstance(): DBManager {
    ensureDirSync(cacheDir)
    ensureDirSync(_baseDir)
    if (!DBManager.instance) {
      DBManager.instance = new DBManager()
    }
    return DBManager.instance
  }

  private initDatabases(): void {
    const settings = SettingsDB.getInstance()
    settings.migrateIfNeeded()
    RequestsDB.getInstance()
    MocksDB.getInstance()
  }

  getSettingsDB(): SettingsDB {
    return SettingsDB.getInstance()
  }

  getRequestsDB(): RequestsDB {
    return RequestsDB.getInstance()
  }

  getMocksDB(): MocksDB {
    return MocksDB.getInstance()
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
