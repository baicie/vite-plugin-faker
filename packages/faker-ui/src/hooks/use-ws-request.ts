import type { WSMessage } from '@baicie/faker-shared'
import { WSMessageType, generateUUID } from '@baicie/faker-shared/browser'
import { useAppContext } from './use-app-context'
import { wsClient } from './use-ws'

interface RequestOptions {
  /**
   * 当响应 payload 形如 `{ success: false, error?: string }` 时，
   * 抛出一个携带错误消息的 Error，避免静默 resolve。
   */
  rejectOnFailure?: boolean
}

interface WsErrorPayload {
  message?: string
}

export interface WsRequestContext {
  sendType: WSMessageType
  responseType: WSMessageType
  options?: RequestOptions
}

interface WSHandler<T = unknown> {
  (data: T, message: WSMessage): void
}

export interface WsRequest<T = unknown, R = T> {
  (data?: T): Promise<R>
}

function isFailurePayload(payload: unknown): {
  success: false
  error?: string
} | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const record = payload as Record<string, unknown>
  if (record.success === false) {
    const error =
      typeof record.error === 'string' ? record.error : 'Request failed'
    return { success: false, error }
  }
  return null
}

export function useWsRequest<T = unknown, R = T>(
  context: WsRequestContext,
): WsRequest<T, R> {
  function request(data?: T): Promise<R> {
    const { timeout } = useAppContext()
    const reqId = generateUUID()

    function send(payload?: T): void {
      wsClient.send(context.sendType, payload, reqId)
    }

    function onResponse(handler: WSHandler<R>): void {
      wsClient.on(context.responseType, handler)
    }

    function offResponse(handler: WSHandler<R>): void {
      wsClient.off(context.responseType, handler)
    }

    function onError(handler: WSHandler<WsErrorPayload | undefined>): void {
      wsClient.on(WSMessageType.ERROR, handler)
    }

    function offError(handler: WSHandler<WsErrorPayload | undefined>): void {
      wsClient.off(WSMessageType.ERROR, handler)
    }

    return new Promise(function (resolve, reject) {
      let done = false
      let timer: number | undefined

      function cleanup(): void {
        offResponse(responseHandler)
        offError(errorHandler)
        if (timer !== undefined) {
          window.clearTimeout(timer)
        }
      }

      function responseHandler(payload: R, message: WSMessage): void {
        if (done) {
          return
        }
        if (message.id !== reqId) {
          return
        }
        if (context.options && context.options.rejectOnFailure) {
          const failure = isFailurePayload(payload)
          if (failure) {
            done = true
            cleanup()
            reject(new Error(failure.error || 'Request failed'))
            return
          }
        }
        done = true
        cleanup()
        resolve(payload)
      }

      function errorHandler(
        payload: WsErrorPayload | undefined,
        message: WSMessage,
      ): void {
        if (done || message.id !== reqId) {
          return
        }

        done = true
        cleanup()
        reject(
          new Error(
            payload && typeof payload.message === 'string'
              ? payload.message
              : 'WebSocket request failed: ' + context.sendType,
          ),
        )
      }

      onResponse(responseHandler)
      onError(errorHandler)

      if (timeout > 0) {
        timer = window.setTimeout(function () {
          if (done) {
            return
          }
          done = true
          cleanup()
          reject(new Error('WebSocket request timeout: ' + context.sendType))
        }, timeout)
      }

      try {
        send(data)
      } catch (error) {
        if (!done) {
          done = true
          cleanup()
          reject(error)
        }
      }
    })
  }

  return request
}
