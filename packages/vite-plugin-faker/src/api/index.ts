import type { WSMessage } from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import type { DBManager } from '../db'
import { MockHandler } from './mock-handler'
import { RequestHandler } from './request-handler'
import { SettingsHandler } from './settings-handler'
import type { EventBus } from './types'

/**
 * WebSocket 消息处理器
 * 统一管理所有消息类型的处理
 */
export class WSMessageHandler {
  private mockHandler: MockHandler
  private settingsHandler: SettingsHandler
  private requestHandler: RequestHandler

  constructor(dbManager: DBManager, eventBus: EventBus) {
    this.mockHandler = new MockHandler(dbManager, eventBus)
    this.settingsHandler = new SettingsHandler(dbManager, eventBus)
    this.requestHandler = new RequestHandler(dbManager, eventBus)
  }

  /**
   * 处理 WebSocket 消息
   */
  handleMessage(message: WSMessage): WSMessage | void {
    switch (message.type) {
      case WSMessageType.REQUEST_RECORDED:
        this.requestHandler.handleRecorded(message.data)
        return // 请求记录不需要响应

      case WSMessageType.MOCK_CREATE:
        return this.mockHandler.handleCreate(message.data, message.id)

      case WSMessageType.MOCK_UPDATE:
        return this.mockHandler.handleUpdate(message.data, message.id)

      case WSMessageType.MOCK_DELETE:
        return this.mockHandler.handleDelete(message.data, message.id)

      case WSMessageType.MOCK_LIST:
        return this.mockHandler.handleList(message.data, message.id)

      case WSMessageType.REQUEST_HISTORY:
        return this.requestHandler.handleHistory(message.data, message.id)

      case WSMessageType.SETTINGS_GET:
        return this.settingsHandler.handleGet(message.id)

      case WSMessageType.SETTINGS_UPDATE:
        return this.settingsHandler.handleUpdate(message.data, message.id)

      case WSMessageType.SETTINGS_CLEAR_CACHE:
        return this.settingsHandler.handleClearCache(message.id)

      default:
        logger.warn(`[Faker] 未知消息类型: ${message.type}`)
        throw new Error(`未知消息类型: ${message.type}`)
    }
  }

  /**
   * 获取所有 Mock 配置（用于广播）
   */
  getAllMockConfigs() {
    return this.mockHandler.getAllConfigs()
  }
}

// 导出类型
export type { EventBus } from './types'
