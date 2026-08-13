import type { WSConnectionStatus, WSStatusHandler } from '@baicie/faker-shared'
import { render } from '@zeus-js/zeus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsWorkspace from '../src/app/settings-workspace'
import type { SettingsStatusClient } from '../src/app/settings-workspace'

const settingsApi = vi.hoisted(function () {
  return {
    clearCache: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  }
})

const mockApi = vi.hoisted(function () {
  return {
    exportMocks: vi.fn(),
    importMocks: vi.fn(),
  }
})

vi.mock('../src/api/setting', function () {
  return settingsApi
})

vi.mock('../src/api/mock', function () {
  return mockApi
})

class FakeStatusClient implements SettingsStatusClient {
  private handlers = new Set<WSStatusHandler>()
  private status: WSConnectionStatus = 'connected'

  getStatus(): WSConnectionStatus {
    return this.status
  }

  onStatus(handler: WSStatusHandler): void {
    this.handlers.add(handler)
    handler(this.status)
  }

  offStatus(handler: WSStatusHandler): void {
    this.handlers.delete(handler)
  }

  listenerCount(): number {
    return this.handlers.size
  }
}

function settle(): Promise<void> {
  return Promise.resolve().then(function () {
    return Promise.resolve()
  })
}

function findButton(target: Element, text: string): HTMLElement {
  const button = Array.from(
    target.querySelectorAll<HTMLElement>('zw-button'),
  ).find(function (element) {
    return element.textContent && element.textContent.indexOf(text) >= 0
  })
  if (!button) {
    throw new Error('Could not find button: ' + text)
  }
  return button
}

function emitValue(target: Element, value: string): void {
  target.dispatchEvent(
    new CustomEvent('value-change', {
      detail: { value, nativeEvent: new Event('input') },
    }),
  )
}

function emitChecked(target: Element, checked: boolean): void {
  target.dispatchEvent(
    new CustomEvent('checked-change', {
      detail: { checked, nativeEvent: new Event('change') },
    }),
  )
}

describe('SettingsWorkspace', function () {
  let target: HTMLDivElement
  let dispose: () => void

  beforeEach(function () {
    target = document.createElement('div')
    document.body.appendChild(target)
    dispose = function () {}
    vi.clearAllMocks()
    settingsApi.getSettings.mockResolvedValue({
      version: 1,
      theme: 'light',
      globalDelay: 80,
      enableAllMocks: true,
      logRequests: true,
      corsEnabled: false,
      corsAllowOrigin: '*',
    })
    settingsApi.updateSettings.mockResolvedValue({ success: true })
    settingsApi.clearCache.mockResolvedValue({ success: true })
    mockApi.exportMocks.mockResolvedValue([])
    mockApi.importMocks.mockResolvedValue({ success: true, count: 0 })
  })

  afterEach(function () {
    dispose()
    document.body.innerHTML = ''
  })

  it('applies Zeus Web value and checked events before saving', function () {
    const client = new FakeStatusClient()
    let theme: 'light' | 'dark' = 'light'
    const onThemeChange = vi.fn(function (nextTheme: 'light' | 'dark') {
      theme = nextTheme
    })

    dispose = render(function () {
      return SettingsWorkspace({
        client,
        theme: function () {
          return theme
        },
        onThemeChange,
      })
    }, target)

    return settle()
      .then(function () {
        const delay = target.querySelector(
          'zw-input[aria-label="Global delay in milliseconds"]',
        )
        const corsOrigin = target.querySelector(
          'zw-input[aria-label="CORS allowed origin"]',
        )
        const themeSwitch = target.querySelector(
          'zw-switch[aria-label="Use dark theme"]',
        )
        const captureSwitch = target.querySelector(
          'zw-switch[aria-label="Capture request history"]',
        )
        const corsSwitch = target.querySelector(
          'zw-switch[aria-label="Enable CORS"]',
        )

        expect(delay).not.toBeNull()
        expect(corsOrigin).not.toBeNull()
        expect(themeSwitch).not.toBeNull()
        expect(captureSwitch).not.toBeNull()
        expect(corsSwitch).not.toBeNull()

        emitValue(delay!, '275')
        emitValue(corsOrigin!, 'https://app.example.com')
        emitChecked(themeSwitch!, true)
        emitChecked(captureSwitch!, false)
        emitChecked(corsSwitch!, true)
        findButton(target, 'Save changes').click()
        return settle()
      })
      .then(function () {
        expect(onThemeChange).toHaveBeenLastCalledWith('dark')
        expect(settingsApi.updateSettings).toHaveBeenCalledWith({
          globalDelay: 275,
          enableAllMocks: true,
          logRequests: false,
          corsEnabled: true,
          corsAllowOrigin: 'https://app.example.com',
          theme: 'dark',
        })
        expect(target.textContent).toContain('Settings saved.')
        expect(client.listenerCount()).toBe(1)

        dispose()
        dispose = function () {}
        expect(client.listenerCount()).toBe(0)
      })
  })

  it('keeps the form locked when the initial settings load fails', function () {
    settingsApi.getSettings.mockRejectedValueOnce(
      new Error('Settings unavailable'),
    )
    const client = new FakeStatusClient()

    dispose = render(function () {
      return SettingsWorkspace({
        client,
        theme: function () {
          return 'light'
        },
        onThemeChange: function () {},
      })
    }, target)

    return settle().then(function () {
      expect(target.querySelector('[role="alert"]')?.textContent).toContain(
        'Settings unavailable',
      )
      findButton(target, 'Save changes').click()
      expect(settingsApi.updateSettings).not.toHaveBeenCalled()
    })
  })
})
