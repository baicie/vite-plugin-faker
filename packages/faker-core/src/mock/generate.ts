import type {
  ErrorMockConfig,
  FunctionMockConfig,
  MockType,
  ProxyMockConfig,
  ResponseGenerator,
  StatefulMockConfig,
  StaticMockConfig,
} from '@baicie/faker-shared'
import { resolveFakerValue } from '@baicie/faker-shared'

const generateStaticMockResponse: ResponseGenerator = async mock => {
  if (mock.type !== 'static') {
    throw new Error('generateStaticMockResponse can only handle static mocks')
  }

  const staticMock = mock as StaticMockConfig<any>

  return {
    status: staticMock.response.status ?? 200,
    headers: staticMock.response.headers ?? {},
    body: staticMock.response.body,
    delay: staticMock.response.delay ?? 0,
    source: 'static',
    meta: {
      mockId: staticMock.id,
      timestamp: Date.now(),
    },
  }
}

export const generateFunctionMockResponse: ResponseGenerator = async (
  mock,
  ctx,
) => {
  if (mock.type !== 'function') throw new Error('Invalid mock type')
  const fnMock = mock as FunctionMockConfig
  const res = await fnMock.handler(ctx)
  return {
    status: res.status,
    headers: res.headers ?? {},
    body: res.body,
    delay: res.delay ?? 0,
    source: 'function',
    meta: { mockId: mock.id, timestamp: Date.now() },
  }
}

export const generateTemplateMockResponse: ResponseGenerator = mock => {
  if (mock.type !== 'template') throw new Error('Invalid mock type')

  return resolveFakerValue(mock.schema)
}

export const generateErrorMockResponse: ResponseGenerator = async mock => {
  if (mock.type !== 'error') throw new Error('Invalid mock type')
  const errMock = mock as ErrorMockConfig
  return {
    status: errMock.response.status,
    headers: errMock.response.headers ?? {},
    body: errMock.response.body,
    delay: errMock.response.delay ?? 0,
    source: 'error',
    meta: { mockId: mock.id, timestamp: Date.now() },
  }
}

export const generateStatefulMockResponse: ResponseGenerator = async mock => {
  if (mock.type !== 'stateful') throw new Error('Invalid mock type')
  const stateMock = mock as StatefulMockConfig
  const idx = (stateMock.current ?? 0) % stateMock.states.length
  const res = stateMock.states[idx]
  stateMock.current = (idx + 1) % stateMock.states.length
  return {
    status: res?.status!,
    headers: res?.headers ?? {},
    body: res?.body,
    delay: res?.delay ?? 0,
    source: 'stateful',
    meta: { mockId: mock.id, timestamp: Date.now() },
  }
}

export const generateProxyMockResponse: ResponseGenerator = async (
  mock,
  ctx,
) => {
  if (mock.type !== 'proxy') throw new Error('Invalid mock type')
  const proxyMock = mock as ProxyMockConfig

  try {
    // 构建目标 URL
    const targetUrl = buildProxyUrl(proxyMock.target, ctx)

    // 发起代理请求
    const proxyResponse = await fetchProxy(targetUrl, ctx, proxyMock)

    // 处理响应修改
    const modifiedResponse = modifyProxyResponse(
      proxyResponse,
      proxyMock,
    )

    return {
      status: modifiedResponse.status,
      headers: modifiedResponse.headers,
      body: modifiedResponse.body,
      delay: 0,
      source: 'proxy',
      meta: {
        mockId: mock.id,
        timestamp: Date.now(),
        proxiedUrl: targetUrl,
      },
    }
  } catch (error) {
    return {
      status: 502,
      headers: {},
      body: {
        error: 'Proxy request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      delay: 0,
      source: 'proxy',
      meta: { mockId: mock.id, timestamp: Date.now() },
    }
  }
}

/**
 * 构建代理目标 URL
 */
function buildProxyUrl(target: string, ctx: any): string {
  let url = target

  // 替换 URL 中的动态部分
  if (ctx.query) {
    for (const [key, value] of Object.entries(ctx.query)) {
      url = url.replace(`{${key}}`, String(value))
      url = url.replace(`:${key}`, String(value))
    }
  }

  // 如果目标 URL 不包含协议，添加 http://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`
  }

  return url
}

/**
 * 发起代理请求
 */
async function fetchProxy(
  url: string,
  ctx: any,
  proxyMock: ProxyMockConfig,
): Promise<{
  status: number
  headers: Record<string, string>
  body: any
}> {
  const timeout = proxyMock.timeout ?? 10000

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const headers: Record<string, string> = {}

    // 根据配置决定是否透传 headers
    if (proxyMock.rewriteHeaders) {
      for (const [key, value] of Object.entries(ctx.headers)) {
        if (typeof value === 'string') {
          headers[key] = value
        }
      }
    }

    // 添加默认的 Content-Type（如果不存在）
    if (!headers['Content-Type'] && ctx.body) {
      headers['Content-Type'] = 'application/json'
    }

    const fetchOptions: RequestInit = {
      method: ctx.method || 'GET',
      headers,
      signal: controller.signal,
    }

    // 添加 body（如果是 POST/PUT/PATCH 等方法）
    if (
      ctx.body &&
      ['POST', 'PUT', 'PATCH'].includes(String(ctx.method).toUpperCase())
    ) {
      fetchOptions.body =
        typeof ctx.body === 'string' ? ctx.body : JSON.stringify(ctx.body)
    }

    const response = await fetch(url, fetchOptions)

    // 收集响应 headers
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // 解析响应 body
    const text = await response.text()
    let body: any
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }

    return {
      status: response.status,
      headers: responseHeaders,
      body,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 修改代理响应
 */
function modifyProxyResponse(
  proxyResponse: {
    status: number
    headers: Record<string, string>
    body: any
  },
  proxyMock: ProxyMockConfig,
): {
  status: number
  headers: Record<string, string>
  body: any
} {
  if (!proxyMock.modifyResponse) {
    // 根据配置决定是否透传 status
    if (!proxyMock.rewriteStatus) {
      return {
        status: proxyResponse.status,
        headers: proxyResponse.headers,
        body: proxyResponse.body,
      }
    }
    return proxyResponse
  }

  const modified = proxyMock.modifyResponse(proxyResponse)

  return {
    status: modified.status ?? proxyResponse.status,
    headers: modified.headers ?? proxyResponse.headers,
    body: modified.body ?? proxyResponse.body,
  }
}

export const generateResponseMap: Record<MockType, ResponseGenerator> = {
  static: generateStaticMockResponse,
  proxy: generateProxyMockResponse,
  template: generateTemplateMockResponse,
  function: generateFunctionMockResponse,
  error: generateErrorMockResponse,
  stateful: generateStatefulMockResponse,
}

export default generateResponseMap
