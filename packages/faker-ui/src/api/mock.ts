import type { DashboardQuery, MockConfig, Page } from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared/browser'
import { useWsRequest } from '../hooks/use-ws-request'
import type { WsRequest } from '../hooks/use-ws-request'

interface MockOperationResult<T = MockConfig> {
  success: boolean
  mock?: T
  error?: string
}

interface MockImportResult {
  success: boolean
  count: number
  error?: string
}

interface SimpleResult {
  success: boolean
  error?: string
}

const FAILURE_OPTIONS = { rejectOnFailure: true } as const

export const createMock: WsRequest<MockConfig, MockConfig> = useWsRequest<
  MockConfig,
  MockOperationResult<MockConfig>
>({
  sendType: WSMessageType.MOCK_CREATE,
  responseType: WSMessageType.MOCK_CREATED,
  options: FAILURE_OPTIONS,
})

/**
 * 更新 Mock
 *
 * 后端：
 * - 发送类型：WSMessageType.MOCK_UPDATE
 * - 响应类型：WSMessageType.MOCK_UPDATED
 * - 请求数据：{ id, updates }
 * - 响应数据：{ success: boolean, error?: string }
 */
export const updateMock: WsRequest<
  { id: string; updates: Partial<MockConfig> },
  SimpleResult
> = useWsRequest<{ id: string; updates: Partial<MockConfig> }, SimpleResult>({
  sendType: WSMessageType.MOCK_UPDATE,
  responseType: WSMessageType.MOCK_UPDATED,
  options: FAILURE_OPTIONS,
})

/**
 * 删除 Mock
 *
 * 后端：
 * - 发送类型：WSMessageType.MOCK_DELETE
 * - 响应类型：WSMessageType.MOCK_DELETED
 * - 请求数据：{ id }
 * - 响应数据：{ success: boolean, error?: string }
 */
export const deleteMock: WsRequest<{ id: string }, SimpleResult> = useWsRequest<
  { id: string },
  SimpleResult
>({
  sendType: WSMessageType.MOCK_DELETE,
  responseType: WSMessageType.MOCK_DELETED,
  options: FAILURE_OPTIONS,
})

/**
 * 分页查询 Mock 列表
 *
 * 后端：
 * - 发送类型：WSMessageType.MOCK_LIST
 * - 响应类型：WSMessageType.MOCK_LIST
 * - 请求数据：{ page, pageSize, search? }
 * - 响应数据：Page<MockConfig>
 */
export const fetchMockList: WsRequest<
  DashboardQuery,
  Page<MockConfig>
> = useWsRequest<DashboardQuery, Page<MockConfig>>({
  sendType: WSMessageType.MOCK_LIST,
  responseType: WSMessageType.MOCK_LIST,
})

/**
 * 获取 Mock 详情
 */
export const fetchMock: WsRequest<{ id: string }, MockConfig> = useWsRequest<
  { id: string },
  MockConfig
>({
  sendType: WSMessageType.MOCK_GET,
  responseType: WSMessageType.MOCK_DETAIL,
})

/**
 * 导出 Mock
 */
export const exportMocks: WsRequest<void, MockConfig[]> = useWsRequest<
  void,
  MockConfig[]
>({
  sendType: WSMessageType.MOCK_EXPORT,
  responseType: WSMessageType.MOCK_EXPORTED,
})

/**
 * 导入 Mock
 */
export const importMocks: WsRequest<MockConfig[], MockImportResult> =
  useWsRequest<MockConfig[], MockImportResult>({
    sendType: WSMessageType.MOCK_IMPORT,
    responseType: WSMessageType.MOCK_IMPORTED,
    options: FAILURE_OPTIONS,
  })

/**
 * 获取所有分组
 */
export const fetchGroups: WsRequest<void, string[]> = useWsRequest<
  void,
  string[]
>({
  sendType: WSMessageType.MOCK_GROUPS_GET,
  responseType: WSMessageType.MOCK_LIST,
})

/**
 * 获取分组统计
 */
export const fetchGroupStats: WsRequest<
  void,
  Record<string, number>
> = useWsRequest<void, Record<string, number>>({
  sendType: WSMessageType.MOCK_GROUPS_STATS_GET,
  responseType: WSMessageType.MOCK_LIST,
})

/**
 * 获取所有标签
 */
export const fetchTags: WsRequest<void, string[]> = useWsRequest<
  void,
  string[]
>({
  sendType: WSMessageType.MOCK_TAGS_GET,
  responseType: WSMessageType.MOCK_LIST,
})
