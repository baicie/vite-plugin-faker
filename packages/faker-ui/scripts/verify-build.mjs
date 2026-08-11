import { readFileSync } from 'node:fs'

const distUrl = new URL('../dist/', import.meta.url)
const javascript = readFileSync(new URL('index.js', distUrl), 'utf8')
const stylesheet = readFileSync(new URL('index.css', distUrl), 'utf8')
const declarations = readFileSync(new URL('index.d.ts', distUrl), 'utf8')

if (/process\.env\./.test(javascript)) {
  throw new Error(
    'The browser bundle contains an unresolved process.env reference',
  )
}

const placeholders = [
  '__MOUNT_TARGET__',
  '__FAKER_WS_PORT__',
  '__FAKER_LOGGER_OPTIONS__',
  '__FAKER_UI_OPTIONS__',
  '__FAKER_HOT_CONTEXT__',
]

for (const placeholder of placeholders) {
  const occurrences = javascript.split(placeholder).length - 1
  if (occurrences !== 1) {
    throw new Error(`Expected one runtime placeholder: ${placeholder}`)
  }
}

if (stylesheet.length === 0) {
  throw new Error('The generated stylesheet is empty')
}

if (!declarations.includes('fakerUI')) {
  throw new Error('The generated declaration file does not expose fakerUI')
}
