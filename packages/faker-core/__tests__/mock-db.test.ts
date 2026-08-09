import type { MockConfig, QueryObject } from '@baicie/faker-shared'
import { describe, expect, it, vi } from 'vitest'
import { MocksDB } from '../src/db/mock'

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
})

describe('MocksDB route identity', () => {
  it('stores and returns the route key as the mock id', () => {
    const db = createMutableMocksDB()
    const mock = createMock(undefined)
    mock.id = 'request-correlation-id'

    const created = db.addMock(mock)

    expect(created.id).toBe('/api/users-GET')
    expect(db.getData()).toEqual({
      '/api/users-GET': created,
    })
  })

  it('moves the database key when url or method changes', () => {
    const mock = createMock(undefined)
    mock.id = '/api/users-GET'
    const db = createMutableMocksDB({ '/api/users-GET': mock })

    const updated = db.updateMock('/api/users-GET', {
      url: '/api/accounts',
      method: 'POST',
    })

    expect(updated).toBe(true)
    expect(db.getData()['/api/users-GET']).toBeUndefined()
    expect(db.getData()['/api/accounts-POST']).toMatchObject({
      id: '/api/accounts-POST',
      url: '/api/accounts',
      method: 'POST',
    })
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
})
