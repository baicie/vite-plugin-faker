import type { DashboardQuery, MockConfig, Page } from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared/browser'
import { useWsRequest } from '../hooks/use-ws-request'
import type { WsRequest } from '../hooks/use-ws-request'

export const createMock: WsRequest<MockConfig, MockConfig> =
  useWsRequest<MockConfig>({
    sendType: WSMessageType.MOCK_CREATE,
    responseType: WSMessageType.MOCK_CREATED,
  })

/**
 * 更新 Mock
 *
 * 后端：
 * - 发送类型：WSMessageType.MOCK_UPDATE
 * - 响应类型：WSMessageType.MOCK_UPDATED
 * - 请求数据：{ id, updates }
 * - 响应数据：{ success: boolean }
 */
export const updateMock: WsRequest<
  { id: string; updates: Partial<MockConfig> },
  { success: boolean }
> = useWsRequest<
  { id: string; updates: Partial<MockConfig> },
  { success: boolean }
>({
  sendType: WSMessageType.MOCK_UPDATE,
  responseType: WSMessageType.MOCK_UPDATED,
})

/**
 * 删除 Mock
 *
 * 后端：
 * - 发送类型：WSMessageType.MOCK_DELETE
 * - 响应类型：WSMessageType.MOCK_DELETED
 * - 请求数据：{ id }
 * - 响应数据：{ success: boolean }
 */
export const deleteMock: WsRequest<{ id: string }, { success: boolean }> =
  useWsRequest<{ id: string }, { success: boolean }>({
    sendType: WSMessageType.MOCK_DELETE,
    responseType: WSMessageType.MOCK_DELETED,
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
export const importMocks: WsRequest<
  MockConfig[],
  { success: boolean; count: number }
> = useWsRequest<MockConfig[], { success: boolean; count: number }>({
  sendType: WSMessageType.MOCK_IMPORT,
  responseType: WSMessageType.MOCK_IMPORTED,
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
