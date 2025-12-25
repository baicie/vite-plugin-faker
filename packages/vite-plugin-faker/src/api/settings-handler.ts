import type { DBManager } from '../db'
import type { FakerMethodMap, WSMessage } from '@baicie/faker-shared'
import {
  EventBusType,
  WSMessageType,
  fakerMethodMap,
} from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import type { EventBus } from './types'

/**
 * 设置相关消息处理器
 */
export class SettingsHandler {
  constructor(
    private dbManager: DBManager,
    private eventBus: EventBus,
  ) {}

  /**
   * 处理获取设置
   */
  handleGet(id?: string): WSMessage {
    try {
      const settingsDB = this.dbManager.getSettingsDB()
      const settings = settingsDB.getSettings()

      return {
        type: WSMessageType.SETTINGS_GET,
        data: settings,
        id,
      }
    } catch (error) {
      logger.error('[Faker] 获取设置失败:', error)
      throw error
    }
  }

  /**
   * 处理设置更新
   */
  handleUpdate(data: any, id?: string): WSMessage {
    try {
      const settingsDB = this.dbManager.getSettingsDB()
      settingsDB.updateSettings(data)

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_SETTINGS_UPDATED, data)

      return {
        type: WSMessageType.SETTINGS_UPDATE,
        data: { success: true },
        id,
      }
    } catch (error) {
      logger.error('[Faker] 更新设置失败:', error)
      throw error
    }
  }

  handleClearCache(): WSMessage {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      requestsDB.clear()

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_CACHE_CLEARED)

      return {
        type: WSMessageType.SETTINGS_CLEAR_CACHE,
        data: { success: true },
      }
    } catch (error) {
      logger.error('[Faker] 清除缓存失败:', error)
      throw error
    }
  }

  handleFakerApis(): WSMessage<FakerMethodMap> {
    return {
      type: WSMessageType.FAKERAPIS,
      data: fakerMethodMap,
    }
  }
}
