import type { DashboardQuery } from '@baicie/faker-shared'
import type { DBManager } from '../../db'

// 处理仪表盘数据请求
export function getDashboard(data: unknown, dbManager: DBManager): any {
  const params = data as DashboardQuery

  return dbManager
    .getRequestsDB()
    .getRequestsWithPagination(params.page, params.pageSize, params.search)
}
