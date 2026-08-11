import type { DashboardQuery, Page, RequestRecord } from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared/browser'
import { useWsRequest } from '../hooks/use-ws-request'
import type { WsRequest } from '../hooks/use-ws-request'

/**
 * 获取请求历史（带分页）
 *
 * 后端对应：
 * - 发送类型：WSMessageType.REQUEST_HISTORY
 * - 响应类型：WSMessageType.REQUEST_HISTORY
 * - 请求数据：{ page, pageSize }
 * - 响应数据：Page<RequestRecord>
 */
export const fetchRequestHistory: WsRequest<
  DashboardQuery,
  Page<RequestRecord>
> = useWsRequest<DashboardQuery, Page<RequestRecord>>({
  sendType: WSMessageType.REQUEST_HISTORY,
  responseType: WSMessageType.REQUEST_HISTORY,
})

/**
 * 清空请求历史
 *
 * 后端对应：
 * - 发送类型：WSMessageType.REQUEST_CLEAR
 * - 响应类型：WSMessageType.REQUEST_CLEARED
 * - 请求数据：null
 * - 响应数据：{ success: boolean }
 */
export const clearRequestHistory: WsRequest<null, { success: boolean }> =
  useWsRequest<null, { success: boolean }>({
    sendType: WSMessageType.REQUEST_CLEAR,
    responseType: WSMessageType.REQUEST_CLEARED,
  })
