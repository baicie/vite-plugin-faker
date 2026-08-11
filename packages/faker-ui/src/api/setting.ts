import { WSMessageType } from '@baicie/faker-shared/browser'
import { useWsRequest } from '../hooks/use-ws-request'
import type { WsRequest } from '../hooks/use-ws-request'

export interface RuntimeSettings {
  globalDelay: number
  enableAllMocks: boolean
  logRequests: boolean
  corsEnabled: boolean
  corsAllowOrigin: string
}

export type FakerTheme = 'light' | 'dark'

export interface FakerSettings extends Partial<RuntimeSettings> {
  version: number
  theme?: FakerTheme
}

export interface SettingsActionResult {
  success: boolean
}

/**
 * 获取设置
 *
 * 后端：
 * - 发送类型：WSMessageType.SETTINGS_GET
 * - 响应类型：WSMessageType.SETTINGS_GET
 * - 请求数据：无
 * - 响应数据：settings 对象（结构由后端定义）
 */
export const getSettings: WsRequest<void, FakerSettings> = useWsRequest<
  void,
  FakerSettings
>({
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
export const updateSettings: WsRequest<
  Partial<FakerSettings>,
  SettingsActionResult
> = useWsRequest<Partial<FakerSettings>, SettingsActionResult>({
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
export const clearCache: WsRequest<void, SettingsActionResult> = useWsRequest<
  void,
  SettingsActionResult
>({
  sendType: WSMessageType.SETTINGS_CLEAR_CACHE,
  responseType: WSMessageType.SETTINGS_CLEAR_CACHE,
})
