export * from './utils'

export enum ICustomEvent {
  custom = 'custom',
  request = 'request',
  response = 'response',
}

export enum IApi {
  dashboard = '/api/dashboard',
  toggleMockStatus = '/api/toggleMockStatus',
  previewMock = '/api/previewMock',
  getSettings = '/api/getSettings',
  saveSettings = '/api/saveSettings',
  mocks = '/api/mocks',
  createMock = '/api/createMock',
  updateMock = '/api/updateMock',
  deleteMock = '/api/deleteMock',
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
  error?: string
}

export interface IRequest<T> {
  uuid?: string
  url?: string
  data: T
}
