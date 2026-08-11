import type {
  DashboardQuery,
  Page,
  RequestRecord,
  WSMessage,
} from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared'
import { render } from '@zeus-js/zeus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TrafficWorkspace from '../src/app/traffic-workspace'
import type {
  TrafficMessageHandler,
  TrafficRealtimeClient,
} from '../src/app/traffic-workspace'

const requestApi = vi.hoisted(function () {
  return {
    clearRequestHistory: vi.fn<(data: null) => Promise<{ success: boolean }>>(),
    fetchRequestHistory:
      vi.fn<(query: DashboardQuery) => Promise<Page<RequestRecord>>>(),
  }
})

vi.mock('../src/api/request', function () {
  return requestApi
})

class FakeTrafficClient implements TrafficRealtimeClient {
  private handlers = new Map<WSMessageType, Set<TrafficMessageHandler>>()

  on(type: WSMessageType, handler: TrafficMessageHandler): void {
    let handlers = this.handlers.get(type)
    if (!handlers) {
      handlers = new Set<TrafficMessageHandler>()
      this.handlers.set(type, handlers)
    }
    handlers.add(handler)
  }

  off(type: WSMessageType, handler: TrafficMessageHandler): void {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  emit(type: WSMessageType, data: unknown): void {
    const handlers = this.handlers.get(type)
    if (!handlers) {
      return
    }
    const message: WSMessage = { type, data }
    handlers.forEach(function (handler) {
      handler(data, message)
    })
  }

  listenerCount(type: WSMessageType): number {
    const handlers = this.handlers.get(type)
    return handlers ? handlers.size : 0
  }
}

const firstRecord: RequestRecord = {
  id: 'request-1',
  url: '/api/users?limit=10',
  method: 'GET',
  headers: { accept: 'application/json' },
  query: { limit: '10' },
  response: {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: { users: ['Ada'] },
  },
  duration: 18,
  isMocked: true,
  mockId: 'mock-1',
  mockSource: 'static',
  timestamp: 1000,
}

const secondRecord: RequestRecord = {
  id: 'request-2',
  url: '/api/orders/42',
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: { quantity: 2 },
  response: {
    statusCode: 503,
    headers: { 'retry-after': '10' },
    body: { error: 'Unavailable' },
  },
  duration: 1250,
  isMocked: false,
  timestamp: 2000,
}

function createPage(
  items: RequestRecord[],
  page = 1,
  total = items.length,
): Page<RequestRecord> {
  return {
    items,
    pagination: {
      page,
      pageSize: 20,
      total,
      totalPages: Math.ceil(total / 20),
    },
  }
}

function settle(): Promise<void> {
  return Promise.resolve().then(function () {
    return Promise.resolve()
  })
}

function getButton(target: Element, label: string): HTMLElement {
  const button = target.querySelector<HTMLElement>(
    'zw-button[aria-label="' + label + '"]',
  )
  if (!button) {
    throw new Error('Could not find button: ' + label)
  }
  return button
}

function submitSearch(target: Element): void {
  const form = target.querySelector<HTMLFormElement>('.traffic-search')
  if (!form) {
    throw new Error('Could not find traffic search form')
  }
  form.dispatchEvent(
    new SubmitEvent('submit', { bubbles: true, cancelable: true }),
  )
}

describe('TrafficWorkspace', function () {
  let target: HTMLDivElement
  let dispose: () => void
  let originalFetch: typeof window.fetch

  beforeEach(function () {
    target = document.createElement('div')
    document.body.appendChild(target)
    dispose = function () {}
    originalFetch = window.fetch
    vi.clearAllMocks()
    requestApi.clearRequestHistory.mockResolvedValue({ success: true })
    requestApi.fetchRequestHistory.mockResolvedValue(
      createPage([firstRecord, secondRecord]),
    )
  })

  afterEach(function () {
    dispose()
    window.fetch = originalFetch
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('loads traffic, selects a record, and creates a rule from its detail', function () {
    const client = new FakeTrafficClient()
    const onCreateRule = vi.fn<(record: RequestRecord) => void>()

    dispose = render(function () {
      return TrafficWorkspace({
        client,
        onCreateRule,
      })
    }, target)

    expect(target.textContent).toContain('Loading traffic')

    return settle().then(function () {
      expect(requestApi.fetchRequestHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      })
      expect(target.textContent).toContain('/api/users?limit=10')
      expect(target.textContent).toContain('200')
      expect(target.textContent).toContain('Mock hit')
      expect(target.textContent).toContain('18 ms')

      const secondRow = target.querySelector<HTMLElement>(
        '[data-request-id="request-2"]',
      )
      if (!secondRow) {
        throw new Error('Expected the second traffic row')
      }
      secondRow.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      )

      expect(target.querySelector('.traffic-detail')?.textContent).toContain(
        '/api/orders/42',
      )
      expect(target.querySelector('.traffic-detail')?.textContent).toContain(
        '503',
      )
      expect(target.querySelector('.traffic-detail')?.textContent).toContain(
        '1.25 s',
      )

      getButton(target, 'Create rule from request').click()
      expect(onCreateRule).toHaveBeenCalledWith(secondRecord)
    })
  })

  it('replays the selected request with its method and headers', function () {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    window.fetch = fetchMock
    const client = new FakeTrafficClient()

    dispose = render(function () {
      return TrafficWorkspace({ client, onCreateRule: function () {} })
    }, target)

    return settle()
      .then(function () {
        const firstRow = target.querySelector<HTMLElement>(
          '[data-request-id="request-1"]',
        )
        if (!firstRow) {
          throw new Error('Expected the first traffic row')
        }
        firstRow.click()
        getButton(target, 'Replay request').click()
        return settle()
      })
      .then(function () {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/users?limit=10',
          expect.objectContaining({
            method: 'GET',
            headers: { accept: 'application/json' },
          }),
        )
        expect(target.querySelector('.traffic-detail')?.textContent).toContain(
          'Replay completed: HTTP 204',
        )
      })
  })

  it('asks for confirmation before replaying a mutating request', function () {
    const fetchMock = vi.fn()
    window.fetch = fetchMock
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const client = new FakeTrafficClient()

    dispose = render(function () {
      return TrafficWorkspace({ client, onCreateRule: function () {} })
    }, target)

    return settle().then(function () {
      const secondRow = target.querySelector<HTMLElement>(
        '[data-request-id="request-2"]',
      )
      if (!secondRow) {
        throw new Error('Expected the second traffic row')
      }
      secondRow.click()
      getButton(target, 'Replay request').click()

      expect(confirmMock).toHaveBeenCalledWith(
        'Replay POST request? It may change data.',
      )
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  it('shows a failure message when replay cannot reach the target', function () {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    window.fetch = fetchMock
    const client = new FakeTrafficClient()

    dispose = render(function () {
      return TrafficWorkspace({ client, onCreateRule: function () {} })
    }, target)

    return settle()
      .then(function () {
        const firstRow = target.querySelector<HTMLElement>(
          '[data-request-id="request-1"]',
        )
        if (!firstRow) {
          throw new Error('Expected the first traffic row')
        }
        firstRow.click()
        getButton(target, 'Replay request').click()
        return settle()
      })
      .then(function () {
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(target.querySelector('.traffic-detail')?.textContent).toContain(
          'Replay failed: offline',
        )
      })
  })

  it('searches, refreshes, and changes pages with the active query', function () {
    const client = new FakeTrafficClient()
    requestApi.fetchRequestHistory
      .mockResolvedValueOnce(createPage([firstRecord], 1, 25))
      .mockResolvedValueOnce(createPage([secondRecord], 1, 1))
      .mockResolvedValueOnce(createPage([secondRecord], 1, 1))
      .mockResolvedValueOnce(createPage([], 2, 25))

    dispose = render(function () {
      return TrafficWorkspace({ client, onCreateRule: function () {} })
    }, target)

    return settle()
      .then(function () {
        const input = target.querySelector<HTMLElement>('zw-input')
        if (!input) {
          throw new Error('Expected the traffic search input')
        }
        input.dispatchEvent(
          new CustomEvent('value-change', {
            detail: { value: 'orders', nativeEvent: new Event('input') },
          }),
        )
        submitSearch(target)
        return settle()
      })
      .then(function () {
        expect(requestApi.fetchRequestHistory).toHaveBeenLastCalledWith({
          page: 1,
          pageSize: 20,
          search: 'orders',
        })
        getButton(target, 'Refresh traffic').click()
        return settle()
      })
      .then(function () {
        expect(requestApi.fetchRequestHistory).toHaveBeenLastCalledWith({
          page: 1,
          pageSize: 20,
          search: 'orders',
        })

        requestApi.fetchRequestHistory.mockResolvedValueOnce(
          createPage([firstRecord], 1, 25),
        )
        const input = target.querySelector<HTMLElement>('zw-input')
        if (!input) {
          throw new Error('Expected the traffic search input')
        }
        input.dispatchEvent(
          new CustomEvent('value-change', {
            detail: { value: '', nativeEvent: new Event('input') },
          }),
        )
        submitSearch(target)
        return settle()
      })
      .then(function () {
        getButton(target, 'Next page').click()
        return settle()
      })
      .then(function () {
        expect(requestApi.fetchRequestHistory).toHaveBeenLastCalledWith({
          page: 2,
          pageSize: 20,
        })
      })
  })

  it('applies request-recorded and request-cleared broadcasts in real time', function () {
    const client = new FakeTrafficClient()
    requestApi.fetchRequestHistory.mockResolvedValue(createPage([firstRecord]))

    dispose = render(function () {
      return TrafficWorkspace({ client, onCreateRule: function () {} })
    }, target)

    return settle().then(function () {
      expect(client.listenerCount(WSMessageType.REQUEST_RECORDED)).toBe(1)
      expect(client.listenerCount(WSMessageType.REQUEST_CLEARED)).toBe(1)

      client.emit(WSMessageType.REQUEST_RECORDED, secondRecord)
      expect(target.textContent).toContain('/api/orders/42')
      expect(target.textContent).toContain('2 requests')

      client.emit(WSMessageType.REQUEST_CLEARED, { success: true })
      expect(target.textContent).toContain('No requests captured')
      expect(target.textContent).toContain('Select a request to inspect it')

      dispose()
      expect(client.listenerCount(WSMessageType.REQUEST_RECORDED)).toBe(0)
      expect(client.listenerCount(WSMessageType.REQUEST_CLEARED)).toBe(0)
      dispose = function () {}
    })
  })

  it('clears history and exposes a recoverable loading error', function () {
    const client = new FakeTrafficClient()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    requestApi.fetchRequestHistory.mockRejectedValueOnce(
      new Error('History unavailable'),
    )

    dispose = render(function () {
      return TrafficWorkspace({ client, onCreateRule: function () {} })
    }, target)

    return settle()
      .then(function () {
        expect(target.textContent).toContain('History unavailable')
        requestApi.fetchRequestHistory.mockResolvedValueOnce(
          createPage([firstRecord]),
        )
        getButton(target, 'Retry loading traffic').click()
        return settle()
      })
      .then(function () {
        expect(target.textContent).toContain('/api/users?limit=10')
        getButton(target, 'Clear traffic').click()
        return settle()
      })
      .then(function () {
        expect(confirm).toHaveBeenCalledOnce()
        expect(requestApi.clearRequestHistory).toHaveBeenCalledWith(null)
        expect(target.textContent).toContain('No requests captured')
      })
  })
})
