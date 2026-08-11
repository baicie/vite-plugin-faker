import { EventBusType, WSMessageType } from '@baicie/faker-shared'
import type { WSMessage } from '@baicie/faker-shared'
import type { DBManager } from '@baicie/faker-core'
import { describe, expect, it, vi } from 'vitest'
import { WSServer } from '../src/ws-server'
import { createServer } from 'node:http'

interface FakeSocket {
  OPEN: number
  readyState: number
  send: ReturnType<typeof vi.fn>
}

interface WSServerInternals {
  eventBus: {
    emit(type: EventBusType, data?: unknown): void
  }
  server?: {
    clients: Set<FakeSocket>
  }
  handleMessage(client: FakeSocket, message: WSMessage): Promise<void>
}

function createDbManager(clear?: () => void): DBManager {
  return {
    getRequestsDB: function () {
      return {
        saveRequest: vi.fn(),
        getRequestsWithPagination: vi.fn().mockReturnValue({
          items: [],
          pagination: { total: 0, page: 1, pageSize: 20 },
        }),
        clear: clear || vi.fn(),
      }
    },
    getMocksDB: function () {
      return {
        findMock: vi.fn(),
        findMockAdvanced: vi.fn(),
        getAllMocks: vi.fn().mockReturnValue([]),
      }
    },
  } as unknown as DBManager
}

describe('Webpack WSServer broadcasts', function () {
  it('broadcasts recorded traffic and cache-cleared events to connected clients', function () {
    const server = new WSServer(createDbManager(), createServer(), {
      uiOptions: {},
    } as never)
    const internals = server as unknown as WSServerInternals
    const client: FakeSocket = {
      OPEN: 1,
      readyState: 1,
      send: vi.fn(),
    }

    internals.server!.clients.add(client)
    const record = {
      id: 'request-1',
      url: '/api/users',
      method: 'GET',
      headers: {},
      timestamp: 100,
    }

    internals.eventBus.emit(EventBusType.DB_REQUEST_SAVED, record)
    internals.eventBus.emit(EventBusType.DB_CACHE_CLEARED)

    expect(client.send).toHaveBeenNthCalledWith(
      1,
      JSON.stringify({
        type: WSMessageType.REQUEST_RECORDED,
        data: record,
      }),
    )
    expect(client.send).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({
        type: WSMessageType.REQUEST_CLEARED,
      }),
    )
  })

  it('returns an error with the original request id to the requesting client', function () {
    const clearError = new Error('Unable to clear request history')
    const server = new WSServer(
      createDbManager(function () {
        throw clearError
      }),
      createServer(),
      { uiOptions: {} } as never,
    )
    const internals = server as unknown as WSServerInternals
    const client: FakeSocket = {
      OPEN: 1,
      readyState: 1,
      send: vi.fn(),
    }

    return internals
      .handleMessage(client, {
        type: WSMessageType.REQUEST_CLEAR,
        id: 'clear-request-1',
      })
      .then(function () {
        expect(client.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: WSMessageType.ERROR,
            data: { message: clearError.message },
            id: 'clear-request-1',
          }),
        )
      })
  })
})
