import { BaseDB } from './base'
import type { Settings } from './types'
import type { DBConfig } from './base'

/**
 * 设置数据库
 * 存储系统设置
 */
export class SettingsDB extends BaseDB<Settings> {
  private static instance: SettingsDB
  private static readonly INSTANCE_KEY = 'SettingsDB'

  private constructor(config: DBConfig) {
    super('settings', { version: 1, theme: 'light' }, config)
  }

  static getInstance(config: DBConfig): SettingsDB {
    if (!SettingsDB.instance) {
      SettingsDB.instance = new SettingsDB(config)
    }
    return SettingsDB.instance
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
}
