import type { DashboardQuery, Page, RequestRecord } from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared'
import { useWsRequest } from '../hooks/use-ws-request'

/**
 * 获取请求历史（带分页）
 *
 * 后端对应：
 * - 发送类型：WSMessageType.REQUEST_HISTORY
 * - 响应类型：WSMessageType.REQUEST_HISTORY
 * - 请求数据：{ page, pageSize }
 * - 响应数据：Page<RequestRecord>
 */
export const fetchRequestHistory = useWsRequest<
  DashboardQuery,
  Page<RequestRecord>
>({
  sendType: WSMessageType.REQUEST_HISTORY,
  responseType: WSMessageType.REQUEST_HISTORY,
})
