import { mount } from 'svelte'
import App from './App.svelte'
import { type LoggerConfig, initLogger } from '@baicie/logger'
import { extend } from '@baicie/faker-shared'
import type { UIOptions } from './hooks/use-app-context.js'
import './index.css'

declare const __MOUNT_TARGET__: string
declare const __FAKER_WS_PORT__: string
declare const __FAKER_LOGGER_OPTIONS__: LoggerConfig
declare const __FAKER_UI_OPTIONS__: UIOptions

const wsPort = Number(__FAKER_WS_PORT__)
const loogerOptions: LoggerConfig = __FAKER_LOGGER_OPTIONS__ || {}
const uiOptions: UIOptions = __FAKER_UI_OPTIONS__ || {}
const mountTarget: string = __MOUNT_TARGET__

export async function fakerUI(
  target: string | Element,
  wsUrl?: string,
): Promise<void> {
  const options = extend(loogerOptions, { prefix: '[FakerUI]' })
  initLogger(options)

  let targetElement: Element | null = null
  if (typeof target === 'string') {
    targetElement = document.querySelector(target)
    if (!targetElement && target.startsWith('#')) {
      targetElement = document.getElementById(target.slice(1))
    }
    if (!targetElement && target === 'body') {
      targetElement = document.body
    }
  } else {
    targetElement = target
  }

  if (!targetElement) {
    console.error(`[FakerUI] Target element "${target}" not found.`)
    return
  }

  mount(App, {
    target: targetElement,
    props: {
      uiOptions: extend(uiOptions, { wsUrl }),
    },
  })
}

if (typeof window !== 'undefined') {
  const wsUrl = wsPort ? `ws://${window.location.hostname}:${wsPort}/` : ''
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fakerUI(mountTarget, wsUrl)
    })
  } else {
    fakerUI(mountTarget, wsUrl)
  }
}

export default fakerUI
