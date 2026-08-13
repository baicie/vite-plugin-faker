import { describe, expect, it } from 'vitest'
import { parseOpenApiImport } from '../src/app/openapi-import-utils'

describe('OpenAPI import utilities', function () {
  it('imports OpenAPI 3 operations with local schema references and metadata', function () {
    const source = JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'Store API' },
      paths: {
        '/users/{id}': {
          get: {
            summary: 'Get user',
            description: 'Returns one user.',
            tags: ['Users', 'Read'],
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 42 },
              name: { default: 'Ada' },
              role: { type: 'string', enum: ['admin', 'viewer'] },
              active: { type: 'boolean' },
              labels: {
                type: 'array',
                items: { type: 'string', example: 'new' },
              },
            },
          },
        },
      },
    })

    expect(parseOpenApiImport(source)).toEqual([
      {
        url: '/users/:id',
        method: 'GET',
        type: 'static',
        enabled: true,
        name: 'Get user',
        description: 'Returns one user.',
        group: 'Users',
        tags: ['Users', 'Read'],
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: 42,
            name: 'Ada',
            role: 'admin',
            active: false,
            labels: ['new'],
          },
          delay: 0,
        },
      },
    ])
  })

  it('imports all supported methods from Swagger 2 and selects 201 then default responses', function () {
    const source = JSON.stringify({
      swagger: '2.0',
      info: { title: 'Legacy API' },
      paths: {
        '/resources/{resourceId}': {
          get: { responses: { 200: { schema: { type: 'string' } } } },
          post: {
            operationId: 'createResource',
            responses: { 201: { schema: { $ref: '#/definitions/Resource' } } },
          },
          put: { responses: { default: { schema: { type: 'number' } } } },
          patch: { responses: { 200: { schema: { type: 'boolean' } } } },
          delete: { responses: { 200: { schema: { type: 'array' } } } },
          options: { responses: { 200: { schema: { type: 'null' } } } },
          head: { responses: { 200: { schema: { default: 'ready' } } } },
        },
      },
      definitions: {
        Resource: {
          type: 'object',
          properties: { id: { type: 'string', example: 'resource-1' } },
        },
      },
    })

    const mocks = parseOpenApiImport(source)

    expect(
      mocks.map(function (mock) {
        return {
          method: mock.method,
          status: mock.response.status,
          body: mock.response.body,
        }
      }),
    ).toEqual([
      { method: 'GET', status: 200, body: 'string' },
      { method: 'POST', status: 201, body: { id: 'resource-1' } },
      { method: 'PUT', status: 200, body: 0 },
      { method: 'PATCH', status: 200, body: false },
      { method: 'DELETE', status: 200, body: [] },
      { method: 'OPTIONS', status: 200, body: null },
      { method: 'HEAD', status: 200, body: 'ready' },
    ])
    expect(mocks[2]).toMatchObject({
      url: '/resources/:resourceId',
      group: 'Legacy API',
      name: 'PUT /resources/{resourceId}',
    })
  })

  it('accepts JSON vendor media types and local response references', function () {
    const source = JSON.stringify({
      openapi: '3.1.0',
      paths: {
        '/health': {
          get: {
            responses: { 200: { $ref: '#/components/responses/Health' } },
          },
        },
      },
      components: {
        responses: {
          Health: {
            content: {
              'application/problem+json': {
                schema: {
                  type: 'object',
                  properties: { ok: { example: true } },
                },
              },
            },
          },
        },
      },
    })

    expect(parseOpenApiImport(source)[0]).toMatchObject({
      url: '/health',
      method: 'GET',
      response: { status: 200, body: { ok: true } },
    })
  })

  it('selects any concrete success response instead of requiring 200 or 201', function () {
    const source = JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/jobs': {
          post: {
            responses: {
              202: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: { queued: { example: true } },
                    },
                  },
                },
              },
            },
          },
        },
        '/cache': {
          delete: { responses: { 204: { description: 'Deleted' } } },
        },
      },
    })

    expect(
      parseOpenApiImport(source).map(function (mock) {
        return { url: mock.url, status: mock.response.status }
      }),
    ).toEqual([
      { url: '/jobs', status: 202 },
      { url: '/cache', status: 204 },
    ])
  })

  it('rejects invalid documents, paths, responses, and references with actionable errors', function () {
    expect(function () {
      parseOpenApiImport('{')
    }).toThrow('OpenAPI import must be valid JSON')
    expect(function () {
      parseOpenApiImport(JSON.stringify({ openapi: '3.0.0' }))
    }).toThrow('must define a paths object')
    expect(function () {
      parseOpenApiImport(JSON.stringify({ openapi: '2.0', paths: {} }))
    }).toThrow('OpenAPI 3 or Swagger 2')
    expect(function () {
      parseOpenApiImport(
        JSON.stringify({
          swagger: '2.0',
          paths: { '/users': { get: {} } },
        }),
      )
    }).toThrow('GET /users must define responses')
    expect(function () {
      parseOpenApiImport(
        JSON.stringify({
          openapi: '3.0.0',
          paths: {
            '/users': {
              get: {
                responses: {
                  200: {
                    content: {
                      'application/json': {
                        schema: { $ref: '#/components/schemas/Missing' },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      )
    }).toThrow('cannot resolve local reference')
  })
})
