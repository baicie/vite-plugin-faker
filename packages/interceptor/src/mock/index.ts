export type FakerSwRequestMessage = {
  type: 'FAKER_SW_REQUEST'
  requestId: string
  url: string
  method: string
  headers: Array<[string, string]>
  body: ArrayBuffer | null
}

type FakerSwResponseMessage = {
  type: 'FAKER_SW_RESPONSE'
  requestId: string
  action: 'mock'
  status: number
  statusText: string
  headers: Array<[string, string]>
  body: ArrayBuffer | null
}

type FakerSwPassthroughMessage = {
  type: 'FAKER_SW_PASSTHROUGH'
  requestId: string
}

function pairsToHeaders(pairs: Array<[string, string]>): Headers {
  const headers = new Headers()
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i]
    if (!p) continue
    headers.set(p[0], p[1])
  }
  return headers
}

function getContentType(headers: Headers): string {
  const v = headers.get('content-type') || headers.get('Content-Type')
  return v || ''
}

function arrayBufferToText(buf: ArrayBuffer): string {
  // TextDecoder 在现代浏览器可用；此处不引入 polyfill
  const Decoder: any = (window as any).TextDecoder
  if (typeof Decoder === 'function') {
    return new Decoder('utf-8').decode(new Uint8Array(buf))
  }

  // 回退：尽力而为（仅 ASCII/latin1）
  const u8 = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < u8.length; i++) {
    const code = u8[i] || 0
    s += String.fromCharCode(code)
  }
  return s
}

function textToArrayBuffer(text: string): ArrayBuffer {
  const Encoder: any = (window as any).TextEncoder
  if (typeof Encoder === 'function') {
    return new Encoder().encode(text).buffer
  }

  const buf = new ArrayBuffer(text.length)
  const u8 = new Uint8Array(buf)
  for (let i = 0; i < text.length; i++) {
    u8[i] = text.charCodeAt(i) & 0xff
  }
  return buf
}

function parseBodyFromSwMessage(
  body: ArrayBuffer | null,
  headers: Headers,
): any {
  if (!body) return null
  const contentType = getContentType(headers)
  const text = arrayBufferToText(body)

  if (contentType.indexOf('application/json') >= 0) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return text
}

function headersToPairs(headers: Headers): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  headers.forEach((value, key) => {
    pairs.push([key, value])
  })
  return pairs
}

function searchParamsToObject(params: URLSearchParams): Record<string, string> {
  const obj: Record<string, string> = {}
  params.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}

function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {}
  headers.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}

export async function registerFakerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined') return Promise.resolve(null)
  if (!('serviceWorker' in navigator)) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    ServiceWorker.then(function (registration: ServiceWorkerRegistration) {
      resolve(registration)
    }).catch((error: unknown) => {
      reject(error)
    })
  })
}
