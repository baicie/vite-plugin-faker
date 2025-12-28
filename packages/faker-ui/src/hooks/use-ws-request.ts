import type { WSMessage, WSMessageType } from '@baicie/faker-shared'
import { extend, generateUUID } from '@baicie/faker-shared'
import { wsClient, getTimeout } from './use-ws'

interface RequestOptions {}

export interface WsRequestContext {
  sendType: WSMessageType
  responseType: WSMessageType
  options?: RequestOptions
}

type WSHandler<T = any> = (data: T, message: WSMessage) => void

export function useWsRequest<T = any, R = T>(context: WsRequestContext) {
  function request(data?: T): Promise<R> {
    const timeout = getTimeout()

    function send(payload: T): void {
      if (!wsClient) {
          console.error('WebSocket client not initialized')
          return
      }
      wsClient.send(context.sendType, payload)
    }

    function on(handler: WSHandler<T>): void {
      if (!wsClient) return
      wsClient.on(context.responseType, handler)
    }

    function off(handler: WSHandler<T>): void {
      if (!wsClient) return
      wsClient.off(context.responseType, handler)
    }

    const reqId = generateUUID()

    return new Promise(function (resolve, reject) {
      if (!wsClient) {
          reject(new Error('WebSocket client not initialized'))
          return
      }
      
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

      let timer: any

      if (timeout > 0) {
        timer = setTimeout(function () {
          if (done) {
            return
          }
          done = true
          off(handler)
          reject(new Error('WebSocket request timeout: ' + context.sendType))
        }, timeout)
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
            clearTimeout(timer)
          }
          reject(error)
        }
      }
    })
  }

  return request
}
