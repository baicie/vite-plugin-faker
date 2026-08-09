import { describe, expect, it, vi } from 'vitest'
import { createLoggerInstance } from '@baicie/logger'
import { FAKER_WEBSOCKET_SYMBOL, WSClient } from '../src/ws'
import { WSMessageType } from '../src/type'
import type { WSMessage } from '../src/type'

interface CreateMockPayload {
  method: string
  url: string
}

interface FakeHotContext {
  accept: () => void
  send: (event: string, data: unknown) => void
}

interface MutableWSClient {
  ws: FakeHotContext
}

interface SendWithRequestId {
  (type: WSMessageType, data: CreateMockPayload, id: string): void
}

describe('WSClient request correlation', function () {
  it('places the request id on the outer message envelope', function () {
    const hotSend = vi.fn()
    const hotContext: FakeHotContext = {
      accept: vi.fn(),
      send: hotSend,
    }
    const client = new WSClient('', createLoggerInstance({ enabled: false }))
    ;(client as unknown as MutableWSClient).ws = hotContext

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
  })
})
