import type { WSMessage, WSMessageType } from '@baicie/faker-shared'
import { generateUUID } from '@baicie/faker-shared'
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
    const reqId = generateUUID()

    function send(payload?: T): void {
      wsClient.send(context.sendType, payload, reqId)
    }

    function on(handler: WSHandler<R>): void {
      wsClient.on(context.responseType, handler)
    }

    function off(handler: WSHandler<R>): void {
      wsClient.off(context.responseType, handler)
    }

    return new Promise(function (resolve, reject) {
      let done = false
      let timer: number | undefined

      function handler(payload: R, message: WSMessage) {
        if (done) {
          return
        }
        if (message.id !== reqId) {
          return
        }
        done = true
        off(handler)
        if (timer !== undefined) {
          window.clearTimeout(timer)
        }
        resolve(payload)
      }

      on(handler)

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
        send(data)
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
