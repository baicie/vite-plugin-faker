import type { IncomingHttpHeaders } from 'node:http'
import type { Connect } from 'vite'
//#region apis
export interface PageQuery {
  page: number
  pageSize: number
}

export interface DashboardQuery extends PageQuery {
  search?: string
  group?: string
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
  MOCK_GET,
  REQUEST_HISTORY,
  REQUEST_CLEAR,
  SETTINGS_GET,
  SETTINGS_UPDATE,
  SETTINGS_CLEAR_CACHE,
  MOCK_EXPORT,
  MOCK_IMPORT,
  MOCK_GROUPS_GET, // 获取所有分组
  MOCK_GROUPS_STATS_GET, // 获取分组统计
  MOCK_TAGS_GET, // 获取所有标签

  // Node → UI (响应)
  MOCK_CREATED,
  MOCK_UPDATED,
  MOCK_DELETED,
  MOCK_DETAIL,
  MOCK_EXPORTED,
  MOCK_IMPORTED,
  REQUEST_CLEARED,
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
  | 'proxy'
  | 'template' // fakerjs
  | 'function' // js script
  | 'error'
  | 'stateful'

/**
 * URL 匹配类型
 */
export type UrlMatchType = 'exact' | 'wildcard' | 'regex' | 'prefix'

/**
 * 请求头匹配条件
 */
export interface HeaderMatchCondition {
  key: string
  value: string | string[]
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex'
}

/**
 * 查询参数匹配条件
 */
export interface QueryMatchCondition {
  key: string
  value: string | string[]
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists'
}

/**
 * 高级匹配规则
 */
export interface MatchRule {
  url?: {
    pattern: string
    type: UrlMatchType
  }
  headers?: HeaderMatchCondition[]
  query?: QueryMatchCondition[]
  body?: {
    path: string
    value: string
    operator: 'equals' | 'contains' | 'regex' | 'exists'
  }
}

export interface BaseMockConfig {
  id?: string // uni use for record / replay / UI
  url: string
  method: string
  type: MockType
  enabled: boolean
  name?: string
  description?: string
  /**
   * 匹配规则优先级（数字越大优先级越高）
   * @default 0
   */
  priority?: number
  /**
   * 高级匹配规则（当 url 和 method 无法精确匹配时使用）
   */
  matchRule?: MatchRule
  /**
   * 分组名称
   */
  group?: string
  /**
   * 标签（用于过滤和分类）
   */
  tags?: string[]
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

export interface ProxyMockConfig extends BaseMockConfig {
  type: 'proxy'
  target: string // 代理目标 URL
  rewriteHeaders?: boolean // 是否透传 headers
  rewriteStatus?: boolean // 是否透传 status
  modifyResponse?: (res: {
    status: number
    headers: Record<string, string>
    body: any
  }) => {
    status?: number
    headers?: Record<string, string>
    body?: any
  }
  timeout?: number // 请求超时时间（毫秒）
}

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
  | ProxyMockConfig
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
//#region vite-plugin-faker
export type UiOptionsMode = 'button' | 'route'
//#endregion
