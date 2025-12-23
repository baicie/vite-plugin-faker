import { WSMessageType } from '@baicie/faker-shared'
import { useWsRequest } from '../hooks/use-ws-request'

/**
 * 获取设置
 *
 * 后端：
 * - 发送类型：WSMessageType.SETTINGS_GET
 * - 响应类型：WSMessageType.SETTINGS_GET
 * - 请求数据：无
 * - 响应数据：settings 对象（结构由后端定义）
 */
export const getSettings = useWsRequest<void, any>({
  sendType: WSMessageType.SETTINGS_GET,
  responseType: WSMessageType.SETTINGS_GET,
})

/**
 * 更新设置
 *
 * 后端：
 * - 发送类型：WSMessageType.SETTINGS_UPDATE
 * - 响应类型：WSMessageType.SETTINGS_UPDATE
 * - 请求数据：部分或全部设置字段
 * - 响应数据：{ success: true }
 */
export const updateSettings = useWsRequest<any, { success: boolean }>({
  sendType: WSMessageType.SETTINGS_UPDATE,
  responseType: WSMessageType.SETTINGS_UPDATE,
})

/**
 * 清理请求缓存
 *
 * 后端：
 * - 发送类型：WSMessageType.SETTINGS_CLEAR_CACHE
 * - 响应类型：WSMessageType.SETTINGS_CLEAR_CACHE
 * - 请求数据：无
 * - 响应数据：{ success: true }
 */
export const clearCache = useWsRequest<void, { success: boolean }>({
  sendType: WSMessageType.SETTINGS_CLEAR_CACHE,
  responseType: WSMessageType.SETTINGS_CLEAR_CACHE,
})
