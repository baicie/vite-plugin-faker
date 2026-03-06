import { describe, expect, it } from 'vitest'
import type {
  ErrorMockConfig,
  StatefulMockConfig,
  StaticMockConfig,
  TemplateMockConfig,
} from '@baicie/faker-shared'
import { generateResponseMap } from '../src/mock/generate'

const baseCtx: any = {
  req: {},
  url: '/api/test',
  method: 'GET',
  headers: {},
  query: {},
  body: undefined,
}

describe('generateResponseMap - static', () => {
  it('返回静态响应的 status、body', async () => {
    const mock: StaticMockConfig = {
      url: '/api/test',
      method: 'GET',
      type: 'static',
      enabled: true,
      response: { status: 200, body: { id: 1, name: 'Alice' } },
    }
    const result = await generateResponseMap.static(mock, baseCtx)
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ id: 1, name: 'Alice' })
    expect(result.source).toBe('static')
  })

  it('缺少 status 时默认为 200', async () => {
    const mock: StaticMockConfig = {
      url: '/api/test',
      method: 'GET',
      type: 'static',
      enabled: true,
      response: { status: 200, body: null },
    }
    const result = await generateResponseMap.static(mock, baseCtx)
    expect(result.status).toBe(200)
  })

  it('传入非 static 类型时抛出错误', async () => {
    const mock = {
      url: '/api/test',
      method: 'GET',
      type: 'error',
      enabled: true,
      response: { status: 500, body: {} },
    } as any
    await expect(generateResponseMap.static(mock, baseCtx)).rejects.toThrow()
  })
})

describe('generateResponseMap - error', () => {
  it('返回错误响应的 status 和 body', async () => {
    const mock: ErrorMockConfig = {
      url: '/api/test',
      method: 'GET',
      type: 'error',
      enabled: true,
      response: { status: 500, body: { message: 'Internal Server Error' } },
    }
    const result = await generateResponseMap.error(mock, baseCtx)
    expect(result.status).toBe(500)
    expect(result.body).toEqual({ message: 'Internal Server Error' })
    expect(result.source).toBe('error')
  })

  it('传入非 error 类型时抛出错误', async () => {
    const mock = { type: 'static' } as any
    await expect(generateResponseMap.error(mock, baseCtx)).rejects.toThrow()
  })
})

describe('generateResponseMap - stateful', () => {
  it('依次轮换状态', async () => {
    const mock: StatefulMockConfig = {
      url: '/api/test',
      method: 'GET',
      type: 'stateful',
      enabled: true,
      states: [
        { status: 200, body: 'state-0' },
        { status: 201, body: 'state-1' },
        { status: 202, body: 'state-2' },
      ],
    }
    const r0 = await generateResponseMap.stateful(mock, baseCtx)
    expect(r0.status).toBe(200)
    expect(r0.body).toBe('state-0')

    const r1 = await generateResponseMap.stateful(mock, baseCtx)
    expect(r1.status).toBe(201)
    expect(r1.body).toBe('state-1')

    const r2 = await generateResponseMap.stateful(mock, baseCtx)
    expect(r2.status).toBe(202)
    expect(r2.body).toBe('state-2')

    const r3 = await generateResponseMap.stateful(mock, baseCtx)
    expect(r3.status).toBe(200)
    expect(r3.body).toBe('state-0')
  })

  it('传入非 stateful 类型时抛出错误', async () => {
    const mock = { type: 'static' } as any
    await expect(generateResponseMap.stateful(mock, baseCtx)).rejects.toThrow()
  })
})

describe('generateResponseMap - template', () => {
  it('使用 faker.js schema 生成 GeneratedResponse 结构', async () => {
    const mock: TemplateMockConfig = {
      url: '/api/test',
      method: 'GET',
      type: 'template',
      enabled: true,
      schema: {
        name: { module: 'person', method: 'firstName' },
        age: { module: 'number', method: 'int', args: [{ min: 18, max: 30 }] },
      },
    }
    const result = await generateResponseMap.template(mock, baseCtx)
    expect(result.status).toBe(200)
    expect(result.source).toBe('template')
    expect(typeof result.body.name).toBe('string')
    expect(typeof result.body.age).toBe('number')
  })

  it('传入非 template 类型时抛出错误', async () => {
    const mock = { type: 'static' } as any
    await expect(generateResponseMap.template(mock, baseCtx)).rejects.toThrow()
  })
})
