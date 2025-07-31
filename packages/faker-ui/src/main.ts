import { createApp } from 'vue'
import App from './App'

export function fakerUI(target: string): void {
  const app = createApp(App)
  app.mount(target)
}
export default fakerUI
