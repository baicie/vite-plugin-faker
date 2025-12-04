/**
 * 数据库相关类型定义
 */

/**
 * 请求记录项
 */
export interface RequestItem {
  req: Record<string, any>
  res: Record<string, any> | null
  timestamp?: number
  duration?: number
  isProxy?: boolean
  error?: any
}

/**
 * 系统设置
 */
export interface Settings {
  version: number
  theme?: 'light' | 'dark'
  [key: string]: any
}

