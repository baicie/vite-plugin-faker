import { createApp } from 'vue'
import App from './App'
import { startMocking } from './mocks'

export async function fakerUI(target: string): Promise<void> {
  await startMocking()
  const app = createApp(App)
  app.mount(target)
}

export default fakerUI
