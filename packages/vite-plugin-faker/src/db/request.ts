import { BaseDB } from './base'

interface RequestItem {
  req: Record<string, any>
  res: Record<string, any> | null
  timestamp?: number
  duration?: number
  isProxy?: boolean
  error?: any
}

export class RequestsDB extends BaseDB<Record<string, RequestItem>> {
  private static instance: RequestsDB

  private constructor() {
    super('requests', {})
  }

  static getInstance(): RequestsDB {
    if (!RequestsDB.instance) {
      RequestsDB.instance = new RequestsDB()
    }
    return RequestsDB.instance
  }

  // 获取特定URL的请求
  getRequest(url: string): RequestItem | undefined {
    return this.db.data[url]
  }

  // 保存请求记录
  saveRequest(url: string, item: RequestItem): void {
    this.db.data[url] = item
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
  ): {
    items: { key: string; value: RequestItem }[]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
    }
  } {
    return this.getPaginatedItems(this.db.data, page, pageSize, {
      searchVal,
      searchFields: ['req.method', 'req.path'], // 可以指定搜索的特定字段
      sortBy,
      sortDesc,
    })
  }

  clear(): void {
    this.db.data = {}
    this.save()
  }
}
