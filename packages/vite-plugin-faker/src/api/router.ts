import { IApi } from '@baicie/faker-shared'
import type { DBManager } from '../db'
import * as dashboardHandler from './handlers/dashboard'
import * as mockHandler from './handlers/mock'
import * as settingsHandler from './handlers/settings'
import * as interceptorHandler from './handlers/interceptor'

export function handleRequest(
  url: string,
  data: unknown,
  dbManager: DBManager,
): any {
  switch (url) {
    // 仪表盘相关API
    case IApi.dashboard:
      return dashboardHandler.getDashboard(data, dbManager)

    // 模拟配置相关API
    case IApi.mocks:
      return mockHandler.getMockList(data, dbManager)
    case IApi.createMock:
      return mockHandler.createMock(data, dbManager)
    case IApi.updateMock:
      return mockHandler.updateMock(data, dbManager)
    case IApi.deleteMock:
      return mockHandler.deleteMock(data, dbManager)
    case IApi.toggleMockStatus:
      return mockHandler.toggleMockStatus(data, dbManager)
    case IApi.previewMock:
      return mockHandler.previewMockResponse(data, dbManager)

    // 设置相关API
    case IApi.getSettings:
      return settingsHandler.getSettings(dbManager)
    case IApi.saveSettings:
      return settingsHandler.saveSettings(data, dbManager)
    case IApi.clearCache:
      return settingsHandler.clearCache(dbManager)

    // 拦截器相关API
    case IApi.getMockConfig:
      return interceptorHandler.getMockConfig(data, dbManager)
    case IApi.mockRequest:
      return interceptorHandler.handleMockRequest(data, dbManager)

    // 未知API
    default:
      throw new Error(`未知API路径: ${url}`)
  }
}
