import type { MockConfig, WSMessage } from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import type { DBManager } from '../db'
import { MockHandler } from './mock-handler'
import { RequestHandler } from './request-handler'
import { SettingsHandler } from './settings-handler'
import type { EventBus } from './types'

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
  async handleMessage(message: WSMessage): Promise<WSMessage | void> {
    switch (message.type) {
      case WSMessageType.REQUEST_RECORDED:
        await this.requestHandler.handleRecorded(message.data)
        return

      case WSMessageType.MOCK_CREATE:
        return this.mockHandler.handleCreate(message.data, message.id)

      case WSMessageType.MOCK_UPDATE:
        return this.mockHandler.handleUpdate(message.data, message.id)

      case WSMessageType.MOCK_DELETE:
        return this.mockHandler.handleDelete(message.data, message.id)

      case WSMessageType.MOCK_LIST:
        return this.mockHandler.handleList(message.data)

      case WSMessageType.REQUEST_HISTORY:
        return this.requestHandler.handleHistory(message.data)

      case WSMessageType.SETTINGS_GET:
        return this.settingsHandler.handleGet(message.id)

      case WSMessageType.SETTINGS_UPDATE:
        return this.settingsHandler.handleUpdate(message.data, message.id)

      case WSMessageType.SETTINGS_CLEAR_CACHE:
        return this.settingsHandler.handleClearCache()

      case WSMessageType.FAKERAPIS:
        return this.settingsHandler.handleFakerApis()

      default:
        logger.warn(`[Faker] 未知消息类型: ${message.type}`)
    }
  }

  getAllMockConfigs(): MockConfig[] {
    return this.mockHandler.getAllConfigs()
  }
}

// 导出类型
export type { EventBus } from './types'
