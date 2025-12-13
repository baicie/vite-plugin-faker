import { createApp } from 'vue'
import App from './App'
import { initLogger } from '@baicie/logger'
import { extend } from '@baicie/faker-shared'

declare const __MOUNT_TARGET__: string
declare const __FAKER_WS_PORT__: string
declare const __FAKER_LOGGER_OPTIONS__: string

// const wsPort = Number(__FAKER_WS_PORT__)
const loogerOptions: string = __FAKER_LOGGER_OPTIONS__
const mountTarget = __MOUNT_TARGET__

export async function fakerUI(target: string): Promise<void> {
  const options = extend(loogerOptions, { prefix: '[FakerUI]' })
  initLogger(options)
  const app = createApp(App)
  app.mount(target)
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fakerUI(mountTarget)
    })
  } else {
    fakerUI(mountTarget)
  }
}

export default fakerUI
