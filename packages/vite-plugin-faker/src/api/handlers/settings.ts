import type { SystemSettings } from '../types'
import type { DBManager } from '../../db'

// 获取系统设置
export function getSettings(dbManager: DBManager): any {
  return dbManager.getSettingsDB().getData()
}

// 保存系统设置
export function saveSettings(data: unknown, dbManager: DBManager): any {
  const settings = data as SystemSettings
  dbManager.getSettingsDB().updateSettings(settings)
  return true
}

export function clearCache(dbManager: DBManager): any {
  dbManager.getRequestsDB().clear()
  return true
}
