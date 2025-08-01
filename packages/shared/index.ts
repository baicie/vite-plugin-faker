export * from './utils'
export * from './logger'

export enum ICustomEvent {
  custom = 'custom',
  request = 'request',
  response = 'response',
}

export enum IApi {
  dashboard = 'faker:dashboard',
  toggleMockStatus = 'faker:toggleMockStatus',
  previewMock = 'faker:previewMock',
  getSettings = 'faker:getSettings',
  saveSettings = 'faker:saveSettings',
  getMockByUrl = 'faker:getMockByUrl',
  mocks = 'faker:mocks',
  createMock = 'faker:createMock',
  updateMock = 'faker:updateMock',
  deleteMock = 'faker:deleteMock',
  clearCache = 'faker:clearCache',
  getMockConfig = 'faker:get-mock-config',
  mockRequest = 'faker:mock-request',
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
