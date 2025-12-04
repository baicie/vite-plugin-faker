/**
 * API 模块统一导出
 * 使用新的 WebSocket API 系统
 */

import { WSApiClient } from './ws-api'

export { WSApiClient } from './ws-api'
export type { Dashboard } from './ws-api'
export * from './type'

/**
 * 创建 API 客户端实例
 * 需要在组件中使用 useWebSocket 获取 ws 实例
 */
export function createApiClient(
  ws: ReturnType<typeof import('../composables/useWebSocket').useWebSocket>,
) {
  return new WSApiClient(ws)
}
