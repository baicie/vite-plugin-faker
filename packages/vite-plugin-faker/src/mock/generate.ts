import type {
  ErrorMockConfig,
  FunctionMockConfig,
  MockType,
  ResponseGenerator,
  StatefulMockConfig,
  StaticMockConfig,
  TemplateMockConfig,
} from '@baicie/faker-shared'
// import second from 'http'

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

import { faker } from '@faker-js/faker'
faker.person.fullName

export const generateTemplateMockResponse: ResponseGenerator = async (
  mock,
  ctx,
) => {
  if (mock.type !== 'template') throw new Error('Invalid mock type')
  const tplMock = mock as TemplateMockConfig
  const templateFn = Handlebars.compile(tplMock.template)
  const bodyStr = templateFn({
    query: ctx.query,
    body: ctx.body,
    headers: ctx.headers,
  })
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.parse(bodyStr),
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

export const generateResponseMap: Record<MockType, ResponseGenerator> = {
  static: generateStaticMockResponse,
  function: generateFunctionMockResponse,
  template: generateTemplateMockResponse,
  error: generateErrorMockResponse,
  stateful: generateStatefulMockResponse,
}

export default generateResponseMap
