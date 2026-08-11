import { describe, expect, it, vi } from 'vitest'
import { FAKER_WEBSOCKET_SYMBOL, WSClient } from '../src/ws'
import { WSMessageType } from '../src/type'
import type { WSMessage } from '../src/type'
import type { FakerLogger } from '../src/ws'

interface CreateMockPayload {
  method: string
  url: string
}

interface FakeHotContext {
  accept: () => void
  on: (event: string, handler: (message: WSMessage) => void) => void
  send: (event: string, data: unknown) => void
}

interface SendWithRequestId {
  (type: WSMessageType, data: CreateMockPayload, id: string): void
}

describe('WSClient request correlation', function () {
  it('places the request id on the outer message envelope', function () {
    const hotSend = vi.fn()
    const hotContext: FakeHotContext = {
      accept: vi.fn(),
      on: vi.fn(),
      send: hotSend,
    }
    const logger: FakerLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }
    const client = new WSClient('', logger, hotContext)

    const payload: CreateMockPayload = {
      method: 'GET',
      url: '/api/users',
    }
    const send = client.send.bind(client) as SendWithRequestId

    send(WSMessageType.MOCK_CREATE, payload, 'request-1')

    expect(hotSend).toHaveBeenCalledTimes(1)
    const hotSendCall = hotSend.mock.calls[0]!
    expect(hotSendCall[0]).toBe(FAKER_WEBSOCKET_SYMBOL)
    expect(hotSendCall[1]).toEqual({
      type: WSMessageType.MOCK_CREATE,
      data: payload,
      id: 'request-1',
    } satisfies WSMessage<CreateMockPayload>)
    expect(payload).not.toHaveProperty('id')
    expect(client.getStatus()).toBe('connected')
  })
})

describe('WSClient connection lifecycle', function () {
  it('queues messages until the socket opens and then flushes once', function () {
    const originalWebSocket = globalThis.WebSocket
    const sent: string[] = []

    class FakeWebSocket {
      static OPEN = 1
      readyState = 0
      onopen: (() => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onclose: (() => void) | null = null

      constructor(_url: string) {}

      send(message: string): void {
        sent.push(message)
      }

      close(): void {}
    }

    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
    const logger = createLogger()
    const client = new WSClient('ws://localhost:3456', logger)
    const socket = (client as unknown as { ws: FakeWebSocket }).ws

    client.send(WSMessageType.MOCK_LIST, { page: 1 }, 'request-1')
    expect(sent).toHaveLength(0)

    socket.readyState = FakeWebSocket.OPEN
    if (socket.onopen) socket.onopen()

    expect(sent).toEqual([
      JSON.stringify({
        type: WSMessageType.MOCK_LIST,
        data: { page: 1 },
        id: 'request-1',
      }),
    ])

    client.close()
    globalThis.WebSocket = originalWebSocket
  })

  it('exposes connection state and never sends after close', function () {
    const originalWebSocket = globalThis.WebSocket
    const statuses: string[] = []

    class FakeWebSocket {
      static OPEN = 1
      readyState = 0
      onopen: (() => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onclose: (() => void) | null = null
      send = vi.fn()

      constructor(_url: string) {}

      close(): void {
        if (this.onclose) this.onclose()
      }
    }

    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
    const client = new WSClient('ws://localhost:3456', createLogger())
    const socket = (client as unknown as { ws: FakeWebSocket }).ws
    client.onStatus(function (status) {
      statuses.push(status)
    })
    socket.readyState = FakeWebSocket.OPEN
    if (socket.onopen) socket.onopen()
    client.close()
    client.send(WSMessageType.MOCK_LIST, undefined, 'after-close')

    expect(statuses).toEqual(['connecting', 'connected', 'closed'])
    expect(socket.send).not.toHaveBeenCalled()
    globalThis.WebSocket = originalWebSocket
  })
})

function createLogger(): FakerLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}
