import type { MockConfig, QueryObject } from '@baicie/faker-shared'
import { describe, expect, it } from 'vitest'
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
