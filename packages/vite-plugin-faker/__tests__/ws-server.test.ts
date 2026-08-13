import type { DBManager } from '@baicie/faker-core'
import { FAKER_WEBSOCKET_SYMBOL, WSMessageType } from '@baicie/faker-shared'
import type { ViteDevServer, WebSocketClient } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { WSServer } from '../src/ws-server'

interface HandlerMap {
  [event: string]: (data: unknown, client?: WebSocketClient) => void
}

function createFixture() {
  const handlers: HandlerMap = {}
  const send = vi.fn()
  const server = {
    ws: {
      on: vi.fn(function (
        event: string,
        handler: (data: unknown, client?: WebSocketClient) => void,
      ) {
        handlers[event] = handler
      }),
      send,
    },
  } as unknown as ViteDevServer
  const requestsDB = {
    saveRequest: vi.fn(),
    getRequestsWithPagination: vi.fn().mockReturnValue({
      items: [],
      pagination: { total: 0, page: 1, pageSize: 20 },
    }),
    clear: vi.fn(),
  }
  const dbManager = {
    getRequestsDB: function () {
      return requestsDB
    },
    getMocksDB: function () {
      return {
        findMock: vi.fn(),
        getAllMocks: function () {
          return []
        },
      }
    },
  } as unknown as DBManager

  new WSServer(dbManager, server, {} as never)
  return { handlers, send, requestsDB }
}

function settle(): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, 0)
  })
}

describe('Vite WSServer', () => {
  it('sends correlated RPC responses only to the requesting client', () => {
    const fixture = createFixture()
    const client = { send: vi.fn() } as unknown as WebSocketClient

    fixture.handlers[FAKER_WEBSOCKET_SYMBOL]!(
      {
        type: WSMessageType.REQUEST_HISTORY,
        data: { page: 1, pageSize: 20 },
        id: 'request-1',
      },
      client,
    )

    return settle().then(function () {
      expect(client.send).toHaveBeenCalledWith(
        FAKER_WEBSOCKET_SYMBOL,
        expect.objectContaining({
          type: WSMessageType.REQUEST_HISTORY,
          id: 'request-1',
        }),
      )
      expect(fixture.send).not.toHaveBeenCalledWith(
        FAKER_WEBSOCKET_SYMBOL,
        expect.objectContaining({ id: 'request-1' }),
      )
    })
  })

  it('broadcasts newly recorded traffic', () => {
    const fixture = createFixture()
    const client = { send: vi.fn() } as unknown as WebSocketClient
    const record = {
      url: '/api/users',
      method: 'GET',
      headers: {},
      timestamp: 100,
    }

    fixture.handlers[FAKER_WEBSOCKET_SYMBOL]!(
      {
        type: WSMessageType.REQUEST_RECORDED,
        data: record,
      },
      client,
    )

    return settle().then(function () {
      expect(fixture.send).toHaveBeenCalledWith(
        FAKER_WEBSOCKET_SYMBOL,
        expect.objectContaining({
          type: WSMessageType.REQUEST_RECORDED,
          data: expect.objectContaining(record),
        }),
      )
    })
  })
})
