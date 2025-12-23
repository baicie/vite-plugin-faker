export * from './utils'
export * from './ws'
export * from './lodash'

/**
 * 分页查询接口
 */
export interface PageQuery {
  page: number
  pageSize: number
}

/**
 * 仪表盘查询接口
 */
export interface DashboardQuery extends PageQuery {
  search?: string
}

export type WithId<T> = T & { id: string }
/**
 * 分页响应接口
 */
export interface Page<T> {
  items: T[]
  pagination: Pagination
}

/**
 * 分页信息接口
 */
export interface Pagination {
  total: number
  page: number
  pageSize: number
  totalPages?: number
}

export const MSWWORKER = 'msw-worker'
