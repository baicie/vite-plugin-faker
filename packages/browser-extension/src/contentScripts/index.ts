/* eslint-disable no-console */
import { onMessage } from 'webext-bridge/content-script'
import { createApp } from 'vue'
import App from './views/App.vue'
import { setupApp } from '~/logic/common-setup'

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  console.info('[FakerExt] Content script loaded')

  // Inject configuration
  const configScript = document.createElement('script')
  configScript.textContent = `
    window.__FAKER_WS_PORT__ = "3002";
  `
  ;(document.head || document.documentElement).appendChild(configScript)
  configScript.remove()

  // Inject interceptor
  const script = document.createElement('script')
  script.src = browser.runtime.getURL('dist/interceptor.js')
  script.onload = () => {
    script.remove()
  }
  ;(document.head || document.documentElement).appendChild(script)

  // communication example: send previous tab title from background page
  onMessage('tab-prev', ({ data }) => {
    console.log(`[vitesse-webext] Navigate from page "${data.title}"`)
  })

  // mount component to context window
  const container = document.createElement('div')
  container.id = __NAME__
  const root = document.createElement('div')
  const styleEl = document.createElement('link')
  const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? 'open' : 'closed' }) || container
  styleEl.setAttribute('rel', 'stylesheet')
  styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/style.css'))
  shadowDOM.appendChild(styleEl)
  shadowDOM.appendChild(root)
  document.body.appendChild(container)
  const app = createApp(App)
  setupApp(app)
  app.mount(root)
})()
