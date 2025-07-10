/**
 * 模拟数据配置
 */
export interface MockConfig {
  /**
   * 唯一标识
   */
  id: string

  /**
   * API路径，支持REST风格的路径参数
   * 例如：/api/users/:id
   */
  path: string

  /**
   * HTTP方法
   */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'

  /**
   * 是否启用该模拟
   */
  enabled: boolean

  /**
   * 延迟时间（毫秒）
   */
  delay?: number

  /**
   * HTTP状态码
   */
  statusCode?: number

  /**
   * 响应数据，可以是对象或函数
   * 如果是函数，将接收请求参数并返回响应数据
   */
  response: object | string | (() => object | string)

  /**
   * 描述
   */
  description?: string
}
