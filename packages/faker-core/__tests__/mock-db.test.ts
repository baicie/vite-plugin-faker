import type { MockConfig, QueryObject } from '@baicie/faker-shared'
import { describe, expect, it, vi } from 'vitest'
import { MocksDB } from '../src/db/mock'
import { generateResponseMap } from '../src/mock'

function createMocksDB(mocks: MockConfig[]): MocksDB {
  const db = Object.create(MocksDB.prototype) as MocksDB
  db.getActiveMocks = function () {
    return mocks
  }
  return db
}

function createMock(matchRule: MockConfig['matchRule']): MockConfig {
  return {
    url: '/api/users',
    method: 'GET',
    type: 'static',
    enabled: true,
    matchRule,
    response: {
      status: 200,
      body: {},
    },
  }
}

interface MutableMocksDB {
  db: {
    data: Record<string, MockConfig>
  }
  save: () => void
}

function createMutableMocksDB(data: Record<string, MockConfig> = {}): MocksDB {
  const db = Object.create(MocksDB.prototype) as MocksDB
  const mutableDB = db as unknown as MutableMocksDB
  mutableDB.db = { data }
  mutableDB.save = vi.fn()
  return db
}

describe('MocksDB.findMockAdvanced', () => {
  it('matches an existing query parameter with an empty value', () => {
    const mock = createMock({
      query: [{ key: 'preview', value: '', operator: 'exists' }],
    })
    const db = createMocksDB([mock])

    const result = db.findMockAdvanced({
      url: '/api/users',
      method: 'GET',
      query: { preview: '' },
    })

    expect(result).toBe(mock)
  })

  it('matches nested and repeated query parameters', () => {
    const mock = createMock({
      query: [{ key: 'filter.status', value: 'active', operator: 'equals' }],
    })
    const db = createMocksDB([mock])
    const query: QueryObject = {
      filter: {
        status: ['draft', 'active'],
      },
    }

    const result = db.findMockAdvanced({
      url: '/api/users',
      method: 'GET',
      query,
    })

    expect(result).toBe(mock)
  })

  it('matches header names case-insensitively', () => {
    const mock = createMock({
      headers: [{ key: 'X-Environment', value: 'test', operator: 'equals' }],
    })
    const db = createMocksDB([mock])

    const result = db.findMockAdvanced({
      url: '/api/users',
      method: 'GET',
      headers: { 'x-environment': 'test' },
    })

    expect(result).toBe(mock)
  })

  it('matches nested request body rules', () => {
    const mock = createMock({
      body: {
        path: 'user.role',
        value: 'admin',
        operator: 'equals',
      },
    })
    const db = createMocksDB([mock])

    const result = db.findMockAdvanced({
      url: '/api/users',
      method: 'GET',
      body: { user: { role: 'member' } },
    })

    expect(result).toBeUndefined()
  })

  it('treats regular-expression characters literally in wildcard rules', () => {
    const mock = createMock({
      url: { pattern: '/api/v1.0/*', type: 'wildcard' },
    })
    const db = createMocksDB([mock])

    const result = db.findMockAdvanced({
      url: '/api/v1x0/users',
      method: 'GET',
    })

    expect(result).toBeUndefined()
  })

  it('matches a pathname rule when the request contains a query string', () => {
    const mock = createMock({
      url: { pattern: '/api/users', type: 'exact' },
    })
    const db = createMocksDB([mock])

    const result = db.findMockAdvanced({
      url: '/api/users?preview=true',
      method: 'GET',
      query: { preview: 'true' },
    })

    expect(result).toBe(mock)
  })

  it('prefers a conditional variant over a broad route', () => {
    const broad = createMock(undefined)
    broad.id = 'broad-route'
    const variant = createMock({
      query: [{ key: 'tenant', value: 'acme', operator: 'equals' }],
    })
    variant.id = 'conditional-variant'
    const db = createMocksDB([broad, variant])

    expect(
      db.findMockAdvanced({
        url: '/api/users',
        method: 'GET',
        query: { tenant: 'acme' },
      }),
    ).toBe(variant)
    expect(
      db.findMockAdvanced({
        url: '/api/users',
        method: 'GET',
        query: { tenant: 'other' },
      }),
    ).toBe(broad)
  })
})

