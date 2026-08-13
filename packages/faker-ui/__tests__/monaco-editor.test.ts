import { render } from '@zeus-js/zeus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MonacoEditor from '../src/components/monaco-editor'

const monacoLoader = vi.hoisted(function () {
  return { init: vi.fn<() => Promise<unknown>>() }
})

vi.mock('@monaco-editor/loader', function () {
  return { default: monacoLoader }
})

function settle(): Promise<void> {
  return Promise.resolve().then(function () {
    return Promise.resolve()
  })
}

describe('MonacoEditor', function () {
  let target: HTMLDivElement
  let dispose: () => void

  beforeEach(function () {
    target = document.createElement('div')
    document.body.appendChild(target)
    dispose = function () {}
    vi.clearAllMocks()
  })

  afterEach(function () {
    dispose()
    document.body.innerHTML = ''
  })

  it('shows a recoverable error and retries a rejected loader', function () {
    monacoLoader.init
      .mockRejectedValueOnce(new Error('Editor assets unavailable'))
      .mockImplementationOnce(function () {
        return new Promise(function () {})
      })

    dispose = render(function () {
      return MonacoEditor({ value: '{}', ariaLabel: 'Response editor' })
    }, target)

    expect(target.textContent).toContain('Loading code editor')
    return settle().then(function () {
      expect(target.querySelector('[role="alert"]')?.textContent).toContain(
        'Editor assets unavailable',
      )
      const retry = Array.from(
        target.querySelectorAll<HTMLElement>('zw-button'),
      ).find(function (button) {
        return button.textContent && button.textContent.indexOf('Retry') >= 0
      })
      if (!retry) {
        throw new Error('Expected retry editor button')
      }
      retry.click()
      expect(monacoLoader.init).toHaveBeenCalledTimes(2)
      expect(target.textContent).toContain('Loading code editor')
    })
  })
})
