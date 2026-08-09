import { describe, expect, it } from 'vitest'
import type {
  ErrorMockConfig,
  FunctionMockConfig,
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

  it('rejects an empty state list', () => {
    const mock: StatefulMockConfig = {
      url: '/api/test',
      method: 'GET',
      type: 'stateful',
      enabled: true,
      states: [],
    }

    return expect(generateResponseMap.stateful(mock, baseCtx)).rejects.toThrow(
      'at least one state',
    )
  })
})

describe('generateResponseMap - function', () => {
  it('executes an in-memory handler without enabling persisted source', () => {
    const mock: FunctionMockConfig = {
      id: '/api/test-GET',
      url: '/api/test',
      method: 'GET',
      type: 'function',
      enabled: true,
      handler: function () {
        return { status: 200, body: { source: 'runtime' } }
      },
    }

    return generateResponseMap.function(mock, baseCtx).then(result => {
      expect(result.body).toEqual({ source: 'runtime' })
    })
  })

  it('rejects persisted source unless execution is explicitly enabled', () => {
    const mock: FunctionMockConfig = {
      url: '/api/test',
      method: 'GET',
      type: 'function',
      enabled: true,
      handlerSource: 'function handler() { return { status: 200, body: {} }; }',
    }

    return expect(generateResponseMap.function(mock, baseCtx)).rejects.toThrow(
      'disabled',
    )
  })

  it('executes a handler source after a JSON persistence round trip', () => {
    const mock = JSON.parse(
      JSON.stringify({
        id: '/api/test-POST',
        url: '/api/test',
        method: 'POST',
        type: 'function',
        enabled: true,
        handlerSource:
          'function handler(ctx) { return { status: 201, headers: { "x-source": "function" }, body: { value: ctx.body.value }, delay: 5 }; }',
      }),
    ) as FunctionMockConfig
    const ctx = Object.assign({}, baseCtx, {
      method: 'POST',
      body: { value: 'persisted' },
    })

    return generateResponseMap
      .function(mock, ctx, { allowFunctionHandlerSource: true })
      .then(result => {
        expect(result).toMatchObject({
          status: 201,
          headers: { 'x-source': 'function' },
          body: { value: 'persisted' },
          delay: 5,
          source: 'function',
          meta: { mockId: '/api/test-POST' },
        })
      })
  })

  it('does not expose host constructors to persisted source', () => {
    const mock: FunctionMockConfig = {
      url: '/api/test',
      method: 'GET',
      type: 'function',
      enabled: true,
      handlerSource:
        'function handler(ctx) { return { status: 200, body: ctx.constructor.constructor("return process")() }; }',
    }

    return expect(
      generateResponseMap.function(mock, baseCtx, {
        allowFunctionHandlerSource: true,
      }),
    ).rejects.toThrow('Code generation from strings disallowed')
  })

  it('times out CPU work scheduled by a handler promise', () => {
    const mock: FunctionMockConfig = {
      url: '/api/test',
      method: 'GET',
      type: 'function',
      enabled: true,
      handlerSource:
        'function handler() { return Promise.resolve().then(function () { var start = Date.now(); while (Date.now() - start < 50) {} return { status: 200, body: {} }; }); }',
    }

    return expect(
      generateResponseMap.function(mock, baseCtx, {
        allowFunctionHandlerSource: true,
        functionHandlerTimeout: 10,
      }),
    ).rejects.toThrow('timed out')
  })

  it('rejects a function mock without a handler or source', () => {
    const mock = {
      url: '/api/test',
      method: 'GET',
      type: 'function',
      enabled: true,
    } as FunctionMockConfig

    return expect(generateResponseMap.function(mock, baseCtx)).rejects.toThrow(
      'handler source',
    )
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
