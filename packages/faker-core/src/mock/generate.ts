import type {
  ErrorMockConfig,
  FunctionMockConfig,
  MockContext,
  MockResponse,
  MockType,
  ProxyMockConfig,
  ResponseGenerator,
  ResponseGeneratorOptions,
  StatefulMockConfig,
  StaticMockConfig,
  TemplateMockConfig,
} from '@baicie/faker-shared'
import { resolveFakerValue } from '@baicie/faker-shared'
import { Script } from 'node:vm'

const DEFAULT_FUNCTION_HANDLER_TIMEOUT_MS = 1000
const statefulCurrentIndexes = new WeakMap<MockResponse[], number>()

function getFunctionHandlerTimeout(options?: ResponseGeneratorOptions): number {
  const timeout = options && options.functionHandlerTimeout
  return typeof timeout === 'number' && isFinite(timeout) && timeout > 0
    ? timeout
    : DEFAULT_FUNCTION_HANDLER_TIMEOUT_MS
}

function getPersistedContextSource(ctx: MockContext): string {
  return JSON.stringify({
    url: ctx.url,
    method: ctx.method,
    headers: ctx.headers,
    query: ctx.query,
    body: ctx.body,
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function waitForFunctionHandler(
  result: MockResponse | Promise<MockResponse>,
  timeout: number,
): Promise<MockResponse> {
  return new Promise(function (resolve, reject) {
    let settled = false
    const timeoutId = setTimeout(function () {
      if (!settled) {
        settled = true
        reject(new Error(`Function mock handler timed out after ${timeout}ms`))
      }
    }, timeout)

    Promise.resolve(result).then(
      function (response) {
        if (!settled) {
          settled = true
          clearTimeout(timeoutId)
          resolve(response)
        }
      },
      function (error) {
        if (!settled) {
          settled = true
          clearTimeout(timeoutId)
          reject(error)
        }
      },
    )
  })
}

function executePersistedFunctionHandler(
  source: string,
  ctx: MockContext,
  timeout: number,
): Promise<MockResponse> {
  try {
    const contextSource = getPersistedContextSource(ctx)
    const script = new Script(
      `'use strict'; const ctx = JSON.parse(${JSON.stringify(contextSource)}); (${source})(ctx)`,
      { filename: 'faker-function-mock.js' },
    )
    const result = script.runInNewContext(Object.create(null), {
      timeout,
      microtaskMode: 'afterEvaluate',
      contextCodeGeneration: {
        strings: false,
        wasm: false,
      },
    }) as MockResponse | Promise<MockResponse>

    return waitForFunctionHandler(result, timeout).then(
      function (response) {
        return response
      },
      function (error) {
        throw new Error(
          `Function mock handler failed: ${getErrorMessage(error)}`,
        )
      },
    )
  } catch (error) {
    return Promise.reject(
      new Error(`Function mock handler failed: ${getErrorMessage(error)}`),
    )
  }
}

function executeFunctionHandler(
  mock: FunctionMockConfig,
  ctx: MockContext,
  options?: ResponseGeneratorOptions,
): MockResponse | Promise<MockResponse> {
  const source = mock.handlerSource ? mock.handlerSource.trim() : ''
  if (source) {
    if (!options || options.allowFunctionHandlerSource !== true) {
      throw new Error(
        'Persisted function mock source execution is disabled by default',
      )
    }
    return executePersistedFunctionHandler(
      source,
      ctx,
      getFunctionHandlerTimeout(options),
    )
  }

  if (typeof mock.handler === 'function') {
    return mock.handler(ctx)
  }

  throw new Error('Function mock requires a handler or handler source')
}

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

export const generateFunctionMockResponse: ResponseGenerator = function (
  mock,
  ctx,
  options,
) {
  if (mock.type !== 'function') throw new Error('Invalid mock type')
  const fnMock = mock as FunctionMockConfig
  return Promise.resolve()
    .then(function () {
      return executeFunctionHandler(fnMock, ctx, options)
    })
    .then(function (res) {
      if (!res || typeof res !== 'object' || typeof res.status !== 'number') {
        throw new Error(
          'Function mock handler must return a response with a status',
        )
      }
      return {
        status: res.status,
        headers: res.headers || {},
        body: res.body,
        delay: res.delay || 0,
        source: 'function',
        meta: { mockId: mock.id, timestamp: Date.now() },
      }
    })
}

export const generateTemplateMockResponse: ResponseGenerator = async mock => {
  if (mock.type !== 'template') throw new Error('Invalid mock type')
  const templateMock = mock as TemplateMockConfig
  const body = resolveFakerValue(templateMock.schema)
  return {
    status: 200,
    headers: {},
    body,
    delay: 0,
    source: 'template',
    meta: { mockId: mock.id, timestamp: Date.now() },
  }
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
  if (!stateMock.states || stateMock.states.length === 0) {
    throw new Error('Stateful mock requires at least one state')
  }
  let current = statefulCurrentIndexes.get(stateMock.states)
  if (current === undefined) {
    current =
      typeof stateMock.current === 'number' &&
      isFinite(stateMock.current) &&
      stateMock.current >= 0
        ? Math.floor(stateMock.current)
        : 0
  }
  const idx = current % stateMock.states.length
  const res = stateMock.states[idx]
  if (!res) {
    throw new Error('Stateful mock state is invalid')
  }
  const nextIndex = (idx + 1) % stateMock.states.length
  statefulCurrentIndexes.set(stateMock.states, nextIndex)
  stateMock.current = nextIndex
  return {
    status: res.status,
    headers: res.headers || {},
    body: res.body,
    delay: res.delay || 0,
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
    const modifiedResponse = modifyProxyResponse(proxyResponse, proxyMock)

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
