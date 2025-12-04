import { BaseDB } from './base'
import type { Settings } from './types'
import type { DBConfig } from './base'

/**
 * 设置数据库
 * 存储系统设置
 */
export class SettingsDB extends BaseDB<Settings> {
  private static readonly INSTANCE_KEY = 'SettingsDB'

  private constructor(config: DBConfig) {
    super('settings', { version: 1, theme: 'light' }, config)
  }

  static getInstance(config: DBConfig): SettingsDB {
    return BaseDB.getInstance(SettingsDB.INSTANCE_KEY, SettingsDB, config)
  }

  getVersion(): number {
    return this.db.data.version
  }

  getSettings(): Settings {
    return { ...this.db.data }
  }

  updateSettings(settings: Partial<Settings>): void {
    this.db.data = { ...this.db.data, ...settings }
    this.save()
  }

  migrateIfNeeded(): void {
    const currentVersion = this.getVersion()

    if (currentVersion < 2) {
      this.db.data.version = 2
      this.save()
    }
  }
}
