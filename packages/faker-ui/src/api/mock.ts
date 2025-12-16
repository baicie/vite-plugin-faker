import type { DashboardQuery, MockConfig, Page } from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared'
import { useWsRequest } from '../hooks/use-ws-request'

export const createMock = useWsRequest<MockConfig>({
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
export const updateMock = useWsRequest<
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
export const deleteMock = useWsRequest<{ id: string }, { success: boolean }>({
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
export const fetchMockList = useWsRequest<DashboardQuery, Page<MockConfig>>({
  sendType: WSMessageType.MOCK_LIST,
  responseType: WSMessageType.MOCK_LIST,
})
