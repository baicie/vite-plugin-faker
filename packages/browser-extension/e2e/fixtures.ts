import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'fs-extra'
import { type BrowserContext, test as base, chromium } from '@playwright/test'
import type { Manifest } from 'webextension-polyfill'

export { name } from '../package.json'

export const extensionPath = path.join(__dirname, '../extension')
const EXTENSION_PREPARE_TIMEOUT = 10000

function isExtensionReady() {
  return (
    isDevArtifact() &&
    fs.existsSync(
      path.join(extensionPath, 'dist/contentScripts/index.global.js'),
    )
  )
}

function waitForExtension() {
  const deadline = Date.now() + EXTENSION_PREPARE_TIMEOUT

  function checkReady(): Promise<void> {
    if (isExtensionReady()) return Promise.resolve()
    if (Date.now() >= deadline) {
      return Promise.reject(
        new Error('Timed out waiting for the development extension artifact'),
      )
    }
    return sleep(100).then(checkReady)
  }

  return checkReady()
}

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  context: async ({ headless }, use) => {
    await waitForExtension()
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless,
      args: [
        ...(headless ? ['--headless=new'] : []),
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    // for manifest v3:
    let [background] = context.serviceWorkers()
    if (!background) background = await context.waitForEvent('serviceworker')

    const extensionId = background.url().split('/')[2]
    await use(extensionId)
  },
})

export const expect = test.expect

function isDevArtifact() {
  try {
    const manifest: Manifest.WebExtensionManifest = fs.readJsonSync(
      path.resolve(extensionPath, 'manifest.json'),
    )
    const contentSecurityPolicy = manifest.content_security_policy
    return Boolean(
      typeof contentSecurityPolicy === 'object' &&
      typeof contentSecurityPolicy.extension_pages === 'string' &&
      contentSecurityPolicy.extension_pages.includes('localhost'),
    )
  } catch {
    return false
  }
}