describe('MocksDB route identity', () => {
  it('generates a stable id and preserves the existing route rule', () => {
    const db = createMutableMocksDB()
    const mock = createMock(undefined)
    mock.id = 'request-correlation-id'

    const created = db.addMock(mock)

    expect(created.id).toBe('request-correlation-id')
    expect(db.getData()).toEqual({ 'request-correlation-id': created })
  })

  it('allows same-route conditional variants without overwriting the broad rule', () => {
    const existing = createMock(undefined)
    existing.id = '/api/users-GET'
    const db = createMutableMocksDB({ '/api/users-GET': existing })
    const variant = createMock({
      query: [{ key: 'tenant', value: 'acme', operator: 'equals' }],
    })

    const created = db.addMock(variant)

    expect(created.id).not.toBe('/api/users-GET')
    expect(Object.keys(db.getData())).toHaveLength(2)
    expect(db.getData()['/api/users-GET']).toBe(existing)
  })

  it('rejects a duplicate matching signature without changing stored data', () => {
    const existing = createMock({
      query: [{ key: 'tenant', value: 'acme', operator: 'equals' }],
    })
    existing.id = 'existing-rule'
    const db = createMutableMocksDB({ 'existing-rule': existing })
    const duplicate = createMock({
      query: [{ key: 'tenant', value: 'acme', operator: 'equals' }],
    })

    expect(function () {
      db.addMock(duplicate)
    }).toThrow('conflicts with an existing mock')
    expect(db.getData()).toEqual({ 'existing-rule': existing })
    expect((db as unknown as MutableMocksDB).save).not.toHaveBeenCalled()
  })

  it('does not persist a partial batch when an imported rule is invalid', () => {
    const existing = createMock(undefined)
    existing.id = '/api/users-GET'
    const db = createMutableMocksDB({ '/api/users-GET': existing })
    const valid = createMock(undefined)
    valid.url = '/api/accounts'
    const invalid = createMock(undefined)
    invalid.url = ''

    expect(function () {
      db.importMocks([valid, invalid])
    }).toThrow('url and method')
    expect(db.getData()).toEqual({ '/api/users-GET': existing })
    expect((db as unknown as MutableMocksDB).save).not.toHaveBeenCalled()
  })

  it('imports a valid batch with normalized route ids in one write', () => {
    const db = createMutableMocksDB()
    const users = createMock(undefined)
    const accounts = createMock(undefined)
    accounts.url = '/api/accounts'
    accounts.method = 'POST'

    const imported = db.importMocks([users, accounts])

    expect(imported).toHaveLength(2)
    expect(imported[0]!.id).toBeTruthy()
    expect(imported[1]!.id).toBeTruthy()
    expect(Object.keys(db.getData())).toHaveLength(2)
    expect((db as unknown as MutableMocksDB).save).toHaveBeenCalledOnce()
  })

  it('rejects an imported route conflict atomically', () => {
    const existing = createMock(undefined)
    existing.id = '/api/users-GET'
    const db = createMutableMocksDB({ '/api/users-GET': existing })
    const imported = createMock(undefined)
    imported.url = '/api/accounts'
    const conflicting = createMock(undefined)

    expect(function () {
      db.importMocks([imported, conflicting])
    }).toThrow('conflicts with an existing mock')
    expect(db.getData()).toEqual({ '/api/users-GET': existing })
    expect((db as unknown as MutableMocksDB).save).not.toHaveBeenCalled()
  })

  it('finds a basic route when the request contains a query string', () => {
    const mock = createMock(undefined)
    mock.id = '/api/users-GET'
    const db = createMutableMocksDB({ '/api/users-GET': mock })

    expect(
      db.findMock({ url: '/api/users?page=2', method: 'GET' }),
    ).toMatchObject({ id: '/api/users-GET' })
  })

  it('keeps the stable database key when url or method changes', () => {
    const mock = createMock(undefined)
    mock.id = '/api/users-GET'
    const db = createMutableMocksDB({ '/api/users-GET': mock })

    const updated = db.updateMock('/api/users-GET', {
      url: '/api/accounts',
      method: 'POST',
    })

    expect(updated).toBe(true)
    expect(db.getData()['/api/users-GET']).toMatchObject({
      id: '/api/users-GET',
      url: '/api/accounts',
      method: 'POST',
    })
    expect(db.getData()['/api/accounts-POST']).toBeUndefined()
  })

  it('rejects a route update that collides with another mock', () => {
    const users = createMock(undefined)
    users.id = '/api/users-GET'
    const accounts = createMock(undefined)
    accounts.id = '/api/accounts-GET'
    accounts.url = '/api/accounts'
    const db = createMutableMocksDB({
      '/api/users-GET': users,
      '/api/accounts-GET': accounts,
    })

    const updated = db.updateMock('/api/users-GET', {
      url: '/api/accounts',
    })

    expect(updated).toBe(false)
    expect(db.getData()['/api/users-GET']).toBe(users)
    expect(db.getData()['/api/accounts-GET']).toBe(accounts)
  })

  it('projects legacy embedded ids as their database keys', () => {
    const mock = createMock(undefined)
    mock.id = 'legacy-request-id'
    const db = createMutableMocksDB({ '/api/users-GET': mock })

    const result = db.getMocksWithPagination()

    expect(result.items[0]!.id).toBe('/api/users-GET')
  })

  it('finds rules by their visible name', () => {
    const mock = createMock(undefined)
    mock.id = '/api/users-GET'
    mock.name = 'Customer profile rule'
    const db = createMutableMocksDB({ '/api/users-GET': mock })

    const result = db.getMocksWithPagination(1, 20, 'customer profile')

    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.id).toBe('/api/users-GET')
  })

  it('does not serve a stale key whose stored route has changed', () => {
    const mock = createMock(undefined)
    mock.id = '/api/users-GET'
    mock.url = '/api/accounts'
    const db = createMutableMocksDB({ '/api/users-GET': mock })

    expect(db.findMock({ url: '/api/users', method: 'GET' })).toBeUndefined()
    expect(
      db.findMockAdvanced({ url: '/api/accounts', method: 'GET' }),
    ).toMatchObject({
      id: '/api/users-GET',
      url: '/api/accounts',
    })
  })

  it('treats explicit function source as the persistent implementation', () => {
    const db = createMutableMocksDB()
    const handlerSource =
      'function handler() { return { status: 201, body: { source: "persisted" } }; }'
    const mock = {
      url: '/api/function',
      method: 'GET',
      type: 'function',
      enabled: true,
      handlerSource,
      handler: function handler() {
        return { status: 200, body: { ok: true } }
      },
    } as MockConfig

    const created = db.addMock(mock) as MockConfig & {
      handlerSource?: string
    }
    const serialized = JSON.stringify(created)

    expect(created.handler).toBeUndefined()
    expect(created.handlerSource).toBe(handlerSource)
    expect(serialized).toContain('handlerSource')
    expect(serialized).not.toContain('"handler"')
  })

  it('advances a stateful mock across independent database lookups', () => {
    const db = createMutableMocksDB({
      '/api/stateful-GET': {
        id: '/api/stateful-GET',
        url: '/api/stateful',
        method: 'GET',
        type: 'stateful',
        enabled: true,
        states: [
          { status: 200, body: { step: 1 } },
          { status: 200, body: { step: 2 } },
        ],
        current: 0,
      },
    })
    const first = db.findMock({ url: '/api/stateful', method: 'GET' })!

    return generateResponseMap
      .stateful(first, {} as never)
      .then(function (firstResponse) {
        const second = db.findMock({ url: '/api/stateful', method: 'GET' })!
        return generateResponseMap
          .stateful(second, {} as never)
          .then(function (secondResponse) {
            expect(firstResponse.body).toEqual({ step: 1 })
            expect(secondResponse.body).toEqual({ step: 2 })
          })
      })
  })
})
