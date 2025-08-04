import { createApp } from 'vue'
import App from './App'

export async function fakerUI(target: string): Promise<void> {
  const app = createApp(App)
  app.mount(target)
}

export default fakerUI
