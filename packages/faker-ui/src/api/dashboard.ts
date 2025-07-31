import { type DashboardQuery, IApi, type Page } from '@baicie/faker-shared'
import type { MockConfig, SystemSettings } from './type'
import { createApiRequest } from './index'

export interface Dashboard {
  id: string
  name: string
  description: string
}

// 使用工厂函数创建类型安全的API请求
export const getDashboard = createApiRequest<DashboardQuery, Page<Dashboard>>(
  IApi.dashboard,
)

// 请求模拟数据
export const getMockList = createApiRequest<
  {
    page: number
    pageSize: number
    search?: string
  },
  Page<MockConfig>
>(IApi.mocks)

// 创建模拟配置
export const createMock = createApiRequest<MockConfig, MockConfig>(
  IApi.createMock,
)

// 更新模拟配置
export const updateMock = createApiRequest<
  {
    id: string
    data: Partial<MockConfig>
  },
  boolean
>(IApi.updateMock)

// 删除模拟配置
export const deleteMock = createApiRequest<string, boolean>(IApi.deleteMock)

// 切换模拟配置状态
export const toggleMockStatus = createApiRequest<
  {
    id: string
    enabled: boolean
  },
  boolean
>(IApi.toggleMockStatus)

// 预览模拟响应
export const previewMockResponse = createApiRequest<
  {
    responseType: ResponseType
    responseData?: any
    responseTemplate?: string
    responseCode?: string
    requestInfo: { url: string; method: string }
  },
  any
>(IApi.previewMock)

// 获取系统设置
export const getSettings = createApiRequest<void, SystemSettings>(
  IApi.getSettings,
)

// 保存系统设置
export const saveSettings = createApiRequest<SystemSettings, boolean>(
  IApi.saveSettings,
)

export const clearCache = createApiRequest<void, boolean>(IApi.clearCache)
