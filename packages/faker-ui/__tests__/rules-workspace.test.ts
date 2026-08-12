import type {
  DashboardQuery,
  MockConfig,
  Page,
  WSClient,
} from '@baicie/faker-shared'
import type { WSMessageType } from '@baicie/faker-shared'
import { render } from '@zeus-js/zeus'
import '@zeus-web/dialog/wc/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RulesWorkspace from '../src/app/rules-workspace'

const mockApi = vi.hoisted(function () {
  return {
    createMock: vi.fn<(rule: MockConfig) => Promise<MockConfig>>(),
    deleteMock: vi.fn(),
    fetchGroups: vi.fn<() => Promise<string[]>>(),
    fetchMockList:
      vi.fn<(query: DashboardQuery) => Promise<Page<MockConfig>>>(),
    importMocks: vi.fn(),
    updateMock: vi.fn(),
  }
})

vi.mock('../src/api', function () {
  return mockApi
})

class FakeRulesClient {
  private handlers = new Map<WSMessageType, Set<(data: unknown) => void>>()

  on(type: WSMessageType, handler: (data: unknown) => void): void {
    let handlers = this.handlers.get(type)
    if (!handlers) {
      handlers = new Set<(data: unknown) => void>()
      this.handlers.set(type, handlers)
    }
    handlers.add(handler)
  }

  off(type: WSMessageType, handler: (data: unknown) => void): void {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }
}

function createPage(): Page<MockConfig> {
  return {
    items: [],
    pagination: { page: 1, pageSize: 12, total: 0, totalPages: 1 },
  }
}

function settle(): Promise<void> {
  let chain = Promise.resolve()
  let index: number
  for (index = 0; index < 6; index += 1) {
    chain = chain.then(function () {
      return Promise.resolve()
    })
  }
  return chain
}

function findButton(target: Element, text: string): HTMLElement {
  const button = Array.from(
    target.querySelectorAll<HTMLElement>('zw-button'),
  ).find(function (element) {
    return (
      element.textContent !== null && element.textContent.indexOf(text) >= 0
    )
  })
  if (!button) {
    throw new Error('Could not find button: ' + text)
  }
  return button
}

const validSource = JSON.stringify({
  openapi: '3.0.0',
  paths: {
    '/health': {
      get: {
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
  },
})

const trafficDraft: MockConfig = {
  id: 'traffic-draft',
  url: '/api/orders/42',
  method: 'GET',
  enabled: true,
  type: 'static',
  response: {
    status: 200,
    headers: {},
    body: { ok: true },
  },
}

describe('RulesWorkspace OpenAPI import', function () {
  let target: HTMLDivElement
  let dispose: () => void

  beforeEach(function () {
    target = document.createElement('div')
    document.body.appendChild(target)
    dispose = function () {}
    vi.clearAllMocks()
    mockApi.fetchMockList.mockResolvedValue(createPage())
    mockApi.fetchGroups.mockResolvedValue([])
    mockApi.createMock.mockImplementation(function (rule) {
      return Promise.resolve(rule)
    })
    mockApi.importMocks.mockResolvedValue({ success: true, count: 1 })
  })

  afterEach(function () {
    dispose()
    document.body.innerHTML = ''
  })

  function mount(): void {
    dispose = render(function () {
      return RulesWorkspace({
        client: new FakeRulesClient() as unknown as WSClient,
        theme: function () {
          return 'light'
        },
      })
    }, target)
  }

  it('opens the import surface from the Rules toolbar', function () {
    mount()
    findButton(target, 'Import OpenAPI').click()
    const dialog = target.querySelector('zw-dialog')
    const closeControl = target.querySelector<HTMLElement>(
      '[aria-label="Close OpenAPI import"]',
    )
    expect(dialog).not.toBeNull()
    expect(closeControl).not.toBeNull()
    expect(
      target.querySelector('textarea[aria-label="OpenAPI JSON specification"]'),
    ).not.toBeNull()
    return new Promise<void>(function (resolve) {
      window.setTimeout(resolve, 0)
    }).then(function () {
      expect(
        document.activeElement === closeControl ||
          (document.activeElement &&
            closeControl!.contains(document.activeElement)),
      ).toBe(true)
    })
  })

  it('shows a clear parse error without calling createMock', function () {
    mount()
    findButton(target, 'Import OpenAPI').click()
    const textarea = target.querySelector<HTMLTextAreaElement>('textarea')
    if (!textarea) throw new Error('Expected import textarea')
    textarea.value = '{'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    findButton(target, 'Parse OpenAPI').click()

    expect(target.querySelector('[role="alert"]')?.textContent).toContain(
      'valid JSON',
    )
    expect(mockApi.createMock).not.toHaveBeenCalled()
    expect(mockApi.importMocks).not.toHaveBeenCalled()
  })

  it('previews and imports generated rules as one batch before refreshing', function () {
    mount()
    findButton(target, 'Import OpenAPI').click()
    const textarea = target.querySelector<HTMLTextAreaElement>('textarea')
    if (!textarea) throw new Error('Expected import textarea')
    textarea.value = validSource
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    findButton(target, 'Parse OpenAPI').click()
    expect(target.textContent).toContain('1 rules ready to import')

    findButton(target, 'Import rules').click()
    return settle().then(function () {
      expect(mockApi.importMocks).toHaveBeenCalledTimes(1)
      expect(mockApi.importMocks.mock.calls[0][0]).toEqual([
        expect.objectContaining({ url: '/health', method: 'GET' }),
      ])
      expect(mockApi.fetchMockList).toHaveBeenCalledTimes(2)
      expect(mockApi.fetchGroups).toHaveBeenCalledTimes(2)
      expect(target.querySelector('zw-dialog')).toBeNull()
    })
  })

  it('keeps the import open when the batch request fails', function () {
    mockApi.importMocks.mockRejectedValueOnce(new Error('Import unavailable'))
    mount()
    findButton(target, 'Import OpenAPI').click()
    const textarea = target.querySelector<HTMLTextAreaElement>('textarea')
    if (!textarea) throw new Error('Expected import textarea')
    textarea.value = validSource
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    findButton(target, 'Parse OpenAPI').click()
    findButton(target, 'Import rules').click()

    return settle().then(function () {
      expect(target.querySelector('[role="alert"]')?.textContent).toContain(
        'Import unavailable',
      )
      expect(target.querySelector('zw-dialog')).not.toBeNull()
      expect(mockApi.fetchMockList).toHaveBeenCalledOnce()
    })
  })

  it('reports that a traffic draft was saved from the traffic workflow', function () {
    const onRuleSaved = vi.fn()
    dispose = render(function () {
      return RulesWorkspace({
        client: new FakeRulesClient() as unknown as WSClient,
        theme: function () {
          return 'light'
        },
        draft: function () {
          return trafficDraft
        },
        onDraftConsumed: function () {},
        onRuleSaved,
      })
    }, target)

    return settle()
      .then(function () {
        const form = target.querySelector<HTMLFormElement>('.rule-editor-form')
        if (!form) {
          throw new Error('Expected rule editor form')
        }
        form.dispatchEvent(
          new SubmitEvent('submit', { bubbles: true, cancelable: true }),
        )
        return settle()
      })
      .then(function () {
        expect(mockApi.createMock).toHaveBeenCalledOnce()
        expect(onRuleSaved).toHaveBeenCalledWith(
          expect.objectContaining({
            url: trafficDraft.url,
            method: trafficDraft.method,
            type: trafficDraft.type,
          }),
          true,
        )
      })
  })
})
