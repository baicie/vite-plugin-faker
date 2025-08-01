import { createApp } from 'vue'
import App from './App'
import { initInterceptor } from './interceptor'

export function fakerUI(target: string): void {
  const app = createApp(App)
  app.mount(target)

  // 初始化请求拦截器
  initInterceptor()
}

export default fakerUI
