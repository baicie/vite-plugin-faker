import { createRequire } from 'node:module'

export const CLIENT_UI_PATH = '/@faker/ui'
export const CLIENT_UI_CSS = '/@faker/css'
export const CLIENT_INTERCEPTOR_PATH = '/@faker/interceptor'

// Helper to resolve package paths
const resolvePackage = (pkg: string) => {
  try {
    const require = createRequire(import.meta.url)
    return require.resolve(pkg)
  } catch (e) {
    // Fallback if require.resolve fails (e.g. in some environments)
    console.warn(`[Faker] Failed to resolve package ${pkg}:`, e)
    return ''
  }
}

export const UI_ENTRY: string = resolvePackage('@baicie/faker-ui/dist/index.js')
export const UI_CSS: string = resolvePackage('@baicie/faker-ui/dist/index.css')
export const INTERCEPTOR_PATH: string = resolvePackage('@baicie/faker-interceptor/dist/interceptor.js')
