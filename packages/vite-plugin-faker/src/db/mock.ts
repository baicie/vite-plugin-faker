interface MockConfig {
  id: string
  url: string
  method: string
  enabled: boolean
  description?: string
  responseType: 'static' | 'faker' | 'function'
  responseData: any // 静态数据
  responseTemplate?: string // faker模板，例如 "{{name.firstName}} {{name.lastName}}"
  responseCode?: string // 自定义函数代码
  statusCode: number
  delay?: number
  headers?: Record<string, string>
  tags?: string[]
}
