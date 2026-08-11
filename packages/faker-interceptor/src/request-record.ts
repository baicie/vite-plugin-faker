export interface RequestLocation {
  url: string
  query: Record<string, string>
}

export interface MockResponseMarker {
  isMocked: boolean
  mockId?: string
}

export function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  headers.forEach(function (value, key) {
    result[key] = value
  })
  return result
}

export function getRequestLocation(rawUrl: string): RequestLocation {
  const parsedUrl = new URL(rawUrl, window.location.origin)
  const query: Record<string, string> = {}
  parsedUrl.searchParams.forEach(function (value, key) {
    query[key] = value
  })

  return {
    url:
      parsedUrl.origin === window.location.origin
        ? parsedUrl.pathname + parsedUrl.search
        : parsedUrl.toString(),
    query,
  }
}

export function parseTextBody(text: string): unknown {
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch (_error) {
    return text
  }
}

export function readRequestBody(request: Request): Promise<unknown> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return Promise.resolve(undefined)
  }

  return request
    .clone()
    .text()
    .then(parseTextBody, function () {
      return undefined
    })
}

export function readResponseBody(response: Response): Promise<unknown> {
  return response
    .clone()
    .text()
    .then(parseTextBody, function () {
      return null
    })
}

export function parseXHRRequestBody(
  body?: Document | XMLHttpRequestBodyInit | null,
): unknown {
  if (body === undefined || body === null) return undefined
  if (typeof body === 'string') return parseTextBody(body)
  if (
    typeof URLSearchParams !== 'undefined' &&
    body instanceof URLSearchParams
  ) {
    return body.toString()
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const values: Record<string, string> = {}
    body.forEach(function (value, key) {
      values[key] = typeof value === 'string' ? value : value.name
    })
    return values
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return `[Blob ${body.type || 'application/octet-stream'}; ${body.size} bytes]`
  }
  if (body instanceof ArrayBuffer) {
    return `[ArrayBuffer; ${body.byteLength} bytes]`
  }
  if (ArrayBuffer.isView(body)) {
    return `[ArrayBufferView; ${body.byteLength} bytes]`
  }
  if (typeof Document !== 'undefined' && body instanceof Document) {
    return body.documentElement ? body.documentElement.outerHTML : ''
  }
  return String(body)
}

export function readXHRResponseBody(xhr: XMLHttpRequest): unknown {
  if (!xhr.responseType || xhr.responseType === 'text') {
    try {
      return parseTextBody(xhr.responseText)
    } catch (_error) {
      return null
    }
  }

  if (xhr.responseType === 'json') return xhr.response
  if (xhr.responseType === 'blob' && xhr.response instanceof Blob) {
    const blob = xhr.response as Blob
    return `[Blob ${blob.type || 'application/octet-stream'}; ${blob.size} bytes]`
  }
  if (
    xhr.responseType === 'arraybuffer' &&
    xhr.response instanceof ArrayBuffer
  ) {
    return `[ArrayBuffer; ${xhr.response.byteLength} bytes]`
  }
  if (xhr.responseType === 'document') {
    const documentResponse = xhr.response as Document | null
    return documentResponse && documentResponse.documentElement
      ? documentResponse.documentElement.outerHTML
      : null
  }
  return xhr.response
}

export function getMockResponseMarker(
  headers: Record<string, string>,
): MockResponseMarker {
  const mockId = headers['x-mock-id'] || headers['X-Mock-Id']
  if (!mockId || mockId === 'unknown') {
    return { isMocked: false }
  }
  return { isMocked: true, mockId }
}
