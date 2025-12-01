import { ref } from 'vue'
import { useWebSocket } from './useWebSocket'
import { WSApiClient } from '../api/ws-api'

/**
 * Mock 管理 Composable
 */
export function useMock() {
  const ws = useWebSocket()
  const api = new WSApiClient(ws)

  const mocks = ref<any[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * 加载 Mock 列表
   */
  async function loadMocks(params?: {
    page?: number
    pageSize?: number
    search?: string
  }): Promise<any> {
    try {
      loading.value = true
      error.value = null
      const result = await api.getMockList(params)
      mocks.value = result.items?.map((item: any) => item.value) || result || []
      return result
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('加载失败')
      console.error('[Faker UI] 加载 Mock 列表失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建 Mock
   */
  async function createMock(mock: any): Promise<any> {
    try {
      loading.value = true
      error.value = null
      const result = await api.createMock(mock)
      await loadMocks() // 重新加载列表
      return result
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('创建失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新 Mock
   */
  async function updateMock(id: string, updates: any): Promise<any> {
    try {
      loading.value = true
      error.value = null
      const result = await api.updateMock(id, updates)
      await loadMocks() // 重新加载列表
      return result
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('更新失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除 Mock
   */
  async function deleteMock(id: string): Promise<void> {
    try {
      loading.value = true
      error.value = null
      await api.deleteMock(id)
      await loadMocks() // 重新加载列表
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('删除失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换 Mock 状态
   */
  async function toggleMock(id: string, enabled: boolean): Promise<void> {
    await updateMock(id, { enabled })
  }

  // 监听 Mock 配置更新
  ws.on('mock-config-updated', (data: any[]) => {
    mocks.value = data || []
  })

  // 初始化加载
  if (ws.connected.value) {
    loadMocks()
  } else {
    ws.on('connected', () => {
      loadMocks()
    })
  }

  return {
    mocks,
    loading,
    error,
    loadMocks,
    createMock,
    updateMock,
    deleteMock,
    toggleMock,
  }
}
