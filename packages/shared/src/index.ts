export { extend } from 'lodash-es'
export * from './utils'
export * from './ws-types'

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

/**
 * 分页响应接口
 */
export interface Page<T> {
  data: T[]
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

export const wsPath = '@faker-ws'
