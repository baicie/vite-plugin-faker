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
    let response: WSMessage | undefined

    switch (message.type) {
      case WSMessageType.REQUEST_RECORDED:
        await this.requestHandler.handleRecorded(message.data)
        break

      case WSMessageType.MOCK_CREATE:
        response = this.mockHandler.handleCreate(message.data)
        break

      case WSMessageType.MOCK_UPDATE:
        response = this.mockHandler.handleUpdate(message.data)
        break

      case WSMessageType.MOCK_DELETE:
        response = this.mockHandler.handleDelete(message.data)
        break

      case WSMessageType.MOCK_LIST:
        response = this.mockHandler.handleList(message.data)
        break

      case WSMessageType.MOCK_GET:
        response = this.mockHandler.handleGet(message.data)
        break

      case WSMessageType.MOCK_EXPORT:
        response = this.mockHandler.handleExport()
        break

      case WSMessageType.MOCK_IMPORT:
        response = this.mockHandler.handleImport(message.data)
        break

      case WSMessageType.MOCK_GROUPS_GET:
        response = this.mockHandler.handleGetGroups()
        break

      case WSMessageType.MOCK_GROUPS_STATS_GET:
        response = this.mockHandler.handleGetGroupStats()
        break

      case WSMessageType.MOCK_TAGS_GET:
        response = this.mockHandler.handleGetTags()
        break

      case WSMessageType.REQUEST_HISTORY:
        response = this.requestHandler.handleHistory(message.data)
        break

      case WSMessageType.REQUEST_CLEAR:
        response = this.requestHandler.handleClear()
        break

      case WSMessageType.SETTINGS_GET:
        response = this.settingsHandler.handleGet()
        break

      case WSMessageType.SETTINGS_UPDATE:
        response = this.settingsHandler.handleUpdate(message.data)
        break

      case WSMessageType.SETTINGS_CLEAR_CACHE:
        response = this.settingsHandler.handleClearCache()
        break

      case WSMessageType.FAKERAPIS:
        response = this.settingsHandler.handleFakerApis()
        break

      default:
        logger.warn(`[Faker] 未知消息类型: ${message.type}`)
    }

    if (response) {
      response.id = message.id
    }

    return response
  }

  getAllMockConfigs(): MockConfig[] {
    return this.mockHandler.getAllConfigs()
  }
}

// 导出类型
export type { EventBus } from './types'
