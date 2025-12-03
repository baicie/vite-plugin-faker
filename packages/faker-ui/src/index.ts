import { createApp } from 'vue'
import App from './App'

declare const __MOUNT_TARGET__: string

const mountTarget = __MOUNT_TARGET__

export async function fakerUI(target: string): Promise<void> {
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
