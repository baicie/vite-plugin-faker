import type { MockKey } from '@baicie/faker-shared'

export interface ParmasLike {
  url?: string
  method?: string
}

export function normalizeRequestUrl(url?: string): string | undefined {
  if (url === undefined) return undefined

  let normalized = url
  const schemeIndex = normalized.indexOf('://')
  if (schemeIndex >= 0) {
    const pathIndex = normalized.indexOf('/', schemeIndex + 3)
    normalized = pathIndex >= 0 ? normalized.slice(pathIndex) : '/'
  }

  const queryIndex = normalized.indexOf('?')
  const hashIndex = normalized.indexOf('#')
  let endIndex = normalized.length
  if (queryIndex >= 0 && queryIndex < endIndex) endIndex = queryIndex
  if (hashIndex >= 0 && hashIndex < endIndex) endIndex = hashIndex

  return normalized.slice(0, endIndex) || '/'
}

/**
 * create key for url-method
 * @param params
 * @returns
 */
export function methodLineUrl<T extends ParmasLike>(params: T): MockKey {
  return `${normalizeRequestUrl(params.url)}-${params.method}`
}
