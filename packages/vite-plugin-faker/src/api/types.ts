export interface MockConfig {
  id?: string
  url: string
  method: string
  enabled: boolean
  description?: string
  responseType: ResponseType
  responseData?: any
  responseTemplate?: string
  responseCode?: string
  statusCode: number
  delay?: number
  headers?: Record<string, string>
  tags?: string[]
}

export type ResponseType = 'static' | 'faker' | 'function'

export interface MockPreviewRequest {
  responseType: ResponseType
  responseData?: any
  responseTemplate?: string
  responseCode?: string
  requestInfo: { url: string; method: string }
}

export interface SystemSettings {
  globalDelay: number
  enableAllMocks: boolean
  logRequests: boolean
  corsEnabled: boolean
  corsAllowOrigin: string
  corsAllowMethods: string
  persistData: boolean
  maxStorageSize: number
  theme: 'light' | 'dark' | 'auto'
}
