import { createApp, vaporInteropPlugin } from 'vue'
import App from './App'

export function fakerUI(target: string): void {
  const app = createApp(App)
  app.use(vaporInteropPlugin)
  app.mount(target)
}
export default fakerUI
