import type { FakerHotContext } from '@baicie/faker-shared'
import { initLogger } from '@baicie/logger'
import type { LoggerConfig } from '@baicie/logger'
import type { UIOptionsInput } from './hooks/use-app-context'
import { mountFakerStudio } from './app/mount'

declare const __MOUNT_TARGET__: string
declare const __FAKER_WS_PORT__: string
declare const __FAKER_LOGGER_OPTIONS__: LoggerConfig
declare const __FAKER_UI_OPTIONS__: UIOptionsInput
declare const __FAKER_HOT_CONTEXT__: FakerHotContext | undefined

const wsPort = Number(__FAKER_WS_PORT__)
const loggerOptions: LoggerConfig = __FAKER_LOGGER_OPTIONS__ || {}
const uiOptions: UIOptionsInput = __FAKER_UI_OPTIONS__ || {}
const mountTarget: string = __MOUNT_TARGET__
const hotContext: FakerHotContext | undefined = __FAKER_HOT_CONTEXT__

function resolveTarget(target: string): Element {
  const element = document.querySelector(target)
  if (!element) {
    throw new Error('Faker Studio mount target not found: ' + target)
  }
  return element
}

export function fakerUI(target: string, wsUrl?: string): Promise<void> {
  return Promise.resolve().then(function () {
    initLogger(Object.assign({}, loggerOptions, { prefix: '[FakerUI]' }))
    mountFakerStudio(
      resolveTarget(target),
      Object.assign({}, uiOptions, { wsUrl: wsUrl || '' }),
      undefined,
      hotContext,
    )
  })
}

function resolveRuntimeWsUrl(): string {
  if (wsPort) {
    return `ws://${window.location.hostname}:${wsPort}/`
  }
  if (hotContext) {
    return ''
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/__faker_ws__`
}

if (typeof window !== 'undefined') {
  const start = function (): void {
    fakerUI(mountTarget, resolveRuntimeWsUrl()).catch(function (error) {
      console.error('Failed to mount Faker Studio', error)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
}

export default fakerUI
