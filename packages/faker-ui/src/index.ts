import { createApp } from 'vue'
import App from './App'
import './index.css'
import { type LoggerConfig, initLogger } from '@baicie/logger'
import { extend } from '@baicie/faker-shared'
import { type UIOPtions, appContextKey } from './hooks/use-app-context'

declare const __MOUNT_TARGET__: string
declare const __FAKER_WS_PORT__: string
declare const __FAKER_LOGGER_OPTIONS__: LoggerConfig
declare const __FAKER_UI_OPTIONS__: UIOPtions

const wsPort = Number(__FAKER_WS_PORT__)
const loogerOptions: LoggerConfig = __FAKER_LOGGER_OPTIONS__ || {}
const uiOptions: UIOPtions = __FAKER_UI_OPTIONS__ || {}
const mountTarget: string = __MOUNT_TARGET__

export async function fakerUI(target: string, wsUrl?: string): Promise<void> {
  const options = extend(loogerOptions, { prefix: '[FakerUI]' })
  initLogger(options)
  const app = createApp(App)
  app.provide(appContextKey, extend(uiOptions, { wsUrl }))
  app.mount(target)
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
