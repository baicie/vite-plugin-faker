import { render, state } from '@zeus-js/zeus'
import { afterEach, describe, expect, it } from 'vitest'
import { mountFakerStudio } from '../src/app/mount'
import { dynamic } from '../src/lib/zeus'

describe('Zeus Faker Studio mount', function () {
  afterEach(function () {
    document.body.innerHTML = ''
  })

  it('registers Zeus UI elements and replaces a previous mount cleanly', function () {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const firstDispose = mountFakerStudio(target, {
      mode: 'route',
      timeout: 1000,
      wsUrl: '',
    })

    expect(customElements.get('zw-button')).toBeDefined()
    expect(customElements.get('zw-dialog')).toBeDefined()
    expect(customElements.get('zw-tabs')).toBeDefined()
    expect(target.querySelector('[data-faker-studio]')).not.toBeNull()
    expect(target.textContent).toContain('Faker Studio')
    expect(target.textContent).toContain('Traffic')

    const trafficView = target.querySelector<HTMLElement>(
      '[data-workspace-view="traffic"]',
    )
    const rulesView = target.querySelector<HTMLElement>(
      '[data-workspace-view="rules"]',
    )
    expect(trafficView && trafficView.hasAttribute('hidden')).toBe(false)
    expect(rulesView && rulesView.hasAttribute('hidden')).toBe(true)

    const rulesButton = Array.from(
      target.querySelectorAll<HTMLElement>('.studio-navigation-item'),
    ).find(function (button) {
      return button.textContent === 'Rules'
    })
    expect(rulesButton).toBeDefined()
    rulesButton!.click()
    expect(trafficView && trafficView.hasAttribute('hidden')).toBe(true)
    expect(rulesView && rulesView.hasAttribute('hidden')).toBe(false)

    mountFakerStudio(target, {
      mode: 'route',
      timeout: 1000,
      wsUrl: '',
    })

    expect(target.querySelectorAll('[data-faker-studio]')).toHaveLength(1)
    firstDispose()
  })

  it('traps button mode focus and returns it after Escape', function () {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const dispose = mountFakerStudio(target, {
      mode: 'button',
      timeout: 0,
      wsUrl: '',
    })
    const studio = target.querySelector<HTMLElement>('[data-faker-studio]')
    const launcher = target.querySelector<HTMLElement>('[data-studio-launcher]')
    const panel = target.querySelector<HTMLElement>('.faker-studio')

    expect(studio).not.toBeNull()
    expect(studio!.dataset.panelOpen).toBe('false')
    expect(launcher).not.toBeNull()
    expect(panel?.getAttribute('role')).toBe('dialog')
    expect(panel?.getAttribute('aria-hidden')).toBe('true')

    launcher!.click()
    expect(studio!.dataset.panelOpen).toBe('true')
    expect(panel?.getAttribute('aria-hidden')).toBe('false')
    expect(panel?.hasAttribute('inert')).toBe(false)
    expect(target.textContent).toContain('Traffic')

    return new Promise<void>(function (resolve) {
      window.setTimeout(resolve, 0)
    })
      .then(function () {
        const closeControl = target.querySelector<HTMLElement>(
          '[data-studio-close]',
        )
        expect(closeControl).not.toBeNull()
        expect(
          document.activeElement === closeControl ||
            (document.activeElement &&
              closeControl!.contains(document.activeElement)),
        ).toBe(true)

        const first = document.createElement('button')
        const last = document.createElement('button')
        const hidden = document.createElement('div')
        hidden.hidden = true
        hidden.appendChild(document.createElement('button'))
        panel!.insertBefore(first, panel!.firstChild)
        panel!.appendChild(last)
        panel!.appendChild(hidden)

        last.focus()
        panel!.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
        )
        expect(document.activeElement).toBe(first)

        first.focus()
        panel!.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Tab',
            shiftKey: true,
            bubbles: true,
          }),
        )
        expect(document.activeElement).toBe(last)

        panel!.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        )
        expect(studio!.dataset.panelOpen).toBe('false')
        return new Promise<void>(function (resolveClose) {
          window.setTimeout(resolveClose, 0)
        })
      })
      .then(function () {
        const active = document.activeElement
        expect(
          active === launcher || (active && launcher!.contains(active)),
        ).toBe(true)
        dispose()
      })
  })

  it('updates dynamic table rows without inserting wrapper elements', function () {
    const target = document.createElement('div')
    const rows = state(['first'])
    document.body.appendChild(target)

    const dispose = render(function () {
      const table = document.createElement('table')
      const body = document.createElement('tbody')
      body.appendChild(
        dynamic(function () {
          return rows.map(function (row) {
            const tr = document.createElement('tr')
            tr.dataset.row = row
            const td = document.createElement('td')
            td.textContent = row
            tr.appendChild(td)
            return tr
          })
        }) as unknown as Node,
      )
      table.appendChild(body)
      return table as unknown as JSX.Element
    }, target)

    expect(target.querySelectorAll('tbody > tr')).toHaveLength(1)
    expect(target.querySelector('[data-zeus-dynamic]')).toBeNull()

    rows.push('second')
    expect(target.querySelectorAll('tbody > tr')).toHaveLength(2)
    dispose()
  })
})
