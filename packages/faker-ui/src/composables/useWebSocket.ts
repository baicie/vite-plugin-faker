import { onUnmounted, ref } from 'vue'
import { generateUUID } from '@baicie/faker-shared'
import { logger } from '@baicie/logger'

interface WSMessage {
  type: string
  data?: any
  id?: string
}

interface PendingRequest {
  resolve: (value: any) => void
  reject: (reason: any) => void
  timer: number
}

/**
 * WebSocket 客户端 Composable
 */
export function useWebSocket(wsUrl?: string) {
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)
  const pendingRequests = new Map<string, PendingRequest>()
  const messageHandlers = new Map<string, Set<Function>>()
  const REQUEST_TIMEOUT = 10000

  /**
   * 连接 WebSocket
   * 优先使用 Vite HMR WebSocket
   */
  function connect(url?: string): void {
    // 尝试使用 Vite HMR WebSocket
    const viteHMR = import.meta?.hot
    if (viteHMR && typeof viteHMR === 'object') {
      setupViteHMRConnection(viteHMR)
      return
    }

    // 否则创建新的 WebSocket 连接
    const hmrWs = window.__VITE_HMR_WS__
    const baseUrl = hmrWs
      ? hmrWs.replace('/__vite_ws', '')
      : `ws://${window.location.host}`

    const targetUrl =
      url || wsUrl || (window as any).__FAKER_WS_URL__ || `${baseUrl}/@faker-ws`

    try {
      ws.value = new WebSocket(targetUrl)

      ws.value.onopen = () => {
        connected.value = true
        logger.info('[Faker UI] WebSocket 连接成功')
        // 触发连接事件
        const handlers = messageHandlers.get('connected')
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler()
            } catch (error) {
              logger.error('[Faker UI] 处理连接事件失败:', error)
            }
          })
        }
      }

      ws.value.onmessage = event => {
        try {
          // 处理 Vite WebSocket 事件格式
          let message: WSMessage

          if (typeof event.data === 'string') {
            try {
              message = JSON.parse(event.data)
            } catch {
              // 如果不是 JSON，可能是 Vite 事件格式，忽略
              return
            }
          } else if (event.data && typeof event.data === 'object') {
            message = event.data as WSMessage
          } else {
            return
          }

          handleMessage(message)
        } catch (error) {
          logger.error('[Faker UI] 解析消息失败:', error)
        }
      }

      ws.value.onerror = error => {
        logger.error('[Faker UI] WebSocket 错误:', error)
        connected.value = false
      }

      ws.value.onclose = () => {
        connected.value = false
        logger.info('[Faker UI] WebSocket 连接已关闭')
        // 尝试重连
        setTimeout(() => {
          if (!connected.value) {
            connect(targetUrl)
          }
        }, 3000)
      }
    } catch (error) {
      logger.error('[Faker UI] WebSocket 连接失败:', error)
    }
  }

  /**
   * 设置 Vite HMR WebSocket 连接
   */
  function setupViteHMRConnection(hmr: any): void {
    connected.value = true

    // 监听自定义事件
    // 优先使用 import.meta.hot
    if (import.meta?.hot) {
      const hot = import.meta.hot

      hot.on('faker:response', (data: any) => {
        try {
          const message = typeof data === 'string' ? JSON.parse(data) : data
          handleMessage(message)
        } catch (error) {
          logger.error('[Faker UI] 解析消息失败:', error)
        }
      })

      hot.on('faker:broadcast', (data: any) => {
        try {
          const message = typeof data === 'string' ? JSON.parse(data) : data
          handleMessage(message)
        } catch (error) {
          logger.error('[Faker UI] 解析广播消息失败:', error)
        }
      })
    } else if (hmr.on) {
      // 备用方案
      hmr.on('faker:response', (data: any) => {
        try {
          const message = typeof data === 'string' ? JSON.parse(data) : data
          handleMessage(message)
        } catch (error) {
          logger.error('[Faker UI] 解析消息失败:', error)
        }
      })

      hmr.on('faker:broadcast', (data: any) => {
        try {
          const message = typeof data === 'string' ? JSON.parse(data) : data
          handleMessage(message)
        } catch (error) {
          logger.error('[Faker UI] 解析广播消息失败:', error)
        }
      })
    }

    // 保存 HMR 引用
    ;(ws as any).value = hmr
    logger.info('[Faker UI] 使用 Vite HMR WebSocket')

    // 触发连接事件
    const handlers = messageHandlers.get('connected')
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler()
        } catch (error) {
          logger.error('[Faker UI] 处理连接事件失败:', error)
        }
      })
    }
  }

  /**
   * 处理消息
   */
  function handleMessage(message: WSMessage): void {
    // 处理请求响应
    if (message.id && pendingRequests.has(message.id)) {
      const pending = pendingRequests.get(message.id)!
      clearTimeout(pending.timer)
      pendingRequests.delete(message.id)

      if (message.type === 'error') {
        pending.reject(new Error(message.data?.message || '未知错误'))
      } else {
        pending.resolve(message.data)
      }
      return
    }

    // 处理事件消息
    const handlers = messageHandlers.get(message.type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data, message)
        } catch (error) {
          logger.error(`[Faker UI] 处理消息失败 [${message.type}]:`, error)
        }
      })
    }
  }

  /**
   * 发送消息
   */
  function send(type: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = generateUUID()
      const message: WSMessage = { type, data, id }
      const messageStr = JSON.stringify(message)

      const timer = window.setTimeout(() => {
        pendingRequests.delete(id)
        reject(new Error(`请求超时: ${type}`))
      }, REQUEST_TIMEOUT)

      pendingRequests.set(id, { resolve, reject, timer })

      // 优先使用 Vite HMR WebSocket
      const hmr = ws.value
      if (hmr) {
        try {
          // 使用 import.meta.hot.send() 发送消息
          if (import.meta?.hot) {
            import.meta.hot.send('faker:message', messageStr)
            return
          } else if ((hmr as any).send) {
            // 备用方案
            ;(hmr as any).send('faker:message', messageStr)
            return
          }
        } catch (error) {
          logger.error('[Faker UI] 通过 HMR 发送消息失败:', error)
        }
      }

      // 降级到原生 WebSocket
      if (!ws.value || (ws.value as WebSocket).readyState !== WebSocket.OPEN) {
        pendingRequests.delete(id)
        clearTimeout(timer)
        reject(new Error('WebSocket 未连接'))
        return
      }

      ;(ws.value as WebSocket).send(messageStr)
    })
  }

  /**
   * 监听消息
   */
  function on(type: string, handler: Function): void {
    if (!messageHandlers.has(type)) {
      messageHandlers.set(type, new Set())
    }
    messageHandlers.get(type)!.add(handler)
  }

  /**
   * 取消监听
   */
  function off(type: string, handler: Function): void {
    const handlers = messageHandlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 关闭连接
   */
  function close(): void {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    connected.value = false
  }

  // 自动连接
  if (typeof window !== 'undefined') {
    connect()
  }

  // 清理
  onUnmounted(() => {
    close()
    pendingRequests.clear()
    messageHandlers.clear()
  })

  return {
    ws,
    connected,
    connect,
    send,
    on,
    off,
    close,
  }
}
