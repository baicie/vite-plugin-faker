import type { IncomingHttpHeaders } from 'node:http'
import type { Connect } from 'vite'
//#region apis
export interface PageQuery {
  page: number
  pageSize: number
}

export interface DashboardQuery extends PageQuery {
  search?: string
}

export type WithId<T> = T & { id: string }

export interface Page<T> {
  items: T[]
  pagination: Pagination
}

export interface Pagination {
  total: number
  page: number
  pageSize: number
  totalPages?: number
}
//#endregion
//#region ws
export interface WSMessage<T = any> {
  type: WSMessageType
  data?: T
  id?: string
}

export enum WSMessageType {
  // Hack → Node
  REQUEST_RECORDED,

  // UI → Node
  MOCK_CREATE,
  MOCK_UPDATE,
  MOCK_DELETE,
  MOCK_LIST,
  REQUEST_HISTORY,
  SETTINGS_GET,
  SETTINGS_UPDATE,
  SETTINGS_CLEAR_CACHE,

  // Node → UI (响应)
  MOCK_CREATED,
  MOCK_UPDATED,
  MOCK_DELETED,
  ERROR,

  // Node → Hack/UI (广播)
  MOCK_CONFIG_UPDATED,

  // FakerApis -> UI
  FAKERAPIS,
}
//#endregion

//#region record
export interface RequestRecord {
  id?: string
  url: string
  method: string
  headers: Record<string, string>
  query?: Record<string, string>
  body?: any
  response?: {
    statusCode: number
    headers: Record<string, string>
    body: any
  }
  duration?: number
  isMocked?: boolean
  mockId?: string
  timestamp: number
}
//#endregion
//#region mock
export type MockKey = `${string}-${string}`

export type MockType =
  | 'static'
  // | 'proxy'
  | 'template' // fakerjs
  | 'function' // js script
  | 'error'
  | 'stateful'

export interface BaseMockConfig {
  id?: string // uni use for record / replay / UI
  type: MockType
  enabled: boolean
  name?: string
  description?: string
}

interface MockResponse<T = any> {
  status: number
  headers?: Record<string, string>
  body: T
  delay?: number
}

export interface StaticMockConfig<T = any> extends BaseMockConfig {
  type: 'static'
  response: MockResponse<T>
}

// export interface ProxyMockConfig extends BaseMockConfig {
//   type: 'proxy'
//   target: string // 代理目标 URL
//   rewriteHeaders?: boolean // 是否透传 headers
//   modifyResponse?: (res: any) => any // 可选 response 修改器
// }

export interface FunctionMockConfig<T = any> extends BaseMockConfig {
  type: 'function'
  handler: (ctx: MockContext) => MockResponse<T> | Promise<MockResponse<T>>
}

export interface TemplateMockConfig extends BaseMockConfig {
  type: 'template'
  schema: Record<
    string,
    {
      module: string
      method: string
      args?: Record<string, any>
    }
  >
  count?: number
}

export interface ErrorMockConfig extends BaseMockConfig {
  type: 'error'
  response: MockResponse
}

export interface StatefulMockConfig extends BaseMockConfig {
  type: 'stateful'
  states: MockResponse[]
  current?: number
}

export type MockConfig<T = any> =
  | StaticMockConfig<T>
  | FunctionMockConfig<T>
  | TemplateMockConfig
  | ErrorMockConfig
  | StatefulMockConfig

export interface MockContext {
  req: Connect.IncomingMessage
  url: string
  method?: string
  headers: IncomingHttpHeaders
  query: QueryObject
  body: ParsedBody
}

//#endregion
//#region generate
export interface GeneratedResponse<T = any> {
  status: number
  headers: Record<string, string>
  body: T
  delay: number
  source: MockType
  meta?: {
    mockId?: string
    timestamp: number
  }
}
export type ResponseGenerator = (
  mock: MockConfig,
  ctx: MockContext,
) => Promise<GeneratedResponse>
//#endregion
//#region query&body
type QueryPrimitive = string | number | boolean | null

type QueryValue = QueryPrimitive | QueryPrimitive[] | QueryObject

export interface QueryObject {
  [key: string]: QueryValue
}

export type ParsedBody = undefined | string | Record<string, any> | any[]
//#endregion
//#region event
export enum EventBusType {
  DB_MOCK_CREATED,
  DB_MOCK_UPDATED,
  DB_MOCK_DELETED,
  DB_REQUEST_SAVED,
  DB_SETTINGS_UPDATED,
  DB_CACHE_CLEARED,
}

export interface EventBusEvent {
  type: EventBusType
  data?: any
  timestamp?: number
}
//#endregion
