import { createRequire } from 'node:module'
import path from 'node:path'
import { type AliasOptions, normalizePath } from 'vite'

export const CLIENT_UI_PATH = '/@faker/ui'
export const CLIENT_UI_CSS = '/@faker/css'
export const CLIENT_INTERCEPTOR_PATH = '/@faker/interceptor'

const require = createRequire(import.meta.url)

export const UI_ENTRY: string =
  require.resolve('@baicie/faker-ui/dist/index.js')
export const UI_CSS: string = require.resolve('@baicie/faker-ui/dist/index.css')
export const INTERCEPTOR_PATH: string =
  require.resolve('@baicie/faker-interceptor/dist/interceptor.js')

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
    replacement: path.posix.join(FS_PREFIX, normalizePath(INTERCEPTOR_PATH)),
  },
]
