import { ref } from 'vue'
import { useWebSocket } from './useWebSocket'
import { WSApiClient } from '../api/ws-api'
import { logger } from '@baicie/logger'

/**
 * 请求记录管理 Composable
 */
export function useRequest() {
  const ws = useWebSocket()
  const api = new WSApiClient(ws)

  const requests = ref<any[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })

  /**
   * 加载请求历史
   */
  async function loadRequests(params?: {
    page?: number
    pageSize?: number
  }): Promise<void> {
    try {
      loading.value = true
      error.value = null
      const result = await api.getRequestHistory({
        page: pagination.value.page,
        pageSize: pagination.value.pageSize,
        ...params,
      })
      console.log(result)

      if (result.items) {
        requests.value = result.items.map((item: any) => item.value)
        pagination.value = {
          ...pagination.value,
          ...result.pagination,
        }
      } else {
        requests.value = result.items || []
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('加载失败')
      logger.error('[Faker UI] 加载请求历史失败:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 监听新请求记录
   */
  ws.on('request-recorded', (_data: any) => {
    // 如果当前在第一页，自动刷新
    if (pagination.value.page === 1) {
      loadRequests()
    }
  })

  return {
    requests,
    loading,
    error,
    pagination,
    loadRequests,
  }
}
