import type { useWebSocket } from '../composables/useWebSocket'

/**
 * WebSocket API 客户端
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
  async createMock(mock: any): Promise<any> {
    return this.ws.send('mock-create', mock)
  }

  /**
   * 更新 Mock
   */
  async updateMock(id: string, updates: any): Promise<any> {
    return this.ws.send('mock-update', { id, updates })
  }

  /**
   * 删除 Mock
   */
  async deleteMock(id: string): Promise<any> {
    return this.ws.send('mock-delete', { id })
  }

  /**
   * 切换 Mock 状态
   */
  async toggleMockStatus(id: string, enabled: boolean): Promise<any> {
    return this.updateMock(id, { enabled })
  }

  /**
   * 获取请求历史
   */
  async getRequestHistory(params?: {
    page?: number
    pageSize?: number
  }): Promise<any> {
    return this.ws.send('request-history', params)
  }

  /**
   * 获取设置
   */
  async getSettings(): Promise<any> {
    return this.ws.send('settings-get')
  }

  /**
   * 更新设置
   */
  async updateSettings(settings: any): Promise<any> {
    return this.ws.send('settings-update', settings)
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<any> {
    return this.ws.send('settings-clear-cache')
  }
}

