import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WSMessageType } from '@baicie/faker-shared'
import type { WSMessage } from '@baicie/faker-shared'
import { useWsRequest } from '../src/hooks/use-ws-request'

interface WSHandler {
  (data: unknown, message: WSMessage): void
}

interface CreateMockPayload {
  method: string
  url: string
}

interface RequestResult {
  request: string
}

const fakeWsClient = vi.hoisted(function () {
  const handlers = new Map<WSMessageType, Set<WSHandler>>()
  const send =
    vi.fn<(type: WSMessageType, data?: unknown, id?: string) => void>()
  const on = vi.fn(function (type: WSMessageType, handler: WSHandler): void {
    let typeHandlers = handlers.get(type)
    if (!typeHandlers) {
      typeHandlers = new Set<WSHandler>()
      handlers.set(type, typeHandlers)
    }
    typeHandlers.add(handler)
  })
  const off = vi.fn(function (type: WSMessageType, handler: WSHandler): void {
    const typeHandlers = handlers.get(type)
    if (typeHandlers) {
      typeHandlers.delete(handler)
    }
  })

  return {
    handlers,
    off,
    on,
    send,
  }
})

vi.mock('../src/hooks/use-app-context', function () {
  return {
    useAppContext: function () {
      return { timeout: 0 }
    },
  }
})

vi.mock('../src/hooks/use-ws', function () {
  return { wsClient: fakeWsClient }
})

function emitResponse(
  type: WSMessageType,
  data: unknown,
  id: string | undefined,
): void {
  const typeHandlers = fakeWsClient.handlers.get(type)
  if (!typeHandlers) {
    return
  }

  const message: WSMessage = { type, data, id }
  typeHandlers.forEach(function (handler) {
    handler(data, message)
  })
}

describe('useWsRequest request correlation', function () {
  beforeEach(function () {
    fakeWsClient.handlers.clear()
    vi.clearAllMocks()
  })

  it('keeps the generated request id out of business data', function () {
    const request = useWsRequest<CreateMockPayload, RequestResult>({
      sendType: WSMessageType.MOCK_CREATE,
      responseType: WSMessageType.MOCK_CREATED,
    })
    const payload: CreateMockPayload = {
      method: 'GET',
      url: '/api/users',
    }

    const resultPromise = request(payload)
    const sendCall = fakeWsClient.send.mock.calls[0]!
    const requestId = sendCall[2]

    emitResponse(WSMessageType.MOCK_CREATED, { request: 'created' }, requestId)

    return resultPromise.then(function (result) {
      expect(sendCall[0]).toBe(WSMessageType.MOCK_CREATE)
      expect(sendCall[1]).toEqual(payload)
      expect(sendCall[1]).not.toHaveProperty('id')
      expect(requestId).toEqual(expect.any(String))
      expect(result).toEqual({ request: 'created' })
    })
  })

  it('matches concurrent responses of the same type by outer message id', function () {
    const request = useWsRequest<CreateMockPayload, RequestResult>({
      sendType: WSMessageType.MOCK_CREATE,
      responseType: WSMessageType.MOCK_CREATED,
    })

    const firstPromise = request({ method: 'GET', url: '/api/first' })
    const secondPromise = request({ method: 'GET', url: '/api/second' })
    const firstRequestId = fakeWsClient.send.mock.calls[0]![2]
    const secondRequestId = fakeWsClient.send.mock.calls[1]![2]

    emitResponse(
      WSMessageType.MOCK_CREATED,
      { request: 'second' },
      secondRequestId,
    )
    emitResponse(
      WSMessageType.MOCK_CREATED,
      { request: 'first' },
      firstRequestId,
    )

    return Promise.all([firstPromise, secondPromise]).then(function (results) {
      expect(results).toEqual([{ request: 'first' }, { request: 'second' }])
      expect(firstRequestId).toEqual(expect.any(String))
      expect(secondRequestId).toEqual(expect.any(String))
      expect(firstRequestId).not.toBe(secondRequestId)
    })
  })

  it('rejects only the correlated request when the server returns an error', function () {
    const request = useWsRequest<CreateMockPayload, RequestResult>({
      sendType: WSMessageType.MOCK_CREATE,
      responseType: WSMessageType.MOCK_CREATED,
    })

    const firstPromise = request({ method: 'GET', url: '/api/first' })
    const secondPromise = request({ method: 'GET', url: '/api/second' })
    const firstRequestId = fakeWsClient.send.mock.calls[0]![2]
    const secondRequestId = fakeWsClient.send.mock.calls[1]![2]

    emitResponse(
      WSMessageType.ERROR,
      { message: 'Mock rule already exists' },
      firstRequestId,
    )
    emitResponse(
      WSMessageType.MOCK_CREATED,
      { request: 'second' },
      secondRequestId,
    )

    return Promise.all([
      expect(firstPromise).rejects.toThrow('Mock rule already exists'),
      expect(secondPromise).resolves.toEqual({ request: 'second' }),
    ]).then(function () {
      expect(fakeWsClient.handlers.get(WSMessageType.ERROR)).toEqual(
        new Set<WSHandler>(),
      )
      expect(fakeWsClient.handlers.get(WSMessageType.MOCK_CREATED)).toEqual(
        new Set<WSHandler>(),
      )
    })
  })
})
