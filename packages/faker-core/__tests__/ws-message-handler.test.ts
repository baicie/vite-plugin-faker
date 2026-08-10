import { describe, expect, it, vi } from 'vitest'
import { WSMessageType } from '@baicie/faker-shared'
import { WSMessageHandler } from '../src/api'
import type { DBManager } from '../src/db'
import type { EventBus } from '../src/api'

describe('WSMessageHandler request correlation', () => {
  it('echoes the outer request id without reading it from list data', () => {
    const listResult = {
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    }
    const dbManager = {
      getMocksDB: () => ({
        getMocksWithPagination: vi.fn(() => listResult),
      }),
    } as unknown as DBManager
    const eventBus: EventBus = {
      emit: vi.fn(),
    }
    const handler = new WSMessageHandler(dbManager, eventBus)

    return handler
      .handleMessage({
        type: WSMessageType.MOCK_LIST,
        data: { page: 1, pageSize: 20 },
        id: 'request-1',
      })
      .then(response => {
        expect(response).toEqual({
          type: WSMessageType.MOCK_LIST,
          data: listResult,
          id: 'request-1',
        })
      })
  })
})
