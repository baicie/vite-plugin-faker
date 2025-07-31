import { BaseDB } from './base'

interface Settings {
  version: number
  theme?: 'light' | 'dark'
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

  getVersion(): number {
    return this.db.data.version
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
