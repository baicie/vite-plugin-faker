import { ref } from 'vue'
import { useWebSocket } from './useWebSocket'
import { logger } from '@baicie/logger'
import { WSApiClient } from '../api/ws-api'

/**
 * 设置管理 Composable
 */
export function useSettings() {
  const ws = useWebSocket()
  const api = new WSApiClient(ws)

  const settings = ref<any>({})
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * 加载设置
   */
  async function loadSettings(): Promise<void> {
    try {
      loading.value = true
      error.value = null
      settings.value = await api.getSettings()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('加载失败')
      logger.error('[Faker UI] 加载设置失败:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新设置
   */
  async function updateSettings(newSettings: any): Promise<void> {
    try {
      loading.value = true
      error.value = null
      await api.updateSettings(newSettings)
      settings.value = { ...settings.value, ...newSettings }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('更新失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 清除缓存
   */
  async function clearCache(): Promise<void> {
    try {
      loading.value = true
      error.value = null
      await api.clearCache()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('清除失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  // 初始化加载
  if (ws.connected.value) {
    loadSettings()
  } else {
    ws.on('connected', () => {
      loadSettings()
    })
  }

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings,
    clearCache,
  }
}
