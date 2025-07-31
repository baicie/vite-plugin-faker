export * from './utils'

export enum ICustomEvent {
  custom = 'custom',
  request = 'request',
  response = 'response',
}

export enum IApi {
  dashboard = '/api/dashboard',
}

export interface PageQuery {
  page: number
  pageSize: number
}

export interface DashboardQuery extends PageQuery {
  search: string
}

export interface Page<T> {
  data: T[]
  query: PageQuery
}

export interface IResponse<T> {
  uuid: string
  data: T
}

export interface IRequest<T> {
  uuid?: string
  url?: string
  data: T
}
