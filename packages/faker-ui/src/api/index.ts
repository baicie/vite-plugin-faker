import { ICustomEvent, type IResponse } from '@baicie/faker-shared'
import { generateUUID } from '../utils'

interface PendingRequest<T> {
  resolve: (value: T) => void
  reject: (reason: any) => void
  timer: number
}

const pendingRequests = new Map<string, PendingRequest<any>>()

const REQUEST_TIMEOUT = 10000

let isListenerInitialized = false

function initResponseListener() {
  if (isListenerInitialized || !import.meta.hot) return

  import.meta.hot.on(ICustomEvent.response, (event: IResponse<any>) => {
    const { uuid, data, error } = event
    const pendingRequest = pendingRequests.get(uuid)

    if (pendingRequest) {
      clearTimeout(pendingRequest.timer)

      if (error) {
        pendingRequest.reject(new Error(error))
      } else {
        pendingRequest.resolve(data)
      }

      pendingRequests.delete(uuid)
    }
  })

  isListenerInitialized = true
}

export function request<Req, Res>(
  url: string,
  options: { data?: Req } = {},
): Promise<Res> {
  initResponseListener()

  return new Promise<Res>((resolve, reject) => {
    if (!import.meta.hot) {
      return reject(new Error('HMR不可用'))
    }

    const uuid = generateUUID()

    const timer = window.setTimeout(() => {
      pendingRequests.delete(uuid)
      reject(new Error(`请求超时: ${url}`))
    }, REQUEST_TIMEOUT)

    pendingRequests.set(uuid, { resolve, reject, timer })

    import.meta.hot.send(ICustomEvent.request, {
      uuid,
      url,
      data: options.data,
    })
  })
}

export function createApiRequest<Req, Res>(apiUrl: string) {
  return (data?: Req): Promise<Res> => request<Req, Res>(apiUrl, { data })
}

export * from './dashboard'
