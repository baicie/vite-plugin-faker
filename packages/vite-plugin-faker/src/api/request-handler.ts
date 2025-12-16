import type { DBManager } from '../db'
import type {
  DashboardQuery,
  Page,
  RequestRecord,
  WSMessage,
  WithId,
} from '@baicie/faker-shared'
import { EventBusType, WSMessageType } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'
import type { EventBus } from './types'
import { createRequestKey } from '@baicie/faker-shared'

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
      const id = await createRequestKey(data)

      requestsDB.saveRequest(id, this.toRequestItem(data))
      logger.debug(`[Faker] 请求已记录id: ${id}`)

      this.eventBus.emit(EventBusType.DB_REQUEST_SAVED, { id, ...data })
    } catch (error) {
      logger.error('[Faker] 保存请求记录失败:', error)
      throw error
    }
  }

  /**
   * 处理请求历史查询
   */
  handleHistory(data: WithId<DashboardQuery>): WSMessage<Page<RequestRecord>> {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      const { page = 1, pageSize = 20, id, search } = data

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
        id,
      }
    } catch (error) {
      logger.error('[Faker] 获取请求历史失败:', error)
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
