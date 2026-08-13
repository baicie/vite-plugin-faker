import type { DBManager } from '../db'
import type {
  DashboardQuery,
  Page,
  RequestRecord,
  WSMessage,
} from '@baicie/faker-shared'
import { EventBusType, WSMessageType, generateUUID } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import type { EventBus } from './types'

/**
 * 请求记录相关消息处理器
 */
export class RequestHandler {
  constructor(
    private dbManager: DBManager,
    private eventBus: EventBus,
  ) {}

  async handleRecorded(data: RequestRecord): Promise<void> {
    try {
      const requestsDB = this.dbManager.getRequestsDB()

      const id = generateUUID()
      requestsDB.saveRequest(id, this.toRequestItem(data))
      logger.debug(`[Faker] 请求已记录id: ${data.url}-${data.method}`)

      this.eventBus.emit(EventBusType.DB_REQUEST_SAVED, { id, ...data })
    } catch (error) {
      logger.error('[Faker] 保存请求记录失败:', error)
      throw error
    }
  }

  handleHistory(data?: DashboardQuery): WSMessage<Page<RequestRecord>> {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      const { page = 1, pageSize = 20, search } = data || {}

      const result = requestsDB.getRequestsWithPagination(
        page,
        pageSize,
        search,
        'timestamp',
        true,
      )

      return {
        type: WSMessageType.REQUEST_HISTORY,
        data: result,
      }
    } catch (error) {
      logger.error('[Faker] 获取请求历史失败:', error)
      throw error
    }
  }

  handleClear(): WSMessage<{ success: boolean }> {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      requestsDB.clear()
      this.eventBus.emit(EventBusType.DB_CACHE_CLEARED)

      return {
        type: WSMessageType.REQUEST_CLEARED,
        data: { success: true },
      }
    } catch (error) {
      logger.error('[Faker] 清空请求历史失败:', error)
      throw error
    }
  }

  private toRequestItem(record: RequestRecord) {
    return {
      req: {
        method: record.method,
        url: record.url,
        headers: record.headers,
        query: record.query,
        body: record.body,
        mockId: record.mockId,
        isMocked: record.isMocked,
        mockSource: record.mockSource,
      },
      res: record.response
        ? {
            statusCode: record.response.statusCode,
            headers: record.response.headers,
            body: record.response.body,
          }
        : null,
      timestamp: record.timestamp,
      duration: record.duration,
      isProxy: false,
    }
  }
}
