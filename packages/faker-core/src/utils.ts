import type { MockKey } from '@baicie/faker-shared'

export interface ParmasLike {
  url?: string
  method?: string
}
/**
 * create key for url-method
 * @param params
 * @returns
 */
export function methodLineUrl<T extends ParmasLike>(params: T): MockKey {
  return `${params.url}-${params.method}`
}
