import type { WSMessage, WSMessageType } from '@baicie/faker-shared'
import { extend, generateUUID } from '@baicie/faker-shared'
import { useAppContext } from './use-app-context'
import { wsClient } from './use-ws'

interface RequestOptions {}

export interface WsRequestContext {
  sendType: WSMessageType
  responseType: WSMessageType
  options?: RequestOptions
}

type WSHandler<T = any> = (data: T, message: WSMessage) => void

export function useWsRequest<T = any, R = T>(context: WsRequestContext) {
  function request(data?: T): Promise<R> {
    const { timeout } = useAppContext()

    function send(payload: T): void {
      wsClient.send(context.sendType, payload)
    }

    function on(handler: WSHandler<T>): void {
      wsClient.on(context.responseType, handler)
    }

    function off(handler: WSHandler<T>): void {
      wsClient.off(context.responseType, handler)
    }

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
      }

      try {
        let payload: any
        if (Array.isArray(data)) {
          // 对于数组，保持数组格式，使用 items 包装
          payload = { id: reqId, items: data }
        } else if (data && typeof data === 'object') {
          // 对于对象，合并 id
          payload = extend({ id: reqId }, data)
        } else {
          // 对于原始值
          payload = { id: reqId, value: data }
        }
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

  return request
}
