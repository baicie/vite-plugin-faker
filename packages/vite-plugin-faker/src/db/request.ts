import { BaseDB } from './base'
import type { RequestItem } from './types'
import type { DBConfig } from './base'
import type { Page, RequestRecord } from '@baicie/faker-shared'

/**
 * 请求记录数据库
 * 存储请求历史记录
 */
export class RequestsDB extends BaseDB<Record<string, RequestItem>> {
  private static instance: RequestsDB

  private constructor(config: DBConfig) {
    super('requests', {}, config)
  }

  static getInstance(config: DBConfig): RequestsDB {
    if (!RequestsDB.instance) {
      RequestsDB.instance = new RequestsDB(config)
    }
    return RequestsDB.instance
  }

  getRequest(url: string): RequestItem | undefined {
    return this.db.data[url]
  }

  // 保存请求记录
  saveRequest(id: string, item: RequestItem): void {
    this.db.data[id] = item
    this.save()
  }

  // 更新请求记录
  updateRequest(url: string, partial: Partial<RequestItem>): void {
    if (this.db.data[url]) {
      this.db.data[url] = { ...this.db.data[url], ...partial }
      this.save()
    }
  }

  // 删除请求记录
  deleteRequest(url: string): boolean {
    if (this.db.data[url]) {
      delete this.db.data[url]
      this.save()
      return true
    }
    return false
  }

  getRequestsWithPagination(
    page: number = 1,
    pageSize: number = 10,
    searchVal?: string,
    sortBy: string = 'timestamp',
    sortDesc: boolean = true,
  ): Page<RequestRecord> {
    const result = this.getPaginatedItems(this.db.data, page, pageSize, {
      searchVal,
      searchFields: ['req.method', 'req.path'], // 可以指定搜索的特定字段
      sortBy,
      sortDesc,
    })

    const records: RequestRecord[] = result.items.map(function (item) {
      return RequestsDB.toRequestRecord(item.key, item.value)
    })

    return {
      items: records,
      pagination: result.pagination,
    }
  }

  private static toRequestRecord(id: string, item: RequestItem): RequestRecord {
    return {
      id,
      url: (item.req && (item.req as any).url) || '',
      method: (item.req && (item.req as any).method) || 'GET',
      headers: (item.req && (item.req as any).headers) || {},
      query: item.req ? (item.req as any).query : undefined,
      body: item.req ? (item.req as any).body : undefined,
      response: item.res
        ? {
            statusCode: (item.res as any).statusCode,
            headers: (item.res as any).headers || {},
            body: (item.res as any).body,
          }
        : undefined,
      duration: item.duration,
      isMocked: item.req ? (item.req as any).isMocked : undefined,
      mockId: item.req ? (item.req as any).mockId : undefined,
      timestamp: item.timestamp || Date.now(),
    }
  }

  clear(): void {
    this.db.data = {}
    this.save()
  }
}
