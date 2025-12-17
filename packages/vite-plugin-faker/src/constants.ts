import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type AliasOptions, normalizePath } from 'vite'

export const CLIENT_UI_PATH = '/@faker/ui'
export const CLIENT_UI_CSS = '/@faker/css'
export const CLIENT_INTERCEPTOR_PATH = '/@faker/interceptor'
export const CLIENT_MOCK_SERVICE_WORKER_PATH = '/@faker/worker'

export const VITE_PLUGIN_PACKAGE_DIR: string = path.resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
)

export const UI_ENTRY: string = path.resolve(
  VITE_PLUGIN_PACKAGE_DIR,
  './node_modules/@baicie/faker-ui/dist/index.js',
)
export const UI_CSS: string = path.resolve(
  VITE_PLUGIN_PACKAGE_DIR,
  './node_modules/@baicie/faker-ui/dist/index.css',
)
export const INTERCEPTOR_PATH: string = path.resolve(
  VITE_PLUGIN_PACKAGE_DIR,
  './node_modules/@baicie/faker-interceptor/dist/interceptor.js',
)

export const MOCK_SERVICE_WORKER_PATH: string = path.resolve(
  VITE_PLUGIN_PACKAGE_DIR,
  './node_modules/@baicie/faker-worker/index.js',
)

export const FS_PREFIX = `/@fs/`

export const CLIENT_ALIAS: AliasOptions = [
  {
    find: /^\/?@faker\/ui/,
    replacement: path.posix.join(FS_PREFIX, normalizePath(UI_ENTRY)),
  },
  {
    find: /^\/?@faker\/css/,
    replacement: path.posix.join(FS_PREFIX, normalizePath(UI_CSS)),
  },
  {
    find: /^\/?@faker\/interceptor/,
    replacement: path.posix.join(FS_PREFIX, normalizePath(INTERCEPTOR_PATH)),
  },
  {
    find: /^\/?@faker\/worker/,
    replacement: path.posix.join(
      FS_PREFIX,
      normalizePath(MOCK_SERVICE_WORKER_PATH),
    ),
  },
]
