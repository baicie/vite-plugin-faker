import type { DBManager } from '../db'
import type { RequestRecord, WSMessage } from '@baicie/faker-shared'
import { EventBusType, WSMessageType } from '@baicie/faker-shared'
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

  /**
   * 处理请求记录（流程 1：Hack → Node）
   */
  handleRecorded(data: RequestRecord): void {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      const id =
        data.id ||
        `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      requestsDB.saveRequest(id, this.toRequestItem(data))
      logger.debug(`[Faker] 请求已记录: ${data.method} ${data.url}`)

      // 触发数据库变更事件
      this.eventBus.emit(EventBusType.DB_REQUEST_SAVED, { id, ...data })
    } catch (error) {
      logger.error('[Faker] 保存请求记录失败:', error)
      throw error
    }
  }

  /**
   * 处理请求历史查询
   */
  handleHistory(data: any, id?: string): WSMessage {
    try {
      const requestsDB = this.dbManager.getRequestsDB()
      const { page = 1, pageSize = 20 } = data || {}

      const result = requestsDB.getRequestsWithPagination(
        page,
        pageSize,
        undefined,
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
