import type { useWebSocket } from '../composables/useWebSocket'
import {
  type DashboardQuery,
  type Page,
  WSMessageType,
} from '@baicie/faker-shared'
import type { MockConfig, SystemSettings } from './type'

/**
 * Dashboard 数据接口
 */
export interface Dashboard {
  id: string
  name: string
  description: string
}

/**
 * WebSocket API 客户端
 * 提供所有与服务器通信的 API 方法
 */
export class WSApiClient {
  constructor(private ws: ReturnType<typeof useWebSocket>) {}

  /**
   * 获取 Mock 列表
   */
  async getMockList(params?: {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortDesc?: boolean
  }): Promise<any> {
    const result = await this.ws.send('mock-list', params)
    // 如果返回的是分页结果，直接返回
    if (result.items) {
      return result
    }
    // 否则包装成分页格式
    return {
      items: result.map((item: any, index: number) => ({
        key: item.id || `mock-${index}`,
        value: item,
      })),
      pagination: {
        total: result.length,
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
        totalPages: Math.ceil(result.length / (params?.pageSize || 20)),
      },
    }
  }

  /**
   * 创建 Mock
   */
  async createMock(mock: Partial<MockConfig>): Promise<MockConfig> {
    const result = await this.ws.send('mock-create', mock)
    return result.data || result
  }

  /**
   * 更新 Mock
   */
  async updateMock(
    id: string,
    updates: Partial<MockConfig>,
  ): Promise<{ success: boolean }> {
    const result = await this.ws.send('mock-update', { id, updates })
    return result.data || result
  }

  /**
   * 删除 Mock
   */
  async deleteMock(id: string): Promise<{ success: boolean }> {
    const result = await this.ws.send('mock-delete', { id })
    return result.data || result
  }

  /**
   * 切换 Mock 状态
   */
  async toggleMockStatus(
    id: string,
    enabled: boolean,
  ): Promise<{ success: boolean }> {
    return this.updateMock(id, { enabled })
  }

  /**
   * 获取请求历史
   */
  async getRequestHistory(params?: {
    page?: number
    pageSize?: number
  }): Promise<{
    items: { key: string; value: any }[]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
    }
  }> {
    const result = await this.ws.send(WSMessageType.REQUEST_HISTORY, params)
    return result.data || result
  }

  /**
   * 获取设置
   */
  async getSettings(): Promise<SystemSettings> {
    const result = await this.ws.send('settings-get')
    return result.data || result
  }

  /**
   * 更新设置
   */
  async updateSettings(
    settings: Partial<SystemSettings>,
  ): Promise<{ success: boolean }> {
    const result = await this.ws.send('settings-update', settings)
    return result.data || result
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<{ success: boolean }> {
    const result = await this.ws.send('settings-clear-cache')
    return result.data || result
  }

  /**
   * 获取仪表盘数据（请求历史）
   */
  async getDashboard(params?: DashboardQuery): Promise<Page<Dashboard>> {
    const result = await this.ws.send('request-history', {
      page: params?.page || 1,
      pageSize: params?.pageSize || 20,
    })

    // 转换请求历史为 Dashboard 格式
    const items = (result.items || []).map((item: any) => ({
      id: item.key,
      name: item.value.req?.method || 'GET',
      description: item.value.req?.url || '',
    }))

    return {
      data: items,
      pagination: result.pagination || {
        total: 0,
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
      },
    }
  }

  /**
   * 根据 URL 和 Method 获取 Mock 配置
   */
  async getMockByUrl(params: {
    url: string
    method: string
  }): Promise<MockConfig | null> {
    const result = await this.getMockList()
    const mocks = result.items?.map((item: any) => item.value) || []

    return (
      mocks.find(
        (mock: MockConfig) =>
          mock.enabled &&
          mock.url === params.url &&
          mock.method.toUpperCase() === params.method.toUpperCase(),
      ) || null
    )
  }

  /**
   * 预览 Mock 响应
   * 注意：这个功能需要服务器端支持，目前可能需要通过其他方式实现
   * 暂时返回一个占位实现
   */
  async previewMockResponse(params: {
    responseType: 'static' | 'faker' | 'function'
    responseData?: any
    responseTemplate?: string
    responseCode?: string
    requestInfo: { url: string; method: string }
  }): Promise<any> {
    // TODO: 如果服务器端支持 preview API，可以在这里调用
    // 目前返回一个模拟响应
    if (params.responseType === 'static') {
      return params.responseData
    }
    // 对于 faker 和 function 类型，需要服务器端处理
    throw new Error('Preview API not implemented yet')
  }
}
