import type { RequestRecord } from '@baicie/faker-shared'
import { describe, expect, it, vi } from 'vitest'
import { RequestHandler } from '../src/api/request-handler'
import type { EventBus } from '../src/api/types'
import type { DBManager } from '../src/db'
import { RequestsDB } from '../src/db/request'
import type { RequestItem } from '../src/db/types'

interface MutableRequestsDB {
  db: {
    data: Record<string, RequestItem>
  }
  save: () => void
}

function createRequestsDB(): RequestsDB {
  const requestsDB = Object.create(RequestsDB.prototype) as RequestsDB
  const mutableDB = requestsDB as unknown as MutableRequestsDB
  mutableDB.db = { data: {} }
  mutableDB.save = vi.fn()
  return requestsDB
}

describe('RequestHandler request history', () => {
  it('keeps repeated requests with the same method and url as separate records', () => {
    const requestsDB = createRequestsDB()
    const dbManager = {
      getRequestsDB: () => requestsDB,
      getMocksDB: () => ({
        findMock: vi.fn(),
      }),
    } as unknown as DBManager
    const eventBus: EventBus = {
      emit: vi.fn(),
    }
    const handler = new RequestHandler(dbManager, eventBus)
    const firstRequest: RequestRecord = {
      url: '/api/users',
      method: 'GET',
      headers: {},
      timestamp: 100,
    }
    const secondRequest: RequestRecord = {
      url: '/api/users',
      method: 'GET',
      headers: {},
      timestamp: 200,
    }

    return handler
      .handleRecorded(firstRequest)
      .then(() => handler.handleRecorded(secondRequest))
      .then(() => {
        const history = handler.handleHistory()

        expect(history.data.pagination.total).toBe(2)
        expect(history.data.items).toHaveLength(2)
      })
  })
})
