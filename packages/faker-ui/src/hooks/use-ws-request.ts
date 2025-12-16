import { onUnmounted } from 'vue'
import type { WSMessage, WSMessageType } from '@baicie/faker-shared'
import { extend, generateUUID } from '@baicie/faker-shared'
import { useWebSocket } from './use-ws'
import { useAppContext } from './use-app-context'

interface RequestOptions {}

export interface WsRequestContext {
  sendType: WSMessageType
  responseType: WSMessageType
  options?: RequestOptions
}

type WSHandler<T = any> = (data: T, message: WSMessage) => void

export function useWsRequest<T = any, R = T>(context: WsRequestContext) {
  const { wsClient } = useWebSocket()
  const { timeout } = useAppContext()
  const pendingTimers: number[] = []

  function send(payload: T): void {
    wsClient.send(context.sendType, payload)
  }

  function on(handler: WSHandler<T>): void {
    wsClient.on(context.responseType, handler)
  }

  function off(handler: WSHandler<T>): void {
    wsClient.off(context.responseType, handler)
  }

  function request(data?: T): Promise<R> {
    const reqId = generateUUID()

    return new Promise(function (resolve, reject) {
      let done = false
      function handler(payload: T, message: WSMessage) {
        if (done) {
          return
        }
        if (message.id && message.id !== reqId) {
          return
        }
        done = true
        resolve(payload as unknown as R)
      }

      on(handler)

      let timer: number | undefined

      if (timeout > 0) {
        timer = window.setTimeout(function () {
          if (done) {
            return
          }
          done = true
          off(handler)
          reject(new Error('WebSocket request timeout: ' + context.sendType))
        }, timeout)

        if (timer) {
          pendingTimers.push(timer)
        }
      }

      try {
        const payload =
          data && typeof data === 'object'
            ? extend(data, { id: reqId })
            : { id: reqId, value: data }
        send(payload as T)
      } catch (error) {
        if (!done) {
          done = true
          off(handler)
          if (timer) {
            window.clearTimeout(timer)
          }
          reject(error)
        }
      }
    })
  }

  onUnmounted(function () {
    pendingTimers.forEach(function (id) {
      window.clearTimeout(id)
    })
  })

  return request
}
