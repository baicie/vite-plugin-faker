import { describe, expect, it } from 'vitest'
import type { MockConfig, ProxyMockConfig } from '@baicie/faker-shared'
import {
  createRuleConfig,
  createRuleEditorDraft,
  validateRuleEditorDraft,
} from '../src/app/rule-editor-utils'
import type { RuleEditorDraft } from '../src/app/rule-editor-utils'

function createDraft(): RuleEditorDraft {
  return createRuleEditorDraft(null)
}

describe('rule editor conversions', function () {
  it('preserves common fields and match rules through an edit', function () {
    const config: ProxyMockConfig = {
      id: 'rule-1',
      name: 'User proxy',
      description: 'Forward user reads',
      url: '/api/users',
      method: 'GET',
      type: 'proxy',
      enabled: false,
      priority: 12,
      group: 'users',
      tags: ['read', 'remote'],
      matchRule: {
        url: { pattern: '/api/users/*', type: 'wildcard' },
        query: [{ key: 'active', operator: 'equals', value: 'true' }],
      },
      target: 'https://example.test/users',
      timeout: 4500,
      rewriteHeaders: false,
      rewriteStatus: true,
    }

    const result = createRuleConfig(createRuleEditorDraft(config))

    expect(result).toEqual(config)
  })

  it('builds static and error responses from JSON fields', function () {
    const staticDraft = createDraft()
    staticDraft.url = '/api/static'
    staticDraft.status = 201
    staticDraft.headers = '{"Content-Type":"application/json"}'
    staticDraft.body = '{"created":true}'
    staticDraft.delay = 25

    expect(createRuleConfig(staticDraft)).toEqual({
      url: '/api/static',
      method: 'GET',
      type: 'static',
      enabled: true,
      priority: 0,
      response: {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: { created: true },
        delay: 25,
      },
    })

    const errorDraft = createDraft()
    errorDraft.url = '/api/failure'
    errorDraft.type = 'error'
    errorDraft.status = 503
    errorDraft.body = '{"message":"offline"}'

    expect(createRuleConfig(errorDraft)).toMatchObject({
      url: '/api/failure',
      type: 'error',
      response: { status: 503, body: { message: 'offline' } },
    })
  })

  it('builds proxy, template, function and stateful rules', function () {
    const proxyDraft = createDraft()
    proxyDraft.url = '/api/proxy'
    proxyDraft.type = 'proxy'
    proxyDraft.target = 'http://localhost:4000'
    proxyDraft.timeout = 3000
    proxyDraft.rewriteHeaders = true
    proxyDraft.rewriteStatus = false

    expect(createRuleConfig(proxyDraft)).toMatchObject({
      type: 'proxy',
      target: 'http://localhost:4000',
      timeout: 3000,
      rewriteHeaders: true,
      rewriteStatus: false,
    })

    const templateDraft = createDraft()
    templateDraft.url = '/api/template'
    templateDraft.type = 'template'
    templateDraft.schema = '{"id":{"module":"string","method":"uuid"}}'
    templateDraft.count = 3

    expect(createRuleConfig(templateDraft)).toMatchObject({
      type: 'template',
      schema: { id: { module: 'string', method: 'uuid' } },
      count: 3,
    })

    const functionDraft = createDraft()
    functionDraft.url = '/api/function'
    functionDraft.type = 'function'
    functionDraft.handlerSource =
      'function handler(ctx) { return { status: 200, body: ctx.url } }'

    expect(createRuleConfig(functionDraft)).toMatchObject({
      type: 'function',
      handlerSource:
        'function handler(ctx) { return { status: 200, body: ctx.url } }',
    })

    const statefulDraft = createDraft()
    statefulDraft.url = '/api/stateful'
    statefulDraft.type = 'stateful'
    statefulDraft.states =
      '[{"status":200,"body":{"step":1}},{"status":202,"body":{"step":2}}]'
    statefulDraft.current = 1

    expect(createRuleConfig(statefulDraft)).toMatchObject({
      type: 'stateful',
      states: [
        { status: 200, body: { step: 1 } },
        { status: 202, body: { step: 2 } },
      ],
      current: 1,
    })
  })

  it('normalizes optional common fields and tags', function () {
    const draft = createDraft()
    draft.url = '  /api/users  '
    draft.method = 'post'
    draft.name = '  Create user  '
    draft.description = '  '
    draft.group = '  accounts  '
    draft.tags = ' first, second, first, , '
    draft.matchRule =
      '{"body":{"path":"role","operator":"equals","value":"admin"}}'

    expect(createRuleConfig(draft)).toMatchObject({
      url: '/api/users',
      method: 'POST',
      name: 'Create user',
      group: 'accounts',
      tags: ['first', 'second'],
      matchRule: {
        body: { path: 'role', operator: 'equals', value: 'admin' },
      },
    })
    expect(createRuleConfig(draft)).not.toHaveProperty('description')
  })

  it('reports common and type-specific validation errors', function () {
    const draft = createDraft()
    draft.url = ' '
    draft.status = 700
    draft.delay = -1
    draft.headers = '[]'
    draft.body = '{'
    draft.matchRule = '[]'

    expect(validateRuleEditorDraft(draft)).toEqual([
      'URL is required',
      'Status must be an integer between 100 and 599',
      'Delay must be a non-negative number',
      'Response headers must be a JSON object',
      'Response body must be valid JSON',
      'Match rule must be a JSON object',
    ])

    draft.url = '/api/test'
    draft.type = 'proxy'
    draft.target = ''
    draft.timeout = -10
    expect(validateRuleEditorDraft(draft)).toContain('Proxy target is required')
    expect(validateRuleEditorDraft(draft)).toContain(
      'Proxy timeout must be a non-negative number',
    )

    draft.type = 'template'
    draft.schema = '[]'
    draft.count = 0
    expect(validateRuleEditorDraft(draft)).toContain(
      'Template schema must be a JSON object',
    )
    expect(validateRuleEditorDraft(draft)).toContain(
      'Template count must be a positive integer',
    )

    draft.type = 'function'
    draft.handlerSource = ' '
    expect(validateRuleEditorDraft(draft)).toContain(
      'Function handler source is required',
    )

    draft.type = 'stateful'
    draft.states = '[]'
    expect(validateRuleEditorDraft(draft)).toContain(
      'Stateful rule requires at least one response',
    )
  })

  it('rejects conversion when validation fails', function () {
    const draft = createDraft()
    draft.url = ''

    expect(function () {
      createRuleConfig(draft)
    }).toThrow('URL is required')
  })

  it('round-trips every supported rule type', function () {
    const rules: MockConfig[] = [
      {
        url: '/static',
        method: 'GET',
        type: 'static',
        enabled: true,
        response: { status: 200, headers: {}, body: null, delay: 0 },
      },
      {
        url: '/error',
        method: 'GET',
        type: 'error',
        enabled: true,
        response: { status: 500, headers: {}, body: 'failed', delay: 2 },
      },
      {
        url: '/proxy',
        method: 'GET',
        type: 'proxy',
        enabled: true,
        target: 'https://example.test',
        timeout: 500,
        rewriteHeaders: true,
        rewriteStatus: true,
      },
      {
        url: '/template',
        method: 'GET',
        type: 'template',
        enabled: true,
        schema: { id: { module: 'string', method: 'uuid' } },
        count: 2,
      },
      {
        url: '/function',
        method: 'GET',
        type: 'function',
        enabled: true,
        handlerSource: 'function handler() { return { status: 204 } }',
      },
      {
        url: '/stateful',
        method: 'GET',
        type: 'stateful',
        enabled: true,
        states: [{ status: 200, body: 'one' }],
        current: 0,
      },
    ]

    rules.forEach(function (rule) {
      expect(createRuleConfig(createRuleEditorDraft(rule))).toEqual(rule)
    })
  })
})
