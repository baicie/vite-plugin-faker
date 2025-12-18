/**
 * Faker Service Worker
 * - 拦截 fetch 请求
 * - 将请求信息发送给页面端，由页面端决定 mock 还是透传
 *
 * 说明：
 * - Service Worker 环境不能使用 XMLHttpRequest，只能使用 fetch
 * - 这里不依赖任何第三方库，保持脚本可被直接注册运行
 */

/// <reference lib="webworker" />
/// <reference lib="webworker.importscripts" />

interface FakerSwRequestMessage {
  type: 'FAKER_SW_REQUEST'
  requestId: string
  url: string
  method: string
  headers: Array<[string, string]>
  body: ArrayBuffer | null
}

interface FakerSwResponseMessage {
  type: 'FAKER_SW_RESPONSE'
  requestId: string
  action: 'mock' | 'passthrough'
  status: number
  statusText: string
  headers: Array<[string, string]>
  body: ArrayBuffer | null
}

interface FakerSwPassthroughMessage {
  type: 'FAKER_SW_PASSTHROUGH'
  requestId: string
}

type FakerSwClientReply = FakerSwResponseMessage | FakerSwPassthroughMessage

function headersToPairs(headers: Headers): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  headers.forEach((value, key) => {
    pairs.push([key, value])
  })
  return pairs
}

function createResponseFromClientMessage(
  msg: FakerSwResponseMessage,
): Response {
  const headers = new Headers()
  for (let i = 0; i < msg.headers.length; i++) {
    const pair = msg.headers[i]
    if (!pair) continue
    headers.set(pair[0], pair[1])
  }

  return new Response(msg.body || null, {
    status: msg.status,
    statusText: msg.statusText,
    headers,
  })
}

function uuid(): string {
  // crypto.randomUUID 在较新浏览器支持；不支持则回退为简单实现
  const c = (self as any).crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }

  const s4 = function () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return (
    s4() +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    s4() +
    s4()
  )
}

function getClientForEvent(event: FetchEvent): Promise<Client | null> {
  if (event.clientId) {
    return (self as any).clients.get(event.clientId).then((c: Client) => c)
  }

  return (self as any).clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((list: Client[]) => (list && list.length ? list[0] : null))
}

function requestBodyToArrayBuffer(
  request: Request,
): Promise<ArrayBuffer | null> {
  // GET/HEAD 按规范没有 body
  if (request.method === 'GET' || request.method === 'HEAD') {
    return Promise.resolve(null)
  }

  // clone 避免消费原始流
  try {
    return request
      .clone()
      .arrayBuffer()
      .then((buf: ArrayBuffer) => buf)
      .catch(() => null)
  } catch {
    return Promise.resolve(null)
  }
}

function askClientForResponse(
  client: Client,
  payload: FakerSwRequestMessage,
): Promise<FakerSwClientReply | null> {
  const channel = new MessageChannel()

  const responsePromise = new Promise<FakerSwClientReply | null>(resolve => {
    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      resolve(null)
    }, 10000)

    channel.port1.onmessage = event => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve((event && event.data) || null)
    }

    channel.port1.onmessageerror = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(null)
    }
  })

  try {
    client.postMessage(payload, [channel.port2])
  } catch {
    try {
      channel.port1.close()
      channel.port2.close()
    } catch {
      // ignore
    }
    return Promise.resolve(null)
  }

  return responsePromise
}

function handleFetch(event: FetchEvent): Promise<Response> {
  const request = event.request

  // 导航请求直接放行，避免影响页面加载
  if (request.mode === 'navigate') {
    return fetch(request)
  }

  // DevTools 触发的 only-if-cached 跨域请求无法处理，直接放行
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
    return fetch(request)
  }

  return getClientForEvent(event).then(client => {
    if (!client) {
      return fetch(request)
    }

    const requestId = uuid()

    return requestBodyToArrayBuffer(request).then(body => {
      const msg: FakerSwRequestMessage = {
        type: 'FAKER_SW_REQUEST',
        requestId,
        url: request.url,
        method: request.method,
        headers: headersToPairs(request.headers),
        body,
      }

      return askClientForResponse(client, msg).then(reply => {
        if (!reply) {
          return fetch(request)
        }

        if (reply.type === 'FAKER_SW_PASSTHROUGH') {
          return fetch(request)
        }

        if (
          reply.type === 'FAKER_SW_RESPONSE' &&
          reply.action === 'mock' &&
          reply.requestId === requestId
        ) {
          return createResponseFromClientMessage(reply)
        }

        return fetch(request)
      })
    })
  })
}

;(self as any).addEventListener('install', (event: any) => {
  event.waitUntil((self as any).skipWaiting())
})
;(self as any).addEventListener('activate', (event: any) => {
  event.waitUntil((self as any).clients.claim())
})
;(self as any).addEventListener('fetch', (event: any) => {
  event.respondWith(handleFetch(event as any))
})
